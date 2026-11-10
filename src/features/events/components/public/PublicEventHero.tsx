"use client";

import Image from "next/image";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import type { PublicEventDto } from "@/src/features/events/types";
import { PublicShareMenu } from "./PublicShareMenu";
import { PublicCalendarMenu } from "./PublicCalendarMenu";
import { lifecycleLabel } from "./publicPage.logic";

/**
 * Clean banner (no text/glass overlays) + solid meta section below.
 * Do not add gradient overlays or chips on top of the banner image.
 */
export function PublicEventHero({ dto, preview }: { dto: PublicEventDto; preview: boolean }) {
  const statusLabel = lifecycleLabel(dto.lifecycle, preview);

  return (
    <header className="border-b border-line bg-paper">
      <div className="relative w-full overflow-hidden bg-muted">
        <div className="relative aspect-video w-full md:aspect-[21/9]">
          {dto.bannerImage ? (
            <Image
              src={dto.bannerImage}
              alt={dto.title ? `${dto.title} banner` : "Event banner"}
              fill
              priority
              sizes="100vw"
              className="object-cover object-center"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-muted via-paper to-muted" />
          )}
        </div>
      </div>

      <div className="relative z-10 mx-auto -mt-6 w-full max-w-6xl px-4 sm:-mt-8 sm:px-6">
        <div className="rounded-2xl border border-line bg-paper px-4 py-6 shadow-sm sm:px-6 sm:py-8">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              status={preview ? "unpublished" : dto.lifecycle}
              label={statusLabel}
              size="sm"
              marker="dot"
            />
            {dto.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-line bg-muted px-2.5 py-0.5 text-2xs font-medium uppercase tracking-wide text-ink-soft"
              >
                {tag}
              </span>
            ))}
          </div>

          <h1 className="mt-3 max-w-3xl font-display text-3xl text-ink sm:text-4xl md:text-5xl">
            {dto.title}
          </h1>

          {dto.shortDescription ? (
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-soft sm:text-lg">
              {dto.shortDescription}
            </p>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <OrganizerChip name={dto.organizerChip.name} logoUrl={dto.organizerChip.logoUrl} />
            <PublicShareMenu sharePath={dto.sharePath} title={dto.title} />
            <PublicCalendarMenu dto={dto} preview={preview} />
          </div>
        </div>
      </div>
    </header>
  );
}

function OrganizerChip({ name, logoUrl }: { name: string; logoUrl?: string | null }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-line bg-muted px-2.5 py-1.5 text-sm text-ink">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="h-6 w-6 rounded-full object-cover" />
      ) : (
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-paper font-display text-2xs">
          {name.slice(0, 1).toUpperCase()}
        </span>
      )}
      <span className="font-medium">{name}</span>
    </div>
  );
}
