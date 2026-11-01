import Image from "next/image";
import Link from "next/link";
import type { BlockDataMap } from "../schemas";
import { SectionShell, SectionTitle, hasText } from "./shared";

export function EventShowcaseRenderer({ data }: { data: BlockDataMap["event_showcase"] }) {
  const items = (data.items ?? []).filter((item) => hasText(item.title));
  if (items.length === 0) return null;

  return (
    <SectionShell>
      <SectionTitle title={data.title} body={data.body} />
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, i) => {
          const card = (
            <>
              {hasText(item.imageUrl) ? (
                <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-[var(--muted)]">
                  <Image
                    src={item.imageUrl.trim()}
                    alt={hasText(item.imageAlt) ? item.imageAlt.trim() : item.title.trim()}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 360px"
                  />
                </div>
              ) : null}
              <h3 className="mt-3 font-display text-lg text-[var(--mkt-ink)]">
                {item.title.trim()}
              </h3>
              {hasText(item.meta) ? (
                <p className="mt-1 text-sm text-[var(--mkt-muted)]">{item.meta.trim()}</p>
              ) : null}
            </>
          );
          return (
            <li key={`${item.eventId || item.title}-${i}`}>
              {hasText(item.href) ? (
                <Link href={item.href.trim()} className="block transition hover:opacity-90">
                  {card}
                </Link>
              ) : (
                card
              )}
            </li>
          );
        })}
      </ul>
    </SectionShell>
  );
}
