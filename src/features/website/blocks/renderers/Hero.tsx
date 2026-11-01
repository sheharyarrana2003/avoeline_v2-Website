import Image from "next/image";
import type { BlockDataMap } from "../schemas";
import { CtaButtons, SectionShell, hasText } from "./shared";

export function HeroRenderer({ data }: { data: BlockDataMap["hero"] }) {
  if (!hasText(data.headline)) return null;

  return (
    <SectionShell dark>
      <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div>
          <h1 className="font-display text-4xl leading-[0.95] tracking-tight text-white sm:text-6xl">
            {data.headline.trim()}
          </h1>
          {hasText(data.subheadline) ? (
            <p className="mt-6 max-w-md text-base leading-relaxed text-white/60">
              {data.subheadline.trim()}
            </p>
          ) : null}
          <CtaButtons primary={data.primaryCta} secondary={data.secondaryCta} dark />
          {hasText(data.trustLine) ? (
            <p className="mt-6 text-sm text-white/50">{data.trustLine.trim()}</p>
          ) : null}
        </div>
        {hasText(data.imageUrl) ? (
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-white/10 bg-white/5">
            <Image
              src={data.imageUrl.trim()}
              alt={hasText(data.imageAlt) ? data.imageAlt.trim() : ""}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 560px"
              priority
            />
          </div>
        ) : null}
      </div>
    </SectionShell>
  );
}
