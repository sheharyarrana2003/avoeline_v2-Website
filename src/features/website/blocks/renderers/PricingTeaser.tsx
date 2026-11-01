import Link from "next/link";
import { buttonClass } from "@/src/lib/ui";
import type { BlockDataMap } from "../schemas";
import { SectionShell, SectionTitle, hasText } from "./shared";

export function PricingTeaserRenderer({ data }: { data: BlockDataMap["pricing_teaser"] }) {
  const items = (data.items ?? []).filter((item) => hasText(item.name));
  if (items.length === 0 && !hasText(data.title)) return null;
  if (items.length === 0) return null;
  const showRecommended = data.showRecommended !== false;

  return (
    <SectionShell>
      <SectionTitle title={data.title} body={data.body} />
      <ul className="grid gap-6 lg:grid-cols-3">
        {items.map((item, i) => {
          const recommended = showRecommended && item.recommended;
          return (
            <li
              key={`${item.name}-${i}`}
              className={`rounded-2xl border p-6 ${
                recommended
                  ? "border-[var(--mkt-accent)] bg-[var(--mkt-accent-tint)]"
                  : "border-[var(--mkt-line)]"
              }`}
            >
              {recommended ? (
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--mkt-accent)]">
                  Recommended
                </p>
              ) : null}
              <h3 className="font-display text-2xl text-[var(--mkt-ink)]">
                {hasText(item.href) ? (
                  <Link href={item.href.trim()} className="hover:underline">
                    {item.name.trim()}
                  </Link>
                ) : (
                  item.name.trim()
                )}
              </h3>
              {hasText(item.tagline) ? (
                <p className="mt-2 text-sm text-[var(--mkt-muted)]">{item.tagline.trim()}</p>
              ) : null}
              {hasText(item.price) ? (
                <p className="mt-4 font-display text-3xl text-[var(--mkt-ink)]">
                  {item.price.trim()}
                </p>
              ) : null}
              {(item.features ?? []).filter(hasText).length > 0 ? (
                <ul className="mt-4 space-y-1.5 text-sm text-[var(--mkt-muted)]">
                  {(item.features ?? []).filter(hasText).map((f) => (
                    <li key={f}>{f.trim()}</li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
      {hasText(data.ctaLabel) && hasText(data.ctaHref) ? (
        <div className="mt-8">
          <Link href={data.ctaHref.trim()} className={buttonClass("primary", "md")}>
            {data.ctaLabel.trim()}
          </Link>
        </div>
      ) : null}
    </SectionShell>
  );
}
