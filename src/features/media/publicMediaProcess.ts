import sharp from "sharp";
import type { UploadKind } from "@/src/features/files/uploadKinds";
import { getUploadKindConfig, mimeAllowedForKind } from "@/src/features/files/uploadKinds";
import { sha256Hex, safeRandomName } from "@/src/features/files/validateUpload";

export type PublicMediaOk = {
  ok: true;
  bytes: Buffer;
  mime: string;
  checksum: string;
  name: string;
};

export type PublicMediaFail = { ok: false; error: string; code: string };

/**
 * Re-encode public display images to WebP within kind budget; strip EXIF; discard original.
 */
export async function processPublicDisplayImage(opts: {
  kind: UploadKind;
  bytes: Buffer | Uint8Array;
  fileName: string;
  declaredMime?: string;
}): Promise<PublicMediaOk | PublicMediaFail> {
  const cfg = getUploadKindConfig(opts.kind);
  if (cfg.store !== "supabase_public") {
    return { ok: false, code: "KIND", error: "That upload type is not a public image." };
  }

  const raw = Buffer.isBuffer(opts.bytes) ? opts.bytes : Buffer.from(opts.bytes);
  if (!raw.length) return { ok: false, code: "EMPTY", error: "File is empty." };
  if (raw.length > cfg.hardMaxBytes) {
    return {
      ok: false,
      code: "TOO_LARGE",
      error: `That file is too large (max ${Math.floor(cfg.hardMaxBytes / (1024 * 1024))}MB).`,
    };
  }

  const declared = (opts.declaredMime || "").toLowerCase().split(";")[0]!.trim();
  if (declared.startsWith("video/") || opts.fileName.match(/\.(mp4|mov|webm|mkv)$/i)) {
    return {
      ok: false,
      code: "VIDEO",
      error: "Videos are links only. Paste a YouTube or Vimeo URL instead of uploading a file.",
    };
  }
  if (!mimeAllowedForKind(opts.kind, declared || "image/jpeg")) {
    return { ok: false, code: "MIME", error: "Use an image file (JPEG, PNG, or WebP)." };
  }

  const budget = cfg.budgetBytes ?? cfg.maxBytes;
  const maxDim = cfg.maxDimension ?? 2400;

  try {
    let img = sharp(raw, { failOn: "none" }).rotate();
    const meta = await img.metadata();
    const w = meta.width || 0;
    const h = meta.height || 0;
    if (w > maxDim || h > maxDim) {
      img = img.resize({
        width: w >= h ? maxDim : undefined,
        height: h > w ? maxDim : undefined,
        fit: "inside",
        withoutEnlargement: true,
      });
    }

    let quality = 82;
    let out = await img.webp({ quality, effort: 4 }).toBuffer();
    while (out.length > budget && quality > 40) {
      quality -= 8;
      out = await sharp(raw, { failOn: "none" })
        .rotate()
        .resize({
          width: w >= h ? maxDim : undefined,
          height: h > w ? maxDim : undefined,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality, effort: 4 })
        .toBuffer();
    }
    if (out.length > budget * 1.15) {
      // Last resort: shrink dimensions further
      const shrink = Math.max(800, Math.floor(maxDim * 0.7));
      out = await sharp(raw, { failOn: "none" })
        .rotate()
        .resize({ width: shrink, height: shrink, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 70, effort: 5 })
        .toBuffer();
    }

    const mime = "image/webp";
    const name = safeRandomName(opts.fileName.replace(/\.[^.]+$/, "") + ".webp", mime);
    return { ok: true, bytes: out, mime, checksum: sha256Hex(out), name };
  } catch {
    return { ok: false, code: "DECODE", error: "Could not process that image." };
  }
}
