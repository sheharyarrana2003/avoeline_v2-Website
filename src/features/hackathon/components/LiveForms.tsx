"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { CalendarSyncControls } from "@/src/features/connections/components/CalendarSyncControls";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import type { ActionResult } from "@/src/lib/action";
import type { HackathonSettings } from "../live";

type Action = (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;

export function HackathonSettingsForm({
  settings,
  action,
}: {
  settings: HackathonSettings;
  action: Action;
}) {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(action, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state?.error ? <FormFeedback error={state.error} /> : null}
      {state?.success && !state.error ? <FormFeedback success="Saved." /> : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="max-attach" className={labelClass}>
          Max attachment size (MB)
        </label>
        <input
          id="max-attach"
          name="maxAttachmentMb"
          type="number"
          min={1}
          max={50}
          defaultValue={settings.maxAttachmentMb ?? 10}
          className={`${fieldClass} tabular-nums`}
        />
        <p className="text-xs text-ink-soft">
          Challenge and hint files on CTF tasks. Default 10MB. Enforced on upload and by the storage
          bucket cap.
        </p>
      </div>

      <div className="space-y-3 rounded-xl border border-line px-3 py-3">
        <p className="text-sm font-medium text-ink">Judging window (optional)</p>
        <p className="text-xs text-ink-soft">
          Save start/end below, then sync to Google Calendar if you have Calendar connected.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block text-xs">
            Start
            <input
              type="datetime-local"
              name="judgingWindowStart"
              defaultValue={settings.judgingWindowStart || ""}
              className={`${fieldClass} mt-1`}
            />
          </label>
          <label className="block text-xs">
            End
            <input
              type="datetime-local"
              name="judgingWindowEnd"
              defaultValue={settings.judgingWindowEnd || ""}
              className={`${fieldClass} mt-1`}
            />
          </label>
        </div>
        {settings.judgingWindowStart && settings.judgingWindowEnd ? (
          <CalendarSyncControls
            entityType="judging_session"
            entityId={settings.eventId}
            summary="Judging window"
            startIso={new Date(settings.judgingWindowStart).toISOString()}
            endIso={new Date(settings.judgingWindowEnd).toISOString()}
            timeZone="Asia/Karachi"
            showMeet={false}
          />
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pendingText="Saving…" className={buttonClass("secondary", "sm")}>
          Save
        </SubmitButton>
      </div>
    </form>
  );
}
