import { readFile } from "node:fs/promises";
import path from "node:path";

import { trpcServer } from "@hono/trpc-server";
import { createContext } from "@the-right-party/api/context";
import { appRouter } from "@the-right-party/api/routers/index";
import { auth } from "@the-right-party/auth";
import prisma, { RsvpStatus, ensureEventConfig } from "@the-right-party/db";
import { env, isAdminEmail } from "@the-right-party/env/server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import QRCode from "qrcode";

import { contentTypeFromPath, receiptAbsPath, savePaymentQr, saveReceipt } from "./files";

await ensureEventConfig(prisma);

const app = new Hono();

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
    rsvp?.status === RsvpStatus.PAYMENT_PENDING ||
    rsvp?.status === RsvpStatus.PAYMENT_SUBMITTED;
  if (!allowed) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const config = await prisma.eventConfig.findUnique({ where: { id: 1 } });
  const storedPath = kind === "gcash" ? config?.gcashQrPath : config?.mayaQrPath;

  if (storedPath) {
    try {
      const abs = path.isAbsolute(storedPath) ? storedPath : path.resolve(storedPath);
      const bytes = await readFile(abs);
      return c.body(bytes, 200, {
        "Content-Type": contentTypeFromPath(abs),
        "Cache-Control": "private, max-age=30",
      });
    } catch {
      // fall through to generated placeholder
    }
  }

  const png = await QRCode.toBuffer("THE RIGHT PARTY - GCash QR coming soon", {
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

app.get("/", (c) => {
  return c.text("OK");
});

export default app;
