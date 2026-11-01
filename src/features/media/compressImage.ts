/**
 * Client-side image quality reduction before upload.
 * Non-images should be filtered by the caller; this only accepts image/*.
 */

const DEFAULT_MAX_DIMENSION = 2400;
const JPEG_QUALITY = 0.72;

function stemOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(0, i) : name;
}

function hasTransparency(ctx: CanvasRenderingContext2D, w: number, h: number): boolean {
  try {
    const { data } = ctx.getImageData(0, 0, Math.min(w, 64), Math.min(h, 64));
    for (let i = 3; i < data.length; i += 4) {
      if (data[i]! < 255) return true;
    }
  } catch {
    // getImageData can throw on tainted canvases; treat as opaque.
  }
  return false;
}

/**
 * Draw the image to a canvas (optional max-dimension clamp) and export
 * as JPEG quality 0.72, or PNG when transparency must be kept.
 */
export async function compressImage(
  file: File,
  opts?: { maxDimension?: number; quality?: number },
): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  const maxDimension = opts?.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const quality = opts?.quality ?? JPEG_QUALITY;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  let width = bitmap.width;
  let height = bitmap.height;
  if (width < 1 || height < 1) {
    bitmap.close();
    return file;
  }

  const longest = Math.max(width, height);
  if (longest > maxDimension) {
    const scale = maxDimension / longest;
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const preferPng =
    file.type === "image/png" || file.type === "image/webp"
      ? hasTransparency(ctx, width, height)
      : false;
  const mime = preferPng ? "image/png" : "image/jpeg";
  const ext = preferPng ? ".png" : ".jpg";

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), mime, preferPng ? undefined : quality);
  });

  if (!blob) return file;

  // Skip if compression somehow grew the file (rare for already-tiny PNGs).
  if (blob.size >= file.size && file.type === mime) return file;

  return new File([blob], `${stemOf(file.name)}${ext}`, {
    type: mime,
    lastModified: Date.now(),
  });
}
