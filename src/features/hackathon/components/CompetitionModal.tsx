"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { buttonClass } from "@/src/lib/ui";
import { TrackForm, type SponsorOption } from "./TrackForm";
import type { ActionResult } from "@/src/lib/action";
import type { HackathonTrack } from "../types";
import type { PrizeDraft } from "./PrizeListFields";

export function CompetitionModal({
  action,
  track,
  prizes = [],
  sponsors,
  currentSponsorId,
  cancelHref,
  defaultOpen = false,
  timeZone = "UTC",
}: {
  action: (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;
  track: HackathonTrack | null;
  prizes?: PrizeDraft[];
  sponsors: SponsorOption[];
  currentSponsorId: string;
  cancelHref: string;
  defaultOpen?: boolean;
  timeZone?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const editing = !!track;

  return (
    <>
      {editing ? null : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={buttonClass("primary", "sm")}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Competition
        </button>
      )}
      {editing ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-sm font-medium text-ink hover:underline"
        >
          Edit
        </button>
      ) : null}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? `Edit ${track?.name}` : "Add a competition"}
        description="Basics, timing, pricing, prizes and rules in one place."
        maxWidth="2xl"
        className="max-h-[90vh] overflow-y-auto"
      >
        <TrackForm
          action={action}
          track={track}
          prizes={prizes}
          sponsors={sponsors}
          currentSponsorId={currentSponsorId}
          cancelHref={cancelHref}
          onCancel={() => setOpen(false)}
          timeZone={timeZone}
        />
      </Modal>
    </>
  );
}
