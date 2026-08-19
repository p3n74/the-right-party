import { readFile } from "node:fs/promises";
import path from "node:path";

import { trpcServer } from "@hono/trpc-server";
import { createContext } from "@the-right-party/api/context";
import { canSeePaymentQr } from "@the-right-party/api/lib/rsvp";
import { appRouter } from "@the-right-party/api/routers/index";
import { auth } from "@the-right-party/auth";
import prisma, { DEFAULT_GCASH_QR_PATH, ensureEventConfig } from "@the-right-party/db";
import { env, isAdminEmail } from "@the-right-party/env/server";
import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import QRCode from "qrcode";

import {
  contentTypeFromBytes,
  contentTypeFromPath,
  receiptAbsPath,
  resolvePaymentQrFile,
  savePaymentQr,
  saveReceipt,
} from "./files";

await ensureEventConfig(prisma);

const app = new Hono();
const frontendOrigin = env.CORS_ORIGIN.replace(/\/$/, "");

app.use(logger());
app.use(
  "/*",
  cors({
    origin: env.CORS_ORIGIN,
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

const serveSpa = env.NODE_ENV === "production";

if (!serveSpa) {
  for (const route of ["/rsvp", "/login", "/admin", "/dashboard", "/poster", "/poster-2", "/going"]) {
    app.get(route, (c) => c.redirect(`${frontendOrigin}${route}`));
  }
}

async function sessionFromRequest(request: Request) {
  return auth.api.getSession({ headers: request.headers });
}

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.post("/api/receipts", async (c) => {
  const session = await sessionFromRequest(c.req.raw);
  if (!session) {
    return c.json({ error: "Authentication required" }, 401);
  }

  const body = await c.req.parseBody();
  const file = body.file;
  if (!(file instanceof File)) {
    return c.json({ error: "Missing file" }, 400);
  }

  try {
    const saved = await saveReceipt(session.user.id, file);
    return c.json(saved);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return c.json({ error: message }, 400);
  }
});

app.get("/api/receipts/:paymentId", async (c) => {
  const session = await sessionFromRequest(c.req.raw);
  if (!session || !isAdminEmail(session.user.email)) {
    return c.json({ error: "Admin only" }, 403);
  }

  const payment = await prisma.payment.findUnique({
    where: { id: c.req.param("paymentId") },
  });
  if (!payment?.receiptKey) {
    return c.json({ error: "No receipt" }, 404);
  }

  try {
    const abs = receiptAbsPath(payment.receiptKey);
    const bytes = await readFile(abs);
    return c.body(bytes, 200, {
      "Content-Type": contentTypeFromPath(abs),
      "Cache-Control": "private, max-age=60",
    });
  } catch {
    return c.json({ error: "Receipt missing on disk" }, 404);
  }
});

app.get("/api/payment-qr/:kind", async (c) => {
  const kind = c.req.param("kind");
  if (kind !== "gcash" && kind !== "maya") {
    return c.json({ error: "Unknown QR" }, 404);
  }

  const session = await sessionFromRequest(c.req.raw);
  if (!session) {
    return c.json({ error: "Authentication required" }, 401);
  }

  const rsvp = await prisma.rsvp.findUnique({
    where: { userId: session.user.id },
  });
  const allowed =
    isAdminEmail(session.user.email) ||
    (rsvp ? canSeePaymentQr(rsvp.status) : false);
  if (!allowed) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const config = await prisma.eventConfig.findUnique({ where: { id: 1 } });
  const storedPath = kind === "gcash" ? config?.gcashQrPath : config?.mayaQrPath;
  const fallbackPath = kind === "gcash" ? DEFAULT_GCASH_QR_PATH : null;

  for (const candidate of [storedPath, fallbackPath]) {
    if (!candidate) {
      continue;
    }
    const abs = await resolvePaymentQrFile(candidate);
    if (!abs) {
      continue;
    }
    try {
      const bytes = await readFile(abs);
      return c.body(bytes, 200, {
        "Content-Type": contentTypeFromBytes(abs, bytes),
        "Cache-Control": "private, max-age=30",
      });
    } catch {
      // try the next candidate
    }
  }

  const png = await QRCode.toBuffer("ACQUAINTANCE AFTERPARTY - payment QR coming soon", {
    type: "png",
    width: 512,
    margin: 1,
    color: { dark: "#1a0b32", light: "#ffffff" },
  });
  return c.body(new Uint8Array(png), 200, {
    "Content-Type": "image/png",
    "Cache-Control": "private, max-age=30",
  });
});

app.post("/api/admin/payment-qr/:kind", async (c) => {
  const session = await sessionFromRequest(c.req.raw);
  if (!session || !isAdminEmail(session.user.email)) {
    return c.json({ error: "Admin only" }, 403);
  }

  const kind = c.req.param("kind");
  if (kind !== "gcash" && kind !== "maya") {
    return c.json({ error: "Unknown QR" }, 404);
  }

  const body = await c.req.parseBody();
  const file = body.file;
  if (!(file instanceof File)) {
    return c.json({ error: "Missing file" }, 400);
  }

  try {
    const abs = await savePaymentQr(kind, file);
    await prisma.eventConfig.update({
      where: { id: 1 },
      data: kind === "gcash" ? { gcashQrPath: abs } : { mayaQrPath: abs },
    });
    return c.json({ ok: true, path: abs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed";
    return c.json({ error: message }, 400);
  }
});

app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext: (_opts, context) => {
      return createContext({ context });
    },
  }),
);

if (serveSpa) {
  const webDist = path.resolve(import.meta.dir, "../../web/dist");
  app.use("/*", serveStatic({ root: webDist }));
  app.get("*", async (c) => {
    const html = await readFile(path.join(webDist, "index.html"), "utf8");
    return c.html(html);
  });
} else {
  app.get("/", (c) => c.text("OK"));
}

export default {
  port: Number(process.env.PORT ?? 3000),
  hostname: process.env.HOSTNAME ?? "0.0.0.0",
  fetch: app.fetch,
};
