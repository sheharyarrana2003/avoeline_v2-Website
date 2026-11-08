"use client";

import { useCallback, useState } from "react";
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
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      {editing ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-sm font-medium text-ink hover:underline"
        >
          Edit
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={buttonClass("primary", "sm")}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Competition
        </button>
      )}
      <Modal
        open={open}
        onClose={close}
        title={editing ? `Edit ${track?.name}` : "Add a competition"}
        description="Basics, team and pricing, prizes, rules, and registration close."
        maxWidth="2xl"
      >
        <TrackForm
          action={action}
          track={track}
          prizes={prizes}
          sponsors={sponsors}
          currentSponsorId={currentSponsorId}
          cancelHref={cancelHref}
          onCancel={close}
          onSuccess={close}
          timeZone={timeZone}
        />
      </Modal>
    </>
  );
}
