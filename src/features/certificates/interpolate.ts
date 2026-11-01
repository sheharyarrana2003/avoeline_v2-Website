import type { CertificateData } from "./layout.types";

export function escapeXml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function interpolateTokens(text: string, data: CertificateData): string {
  if (!text) return "";
  const custom = data.custom_fields ?? {};
  return text.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, rawKey: string) => {
    const key = String(rawKey).trim();
    if (key.startsWith("field:")) {
      return String(custom[key.slice(6)] ?? "");
    }
    switch (key) {
      case "attendeeName":
        return data.recipient_name || "";
      case "eventTitle":
        return data.event_title || "";
      case "eventDate":
        return data.event_dates || "";
      case "role":
        return data.role || data.award || "";
      case "certificateNumber":
        return data.certificate_number || "";
      case "issuerName":
        return data.issuer_name || "";
      case "issuerTitle":
        return data.issuer_title || "";
      case "verifyUrl":
        return data.verify_url || "";
      default:
        return "";
    }
  });
}

/** Approximate shrink font size so text fits width (ASCII-biased heuristic). */
export function shrinkFontSize(text: string, boxW: number, baseSize: number, minSize = 8): number {
  if (!text || boxW <= 0) return baseSize;
  const avgChar = baseSize * 0.55;
  const needed = text.length * avgChar;
  if (needed <= boxW) return baseSize;
  return Math.max(minSize, Math.floor(baseSize * (boxW / needed)));
}
