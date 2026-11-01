import type { BlockDataMap } from "../schemas";
import { SectionShell, SectionTitle, hasText } from "./shared";

export function AudienceTabsRenderer({ data }: { data: BlockDataMap["audience_tabs"] }) {
  const tabs = (data.tabs ?? []).filter((tab) => hasText(tab.title));
  if (tabs.length === 0) return null;

  return (
    <SectionShell>
      <SectionTitle title={data.title} body={data.body} />
      <div className="grid gap-4 sm:grid-cols-2">
        {tabs.map((tab, i) => (
          <div
            key={`${tab.title}-${i}`}
            className="rounded-2xl border border-[var(--mkt-line)] p-6"
          >
            <h3 className="font-display text-xl text-[var(--mkt-ink)]">{tab.title.trim()}</h3>
            {hasText(tab.body) ? (
              <p className="mt-2 text-sm leading-relaxed text-[var(--mkt-muted)]">
                {tab.body.trim()}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </SectionShell>
  );
}
