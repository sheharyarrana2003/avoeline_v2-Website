import { createHash } from "node:crypto";
import sharp from "sharp";
import {
  ALLOWED_PROOF_MIMES,
  BLOCKED_EXTENSIONS,
  BLOCKED_MIMES,
  extensionOf,
  isBlockedExecutable,
  PROOF_MAX_BYTES,
  PROOF_MAX_DIMENSION,
  sniffMime,
} from "./validateUpload.logic";

export {
  PROOF_MAX_BYTES,
  PROOF_MAX_DIMENSION,
  LARGE_UPLOAD_THRESHOLD,
  extensionOf,
  isBlockedExecutable,
  sniffMime,
} from "./validateUpload.logic";

export function sha256Hex(bytes: Buffer | Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export type ProofValidateOk = {
  ok: true;
  bytes: Buffer;
  mime: string;
  checksum: string;
  name: string;
};

export type ProofValidateFail = { ok: false; error: string; code: string };

/**
 * Allowlist image+PDF, size caps, magic sniff, re-encode images (strip EXIF).
 */
export async function validateAndNormalizeProof(opts: {
  bytes: Buffer | Uint8Array;
  fileName: string;
  declaredMime?: string;
  maxBytes?: number;
}): Promise<ProofValidateOk | ProofValidateFail> {
  const maxBytes = opts.maxBytes ?? PROOF_MAX_BYTES;
  const raw = Buffer.isBuffer(opts.bytes) ? opts.bytes : Buffer.from(opts.bytes);
  if (!raw.length) return { ok: false, code: "EMPTY", error: "File is empty." };
  if (raw.length > maxBytes) {
    return {
      ok: false,
      code: "TOO_LARGE",
      error: `File must be under ${Math.floor(maxBytes / (1024 * 1024))}MB.`,
    };
  }

  if (isBlockedExecutable({ name: opts.fileName, mime: opts.declaredMime || "" })) {
    return { ok: false, code: "BLOCKED", error: "That file type is not allowed." };
  }

  const sniffed = sniffMime(raw);
  if (sniffed && (sniffed.startsWith("application/x-") || sniffed === "application/x-msdownload")) {
    return { ok: false, code: "BLOCKED", error: "That file type is not allowed." };
  }

  const mime = sniffed || (opts.declaredMime || "").toLowerCase().split(";")[0]!.trim();
  if (!ALLOWED_PROOF_MIMES.has(mime)) {
    return { ok: false, code: "MIME", error: "Upload an image or PDF." };
  }

  let out = raw;
  let outMime = mime;
  let outName = opts.fileName;

  if (mime.startsWith("image/") && mime !== "image/gif") {
    try {
      const img = sharp(raw, { failOn: "none" }).rotate();
      const meta = await img.metadata();
      if (
        (meta.width && meta.width > PROOF_MAX_DIMENSION) ||
        (meta.height && meta.height > PROOF_MAX_DIMENSION)
      ) {
        return {
          ok: false,
          code: "DIMENSIONS",
          error: `Image dimensions must be at most ${PROOF_MAX_DIMENSION}px.`,
        };
      }
      if (mime === "image/png") {
        out = await img.png({ compressionLevel: 9 }).toBuffer();
        outMime = "image/png";
      } else {
        out = await img.webp({ quality: 85 }).toBuffer();
        outMime = "image/webp";
        const base = opts.fileName.replace(/\.[^.]+$/, "") || "proof";
        outName = `${base}.webp`;
      }
    } catch {
      return { ok: false, code: "DECODE", error: "Could not process that image." };
    }
  }

  return {
    ok: true,
    bytes: out,
    mime: outMime,
    checksum: sha256Hex(out),
    name: safeRandomName(outName, outMime),
  };
}

export function safeRandomName(original: string, mime: string): string {
  const extFromMime =
    mime === "image/jpeg"
      ? "jpg"
      : mime === "image/png"
        ? "png"
        : mime === "image/webp"
          ? "webp"
          : mime === "image/gif"
            ? "gif"
            : mime === "application/pdf"
              ? "pdf"
              : extensionOf(original) || "bin";
  const rand = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  return `${rand}.${extFromMime}`;
}

export const __test = {
  ALLOWED_PROOF_MIMES,
  BLOCKED_EXTENSIONS,
  BLOCKED_MIMES,
};
