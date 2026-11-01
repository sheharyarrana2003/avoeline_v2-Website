import type { BlockDataMap } from "../schemas";
import { SectionShell, SectionTitle, hasText } from "./shared";

export function TimelineRenderer({ data }: { data: BlockDataMap["timeline"] }) {
  const items = (data.items ?? []).filter((item) => hasText(item.title));
  if (items.length === 0) return null;

  return (
    <SectionShell>
      <SectionTitle title={data.title} body={data.body} />
      <ol className="relative space-y-8 border-l border-[var(--mkt-line)] pl-6">
        {items.map((item, i) => (
          <li key={`${item.title}-${i}`} className="relative">
            <span className="absolute -left-[1.55rem] top-1.5 h-2.5 w-2.5 rounded-full bg-[var(--mkt-accent)]" />
            {hasText(item.date) ? (
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--mkt-muted)]">
                {item.date.trim()}
              </p>
            ) : null}
            <h3 className="mt-1 font-display text-xl text-[var(--mkt-ink)]">{item.title.trim()}</h3>
            {hasText(item.body) ? (
              <p className="mt-2 text-sm leading-relaxed text-[var(--mkt-muted)]">
                {item.body.trim()}
              </p>
            ) : null}
          </li>
        ))}
      </ol>
    </SectionShell>
  );
}
