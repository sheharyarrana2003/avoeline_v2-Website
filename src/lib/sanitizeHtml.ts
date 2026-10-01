/**
 * Allow only a small HTML subset for event descriptions.
 * Script, event handlers, and unknown tags are stripped.
 */
const ALLOWED = new Set(["p", "br", "strong", "b", "em", "i", "ul", "ol", "li", "a"]);

function stripTags(html: string): string {
  return html.replace(/<\/?([a-zA-Z0-9]+)([^>]*)>/g, (full, tag: string, attrs: string) => {
    const name = tag.toLowerCase();
    if (name === "script" || name === "style" || name === "iframe") return "";
    if (!ALLOWED.has(name)) return "";
    if (name === "br") return "<br>";
    const closing = full.startsWith("</");
    if (closing) return `</${name}>`;
    if (name === "a") {
      const href = attrs.match(/href\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
      const raw = href?.[2] ?? href?.[3] ?? href?.[4] ?? "";
      if (!/^https?:\/\//i.test(raw) && !raw.startsWith("/")) return "<a>";
      const safe = raw.replace(/"/g, "");
      return `<a href="${safe}" rel="noopener noreferrer" target="_blank">`;
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
