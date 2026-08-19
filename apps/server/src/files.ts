import { access, mkdir, writeFile } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import path from "node:path";

import { env } from "@the-right-party/env/server";

const RECEIPT_MAX_BYTES = 5 * 1024 * 1024;

const MAGIC = {
  jpeg: [0xff, 0xd8, 0xff],
  png: [0x89, 0x50, 0x4e, 0x47],
} as const;

export type ImageKind = "jpeg" | "png" | "webp";

function startsWith(bytes: Uint8Array, magic: readonly number[]) {
  return magic.every((value, index) => bytes[index] === value);
}

export function sniffImage(bytes: Uint8Array): ImageKind | null {
  if (startsWith(bytes, MAGIC.jpeg)) {
    return "jpeg";
  }
  if (startsWith(bytes, MAGIC.png)) {
    return "png";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "webp";
  }
  return null;
}

export function extensionFor(kind: ImageKind) {
  if (kind === "jpeg") {
    return "jpg";
  }
  if (kind === "png") {
    return "png";
  }
  return "webp";
}

export function contentTypeFor(kind: ImageKind) {
  if (kind === "jpeg") {
    return "image/jpeg";
  }
  if (kind === "png") {
    return "image/png";
  }
  return "image/webp";
}

export function contentTypeFromPath(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") {
    return "image/jpeg";
  }
  if (ext === ".webp") {
    return "image/webp";
  }
  if (ext === ".svg") {
    return "image/svg+xml";
  }
  return "image/png";
}

export function contentTypeFromBytes(filePath: string, bytes: Uint8Array) {
  const kind = sniffImage(bytes);
  if (kind) {
    return contentTypeFor(kind);
  }
  return contentTypeFromPath(filePath);
}

/**
 * Resolve a stored payment-QR path whether cwd is the repo root or `apps/server`,
 * and whether the path is absolute (admin upload) or repo-relative.
 */
export function paymentQrCandidates(storedPath: string): string[] {
  if (path.isAbsolute(storedPath)) {
    return [storedPath];
  }

  const here = import.meta.dir;
  const serverRoot = path.resolve(here, "..");
  const repoRoot = path.resolve(here, "../../..");
  const fromServer = storedPath.replace(/^apps\/server\//, "");
  const seen = new Set<string>();
  const out: string[] = [];

  for (const candidate of [
    path.resolve(storedPath),
    path.resolve(here, storedPath),
    path.resolve(serverRoot, storedPath),
    path.resolve(repoRoot, storedPath),
    path.resolve(serverRoot, fromServer),
    path.resolve(here, fromServer),
  ]) {
    if (!seen.has(candidate)) {
      seen.add(candidate);
      out.push(candidate);
    }
  }
  return out;
}

export async function resolvePaymentQrFile(storedPath: string): Promise<string | null> {
  for (const candidate of paymentQrCandidates(storedPath)) {
    try {
      await access(candidate, fsConstants.R_OK);
      return candidate;
    } catch {
      continue;
    }
  }
  return null;
}

export async function readUploadBytes(file: File) {
  if (file.size > RECEIPT_MAX_BYTES) {
    throw new Error("File is too large (max 5 MB)");
  }
  const buffer = new Uint8Array(await file.arrayBuffer());
  const kind = sniffImage(buffer);
  if (!kind) {
    throw new Error("Only JPEG, PNG, or WebP images are allowed");
  }
  return { buffer, kind };
}

export async function saveReceipt(userId: string, file: File) {
  const { buffer, kind } = await readUploadBytes(file);
  const dir = path.join(env.RECEIPT_STORAGE_DIR, userId);
  await mkdir(dir, { recursive: true });
  const name = `${crypto.randomUUID()}.${extensionFor(kind)}`;
  const abs = path.join(dir, name);
  await writeFile(abs, buffer);
  return { receiptKey: `${userId}/${name}`, contentType: contentTypeFor(kind) };
}

export async function savePaymentQr(kind: "gcash" | "maya", file: File) {
  const { buffer, imageKind } = await (async () => {
    const result = await readUploadBytes(file);
    return { buffer: result.buffer, imageKind: result.kind };
  })();
  const dir = path.resolve("./var/payment");
  await mkdir(dir, { recursive: true });
  const abs = path.join(dir, `${kind}.${extensionFor(imageKind)}`);
  await writeFile(abs, buffer);
  return abs;
}

export function receiptAbsPath(receiptKey: string) {
  if (receiptKey.includes("..") || path.isAbsolute(receiptKey)) {
    throw new Error("Invalid receipt key");
  }
  return path.join(env.RECEIPT_STORAGE_DIR, receiptKey);
}
