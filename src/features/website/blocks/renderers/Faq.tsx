import type { BlockDataMap } from "../schemas";
import { SectionShell, SectionTitle, hasText } from "./shared";

export function FaqRenderer({ data }: { data: BlockDataMap["faq"] }) {
  const items = (data.items ?? []).filter((item) => hasText(item.question));
  if (items.length === 0) return null;

  return (
    <SectionShell>
      <SectionTitle title={data.title} />
      <div className="divide-y divide-[var(--mkt-line)] rounded-2xl border border-[var(--mkt-line)]">
        {items.map((item, i) => (
          <details key={`${item.question}-${i}`} className="group px-5 py-4">
            <summary className="cursor-pointer list-none font-medium text-[var(--mkt-ink)] marker:content-none">
              {item.question.trim()}
            </summary>
            {hasText(item.answer) ? (
              <p className="mt-3 text-sm leading-relaxed text-[var(--mkt-muted)]">
                {item.answer.trim()}
              </p>
            ) : null}
          </details>
        ))}
      </div>
    </SectionShell>
  );
}
