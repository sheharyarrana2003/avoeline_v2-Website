import type { BlockDataMap } from "../schemas";
import { SectionShell, SectionTitle, hasText } from "./shared";

/** Minimal markdown-ish display: paragraphs split on blank lines. No HTML. */
export function RichTextRenderer({ data }: { data: BlockDataMap["rich_text"] }) {
  if (!hasText(data.markdown) && !hasText(data.title)) return null;
  if (!hasText(data.markdown)) return null;

  const paragraphs = data.markdown
    .trim()
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) return null;

  return (
    <SectionShell>
      <SectionTitle title={data.title} />
      <div className="prose-marketing max-w-3xl space-y-4 text-base leading-relaxed text-[var(--mkt-text)]">
        {paragraphs.map((p, i) => (
          <p key={i} className="whitespace-pre-wrap">
            {p}
          </p>
        ))}
      </div>
    </SectionShell>
  );
}
