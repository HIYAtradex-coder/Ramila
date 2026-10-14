import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT =
  process.env.HIYA_UPLOAD_DIR ??
  path.resolve(process.cwd(), ".data", "uploads");

export function sha256Bytes(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

export function decodeBase64Content(contentBase64: string): Buffer {
  const cleaned = contentBase64.replace(/^data:[^;]+;base64,/, "");
  const buf = Buffer.from(cleaned, "base64");
  if (buf.length === 0) {
    throw new Error("empty_attachment");
  }
  return buf;
}

/**
 * Persist attachment bytes to local filesystem. Not a bank/Plaid connector.
 */
export async function storeLocalUpload(opts: {
  organizationId: string;
  storeId: string;
  fileName: string;
  bytes: Buffer;
}): Promise<{ storageKey: string; contentHash: string; byteSize: number }> {
  const contentHash = sha256Bytes(opts.bytes);
  const safeName = opts.fileName.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
  const storageKey = path.join(
    opts.organizationId,
    opts.storeId,
    `${contentHash.slice(0, 16)}-${randomUUID().slice(0, 8)}-${safeName}`,
  );
  const abs = path.join(ROOT, storageKey);
  await mkdir(path.dirname(abs), { recursive: true });
  await writeFile(abs, opts.bytes);
  return { storageKey, contentHash, byteSize: opts.bytes.length };
}

export function uploadRoot(): string {
  return ROOT;
}
