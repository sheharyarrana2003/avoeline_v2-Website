/** Pure upload guards without sharp (unit-testable). */

export const PROOF_MAX_BYTES = 8 * 1024 * 1024;
export const PROOF_MAX_DIMENSION = 4096;
export const LARGE_UPLOAD_THRESHOLD = 4 * 1024 * 1024;

export const ALLOWED_PROOF_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

export const BLOCKED_EXTENSIONS = new Set([
  "exe",
  "bat",
  "cmd",
  "com",
  "msi",
  "scr",
  "ps1",
  "vbs",
  "js",
  "mjs",
  "cjs",
  "sh",
  "bash",
  "zsh",
  "dll",
  "so",
  "dylib",
  "jar",
  "apk",
  "app",
  "dmg",
  "pkg",
  "deb",
  "rpm",
  "php",
  "asp",
  "aspx",
  "cgi",
  "pl",
  "py",
  "rb",
  "htaccess",
]);

export const BLOCKED_MIMES = new Set([
  "application/x-msdownload",
  "application/x-msdos-program",
  "application/x-executable",
  "application/x-sharedlib",
  "application/javascript",
  "text/javascript",
  "application/x-sh",
  "application/x-bat",
  "application/vnd.microsoft.portable-executable",
]);

export function extensionOf(name: string): string {
  const base = name.split(/[/\\]/).pop() || name;
  const i = base.lastIndexOf(".");
  return i >= 0 ? base.slice(i + 1).toLowerCase() : "";
}

export function isBlockedExecutable(opts: { name: string; mime: string }): boolean {
  const ext = extensionOf(opts.name);
  if (ext && BLOCKED_EXTENSIONS.has(ext)) return true;
  const mime = opts.mime.toLowerCase().split(";")[0]!.trim();
  if (BLOCKED_MIMES.has(mime)) return true;
  if (mime.startsWith("application/x-ms") && /executable|download|dos/i.test(mime)) return true;
  return false;
}

export function sniffMime(bytes: Buffer | Uint8Array): string | null {
  const b = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (
    b.length >= 8 &&
    b[0] === 0x89 &&
    b[1] === 0x50 &&
    b[2] === 0x4e &&
    b[3] === 0x47 &&
    b[4] === 0x0d &&
    b[5] === 0x0a &&
    b[6] === 0x1a &&
    b[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    b.length >= 12 &&
    b.toString("ascii", 0, 4) === "RIFF" &&
    b.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  if (
    b.length >= 6 &&
    (b.toString("ascii", 0, 6) === "GIF87a" || b.toString("ascii", 0, 6) === "GIF89a")
  ) {
    return "image/gif";
  }
  if (b.length >= 5 && b.toString("ascii", 0, 5) === "%PDF-") return "application/pdf";
  if (b.length >= 2 && b[0] === 0x4d && b[1] === 0x5a) return "application/x-msdownload";
  if (b.length >= 4 && b[0] === 0x7f && b.toString("ascii", 1, 4) === "ELF") {
    return "application/x-executable";
  }
  return null;
}
