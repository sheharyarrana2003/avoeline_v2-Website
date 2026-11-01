import type { BlockDataMap } from "../schemas";
import { SectionShell, SectionTitle, hasText } from "./shared";

export function FeatureGridRenderer({ data }: { data: BlockDataMap["feature_grid"] }) {
  const items = (data.items ?? []).filter((item) => hasText(item.title));
  if (items.length === 0) return null;

  return (
    <SectionShell>
      <SectionTitle title={data.title} body={data.body} />
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, i) => (
          <li
            key={`${item.title}-${i}`}
            className="rounded-2xl border border-[var(--mkt-line)] p-6"
          >
            {hasText(item.icon) ? (
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--mkt-accent)]">
                {item.icon.trim()}
              </p>
            ) : null}
            <h3 className="font-display text-xl text-[var(--mkt-ink)]">{item.title.trim()}</h3>
            {hasText(item.body) ? (
              <p className="mt-2 text-sm leading-relaxed text-[var(--mkt-muted)]">
                {item.body.trim()}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}
