/** Pure FileStore ref helpers (safe for unit tests — no server-only). */

export function storageRefForFileId(fileId: string): string {
  return `file:${fileId}`;
}

export function fileIdFromStorageRef(ref: string | null | undefined): string | null {
  const s = String(ref || "");
  if (s.startsWith("file:")) {
    const id = s.slice("file:".length);
    return /^[0-9a-f-]{36}$/i.test(id) ? id : null;
  }
  return null;
}

export function publicFileUrl(fileId: string): string {
  return `/api/files/${fileId}`;
}

export function contentDisposition(inline: boolean, name: string): string {
  const safe = name.replace(/["\r\n]/g, "_").slice(0, 180) || "file";
  const type = inline ? "inline" : "attachment";
  return `${type}; filename="${safe}"`;
}

export function shouldInline(mime: string): boolean {
  const m = mime.toLowerCase();
  return m.startsWith("image/") || m === "application/pdf";
}
