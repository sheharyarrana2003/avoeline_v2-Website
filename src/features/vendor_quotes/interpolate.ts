import type { QuotationTemplateVars } from "./types";

/** Simple mustache-style `{{key}}` replace; unknown keys become empty string. */
export function applyQuotationTemplate(body: string, vars: QuotationTemplateVars): string {
  if (!body) return "";
  return body.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, rawKey: string) => {
    const key = String(rawKey).trim() as keyof QuotationTemplateVars;
    const value = vars[key];
    return value == null ? "" : String(value);
  });
}
