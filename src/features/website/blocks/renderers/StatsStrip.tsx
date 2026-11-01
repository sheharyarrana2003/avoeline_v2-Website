import type { BlockDataMap } from "../schemas";
import { SectionShell, SectionTitle, hasText } from "./shared";

export function StatsStripRenderer({ data }: { data: BlockDataMap["stats_strip"] }) {
  const items = (data.items ?? []).filter((item) => hasText(item.value) && hasText(item.label));
  if (items.length === 0) return null;

  return (
    <SectionShell className="border-y border-[var(--mkt-line)] bg-[var(--mkt-accent-tint)]/40">
      <SectionTitle title={data.title} />
      <dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
        {items.map((item, i) => (
          <div key={`${item.key || item.label}-${i}`}>
            <dt className="text-sm text-[var(--mkt-muted)]">{item.label.trim()}</dt>
            <dd className="mt-1 font-display text-3xl tracking-tight text-[var(--mkt-ink)]">
              {item.value.trim()}
            </dd>
          </div>
        ))}
      </dl>
    </SectionShell>
  );
}
