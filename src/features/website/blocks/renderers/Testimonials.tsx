import type { BlockDataMap } from "../schemas";
import { SectionShell, SectionTitle, hasText } from "./shared";

export function TestimonialsRenderer({ data }: { data: BlockDataMap["testimonials"] }) {
  const items = (data.items ?? []).filter((item) => hasText(item.quote));
  if (items.length === 0) return null;

  return (
    <SectionShell>
      <SectionTitle title={data.title} />
      <ul className="grid gap-6 lg:grid-cols-2">
        {items.map((item, i) => (
          <li key={`${item.name}-${i}`} className="rounded-2xl border border-[var(--mkt-line)] p-6">
            <blockquote className="text-base leading-relaxed text-[var(--mkt-text)]">
              {item.quote.trim()}
            </blockquote>
            {(hasText(item.name) || hasText(item.role) || hasText(item.organization)) && (
              <footer className="mt-4 text-sm text-[var(--mkt-muted)]">
                {[item.name, item.role, item.organization]
                  .filter(hasText)
                  .map((s) => s.trim())
                  .join(" · ")}
              </footer>
            )}
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}
