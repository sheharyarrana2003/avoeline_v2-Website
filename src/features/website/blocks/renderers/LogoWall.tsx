import Image from "next/image";
import type { BlockDataMap } from "../schemas";
import { SectionShell, SectionTitle, hasText } from "./shared";

export function LogoWallRenderer({ data }: { data: BlockDataMap["logo_wall"] }) {
  const items = (data.items ?? []).filter((item) => hasText(item.name) || hasText(item.logoUrl));
  if (items.length === 0) return null;

  return (
    <SectionShell>
      <SectionTitle title={data.title} />
      <ul className="flex flex-wrap items-center justify-center gap-8 sm:gap-12">
        {items.map((item, i) => {
          const content = hasText(item.logoUrl) ? (
            <Image
              src={item.logoUrl.trim()}
              alt={hasText(item.alt) ? item.alt.trim() : hasText(item.name) ? item.name.trim() : ""}
              width={120}
              height={40}
              className="h-10 w-auto object-contain opacity-80"
            />
          ) : (
            <span className="text-sm font-medium text-[var(--mkt-muted)]">{item.name.trim()}</span>
          );
          return (
            <li key={`${item.name}-${i}`}>
              {hasText(item.href) ? (
                <a href={item.href.trim()} target="_blank" rel="noopener noreferrer">
                  {content}
                </a>
              ) : (
                content
              )}
            </li>
          );
        })}
      </ul>
    </SectionShell>
  );
}
