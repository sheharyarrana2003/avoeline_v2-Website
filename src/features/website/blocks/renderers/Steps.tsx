import type { BlockDataMap } from "../schemas";
import { SectionShell, SectionTitle, hasText } from "./shared";

export function StepsRenderer({ data }: { data: BlockDataMap["steps"] }) {
  const items = (data.items ?? []).filter((item) => hasText(item.title));
  if (items.length === 0) return null;

  return (
    <SectionShell>
      <SectionTitle title={data.title} body={data.body} />
      <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item, i) => (
          <li key={`${item.title}-${i}`}>
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--mkt-muted)]">
              {String(i + 1).padStart(2, "0")}
            </p>
            <h3 className="mt-2 font-display text-xl text-[var(--mkt-ink)]">{item.title.trim()}</h3>
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
