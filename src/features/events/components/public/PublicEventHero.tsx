"use client";

import Image from "next/image";
import { CalendarPlus } from "lucide-react";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { ShareEventLink } from "@/src/features/events/components/ShareEventLink";
import type { PublicEventDto } from "@/src/features/events/types";
import { downloadEventIcs } from "./addToCalendar";
import { buttonClass } from "@/src/lib/ui";

const LIFECYCLE_LABEL: Record<string, string> = {
  draft: "Draft",
  upcoming: "Upcoming",
  ongoing: "Happening now",
  completed: "Completed",
  cancelled: "Cancelled",
  archived: "Archived",
  published: "Published",
};

export function PublicEventHero({ dto, preview }: { dto: PublicEventDto; preview: boolean }) {
  const statusLabel = preview ? "Admin preview" : LIFECYCLE_LABEL[dto.lifecycle] || dto.status;

  return (
    <header className="relative overflow-hidden rounded-none border-b border-line">
      <div className="relative min-h-[280px] w-full sm:min-h-[360px]">
        {dto.bannerImage ? (
          <Image
            src={dto.bannerImage}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-muted via-paper to-muted" />
        )}
        <div
          className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/35 to-ink/10"
          aria-hidden="true"
        />
        <div className="relative z-10 mx-auto flex h-full min-h-[280px] w-full max-w-6xl flex-col justify-end gap-4 px-4 py-10 sm:min-h-[360px] sm:px-6 sm:py-14">
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
                className="rounded-full border border-white/30 bg-white/10 px-2.5 py-0.5 text-2xs font-medium uppercase tracking-wide text-white"
              >
                {tag}
              </span>
            ))}
          </div>

          <h1 className="max-w-3xl font-display text-3xl text-white sm:text-5xl">{dto.title}</h1>

          {dto.shortDescription ? (
            <p className="max-w-2xl text-base leading-relaxed text-white/85 sm:text-lg">
              {dto.shortDescription}
            </p>
          ) : null}

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <OrganizerChip name={dto.organizerChip.name} logoUrl={dto.organizerChip.logoUrl} />
            <div className="min-w-0 flex-1 sm:max-w-sm">
              <ShareEventLink url={dto.sharePath} label="Share" />
            </div>
            <button
              type="button"
              onClick={() => downloadEventIcs(dto)}
              className={buttonClass("secondary", "sm")}
            >
              <CalendarPlus className="h-3.5 w-3.5" aria-hidden="true" />
              Add to calendar
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

function OrganizerChip({ name, logoUrl }: { name: string; logoUrl?: string | null }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/25 px-2.5 py-1.5 text-sm text-white backdrop-blur-sm">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="h-6 w-6 rounded-full object-cover" />
      ) : (
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 font-display text-2xs">
          {name.slice(0, 1).toUpperCase()}
        </span>
      )}
      <span className="font-medium">{name}</span>
    </div>
  );
}
