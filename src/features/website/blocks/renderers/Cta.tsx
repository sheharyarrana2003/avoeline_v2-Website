import type { BlockDataMap } from "../schemas";
import { CtaButtons, SectionShell, hasText } from "./shared";

export function CtaRenderer({ data }: { data: BlockDataMap["cta"] }) {
  if (!hasText(data.headline)) return null;

  return (
    <SectionShell dark>
      <div className="max-w-2xl">
        <h2 className="font-display text-3xl tracking-tight text-white sm:text-4xl">
          {data.headline.trim()}
        </h2>
        {hasText(data.body) ? (
          <p className="mt-4 text-base leading-relaxed text-white/65">{data.body.trim()}</p>
        ) : null}
        <CtaButtons primary={data.primaryCta} secondary={data.secondaryCta} dark />
      </div>
    </SectionShell>
  );
}
