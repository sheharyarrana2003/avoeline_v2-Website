/**
 * Allow only a small HTML subset for event descriptions.
 * Script, event handlers, and unknown tags are stripped.
 */
const ALLOWED = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "ul",
  "ol",
  "li",
  "a",
  "span",
  "font",
]);

const SAFE_HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const SAFE_RGB = /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/i;

function safeCssColor(raw: string): string | null {
  const v = raw.trim().replace(/["']/g, "");
  if (SAFE_HEX.test(v) || SAFE_RGB.test(v)) return v;
  return null;
}

function styleFromAttrs(attrs: string): string {
  const parts: string[] = [];
  const styleMatch = attrs.match(/style\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
  const styleRaw = styleMatch?.[2] ?? styleMatch?.[3] ?? styleMatch?.[4] ?? "";
  for (const decl of styleRaw.split(";")) {
    const [propRaw, ...rest] = decl.split(":");
    if (!propRaw || rest.length === 0) continue;
    const prop = propRaw.trim().toLowerCase();
    const val = rest.join(":").trim();
    if (prop === "color" || prop === "background-color") {
      const safe = safeCssColor(val);
      if (safe) parts.push(`${prop}: ${safe}`);
    }
  }
  const colorAttr = attrs.match(/(?:^|\s)color\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
  const colorRaw = colorAttr?.[2] ?? colorAttr?.[3] ?? colorAttr?.[4];
  if (colorRaw) {
    const safe = safeCssColor(colorRaw);
    if (safe) parts.push(`color: ${safe}`);
  }
  return parts.length ? ` style="${parts.join("; ")}"` : "";
}

function stripTags(html: string): string {
  return html.replace(/<\/?([a-zA-Z0-9]+)([^>]*)>/g, (full, tag: string, attrs: string) => {
    const name = tag.toLowerCase();
    if (name === "script" || name === "style" || name === "iframe") return "";
    if (!ALLOWED.has(name)) return "";
    if (name === "br") return "<br>";
    const closing = full.startsWith("</");
    if (closing) {
      if (name === "font") return "</span>";
      return `</${name}>`;
    }
    if (name === "a") {
      const href = attrs.match(/href\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
      const raw = href?.[2] ?? href?.[3] ?? href?.[4] ?? "";
      if (!/^https?:\/\//i.test(raw) && !raw.startsWith("/")) return "<a>";
      const safe = raw.replace(/"/g, "");
      return `<a href="${safe}" rel="noopener noreferrer" target="_blank">`;
    }
    if (name === "span" || name === "font") {
      return `<span${styleFromAttrs(attrs)}>`;
    }
    return `<${name}>`;
  });
}

export function sanitizeDescriptionHtml(input: string): string {
  const raw = String(input || "").trim();
  if (!raw) return "";
  if (!raw.includes("<")) {
    return raw
      .split(/\n{2,}/)
      .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
      .join("");
  }
  return stripTags(raw);
}
