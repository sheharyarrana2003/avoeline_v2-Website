"use client";

import { useEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { buttonClass } from "@/src/lib/ui";
import { ArchiveEventForm } from "@/src/features/events/components/ArchiveEventForm";
import { DeleteEventForm } from "@/src/features/events/components/DeleteEventForm";
import { DuplicateEventForm } from "@/src/features/events/components/DuplicateEventForm";

export function OrganizerEventRowMenu({
  eventId,
  organizerId,
  title,
  returnTo,
  archived,
  registrationCount,
}: {
  eventId: string;
  organizerId: string;
  title: string;
  returnTo: string;
  archived: boolean;
  registrationCount: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className={buttonClass("ghost", "sm")}
        aria-label={`More actions for ${title}`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
      </button>
      {open ? (
        <div className="absolute right-0 z-20 mt-1 w-44 rounded-xl border border-line bg-paper py-1 shadow-lg">
          <DuplicateEventForm
            eventId={eventId}
            organizerId={organizerId}
            title={title}
            returnTo={returnTo}
            menuItem
          />
          <ArchiveEventForm
            eventId={eventId}
            organizerId={organizerId}
            title={title}
            returnTo={returnTo}
            archived={archived}
            menuItem
          />
          <DeleteEventForm
            eventId={eventId}
            organizerId={organizerId}
            title={title}
            returnTo={returnTo}
            registrationCount={registrationCount}
            menuItem
          />
        </div>
      ) : null}
    </div>
  );
}
