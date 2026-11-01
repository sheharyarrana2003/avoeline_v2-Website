export type LegalTocItem = {
  id: string;
  text: string;
  level: 2;
};

/** Slugify a heading for in-page anchors. */
export function slugifyHeading(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

/**
 * Strip script/style tags and raw HTML so markdown never injects executable markup.
 * react-markdown should also be used without rehype-raw.
 */
export function sanitizeLegalMarkdown(md: string): string {
  let out = String(md ?? "");
  // Remove script/style blocks (including attributes / case variants).
  out = out.replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "");
  // Strip remaining HTML tags (keep text content).
  out = out.replace(/<\/?[a-zA-Z][^>]*>/g, "");
  // Neutralize obvious javascript: URLs in markdown links.
  out = out.replace(/\((?:\s*)javascript:[^)]*\)/gi, "(#)");
  return out;
}

/** Extract a TOC from `##` headings after sanitization. */
export function extractLegalToc(md: string): LegalTocItem[] {
  const safe = sanitizeLegalMarkdown(md);
  const toc: LegalTocItem[] = [];
  const seen = new Map<string, number>();
  for (const line of safe.split(/\r?\n/)) {
    const m = /^##\s+(.+?)\s*$/.exec(line);
    if (!m) continue;
    const text = m[1].trim();
    if (!text) continue;
    let id = slugifyHeading(text) || "section";
    const n = (seen.get(id) ?? 0) + 1;
    seen.set(id, n);
    if (n > 1) id = `${id}-${n}`;
    toc.push({ id, text, level: 2 });
  }
  return toc;
}

export type PreparedLegalDoc = {
  body: string;
  toc: LegalTocItem[];
};

export function prepareLegalMarkdown(md: string): PreparedLegalDoc {
  const body = sanitizeLegalMarkdown(md);
  return { body, toc: extractLegalToc(body) };
}
