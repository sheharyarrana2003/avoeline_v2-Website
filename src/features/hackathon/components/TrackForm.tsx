"use client";

import { useActionState, useEffect, type ReactNode } from "react";
import Link from "next/link";
import { DateField } from "@/src/shared_components/DateField";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import { toEventLocalInput, toIsoDate } from "@/src/lib/datetime";
import type { ActionResult } from "@/src/lib/action";
import type { HackathonTrack } from "../types";
import { PrizeListFields, type PrizeDraft } from "./PrizeListFields";

export interface SponsorOption {
  id: string;
  name: string;
  tier: string;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t border-line pt-5 first:border-t-0 first:pt-0">
      <h3 className="text-2xs font-semibold uppercase tracking-wider text-ink-soft">{title}</h3>
      {children}
    </section>
  );
}

function DateTimeField({
  id,
  name,
  label,
  defaultIso,
  timeZone,
}: {
  id: string;
  name: string;
  label: string;
  defaultIso?: string;
  timeZone: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={labelClass}>
        {label} <span className="normal-case text-ink-faint">({timeZone})</span>
      </label>
      <input
        id={id}
        name={name}
        type="datetime-local"
        defaultValue={toEventLocalInput(defaultIso || "", timeZone)}
        className={fieldClass}
      />
    </div>
  );
}

export function TrackForm({
  action,
  track,
  prizes = [],
  sponsors,
  currentSponsorId,
  cancelHref,
  onCancel,
  onSuccess,
  timeZone = "UTC",
}: {
  action: (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;
  track: HackathonTrack | null;
  prizes?: PrizeDraft[];
  sponsors: SponsorOption[];
  currentSponsorId: string;
  cancelHref: string;
  onCancel?: () => void;
  onSuccess?: () => void;
  timeZone?: string;
}) {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(action, null);
  const editing = !!track;
  const tz = timeZone || "UTC";
  const isCtf = track?.kind === "ctf";

  useEffect(() => {
    if (state?.success) onSuccess?.();
  }, [state?.success, onSuccess]);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {track ? <input type="hidden" name="trackId" value={track.id} /> : null}

      {state?.error ? <FormFeedback error={state.error} /> : null}
      {state?.success ? (
        <FormFeedback success={editing ? "Track updated." : "Track added."} />
      ) : null}

      <Section title="Basics">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="track-name" className={labelClass}>
            Name
          </label>
          <input
            id="track-name"
            name="name"
            required
            maxLength={120}
            defaultValue={track?.name ?? ""}
            placeholder="Applied AI"
            className={fieldClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="track-description" className={labelClass}>
            Description
          </label>
          <textarea
            id="track-description"
            name="description"
            rows={3}
            maxLength={4000}
            defaultValue={track?.description ?? ""}
            className={fieldClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="track-image" className={labelClass}>
            Image
          </label>
          <input
            id="track-image"
            name="image"
            type="file"
            accept="image/*"
            className="w-full rounded-lg border border-line-loud bg-paper px-3 py-2 text-sm text-ink file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-ink"
          />
          {track?.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={track.imageUrl} alt="" className="h-16 w-16 rounded-lg object-cover" />
          ) : null}
        </div>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" name="isCtf" value="true" defaultChecked={isCtf} />
          This is a CTF
        </label>
      </Section>

      <Section title="Team and pricing">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="track-min" className={labelClass}>
              Minimum team size
            </label>
            <input
              id="track-min"
              name="minTeamSize"
              type="number"
              min={1}
              max={20}
              defaultValue={track?.minTeamSize ?? 1}
              className={`${fieldClass} tabular-nums`}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="track-max" className={labelClass}>
              Maximum team size
            </label>
            <input
              id="track-max"
              name="maxTeamSize"
              type="number"
              min={1}
              max={20}
              defaultValue={track?.maxTeamSize ?? 4}
              className={`${fieldClass} tabular-nums`}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="track-fee" className={labelClass}>
              Entry fee per team
            </label>
            <input
              id="track-fee"
              name="fee"
              type="number"
              min={0}
              step="1"
              defaultValue={track?.fee ?? 0}
              className={`${fieldClass} tabular-nums`}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="track-sponsor" className={labelClass}>
              Dedicated sponsor
            </label>
            <select
              id="track-sponsor"
              name="sponsorOrgId"
              defaultValue={currentSponsorId}
              className={fieldClass}
            >
              <option value="">No dedicated sponsor</option>
              {sponsors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.tier ? ` — ${s.tier}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="track-discount" className={labelClass}>
              Discount %
            </label>
            <input
              id="track-discount"
              name="discountPercent"
              type="number"
              min={0}
              max={100}
              defaultValue={track?.discountPercent ?? 0}
              className={`${fieldClass} tabular-nums`}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="track-discount-expires" className={labelClass}>
              Discount expires
            </label>
            <DateField
              id="track-discount-expires"
              name="discountExpiresAt"
              defaultValue={toIsoDate(track?.discountExpiresAt)}
              className={fieldClass}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="track-discount-note" className={labelClass}>
            Discount note
          </label>
          <input
            id="track-discount-note"
            name="discountNote"
            maxLength={500}
            defaultValue={track?.discountNote ?? ""}
            className={fieldClass}
          />
        </div>
      </Section>

      <Section title="Prizes">
        <PrizeListFields initial={prizes} />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="track-prize-notes" className={labelClass}>
            Additional prize notes
          </label>
          <textarea
            id="track-prize-notes"
            name="prizePool"
            rows={2}
            maxLength={2000}
            defaultValue={track?.prizePool ?? ""}
            placeholder="Anything that does not fit a position / amount pair."
            className={fieldClass}
          />
        </div>
      </Section>

      <Section title="Rules & instructions">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="track-instructions" className={labelClass}>
            Rules and instructions{" "}
            <span className="normal-case text-ink-faint">(shown to participants)</span>
          </label>
          <textarea
            id="track-instructions"
            name="instructions"
            rows={8}
            defaultValue={
              track?.instructions?.trim()
                ? track.instructions
                : track?.rulesText
                  ? track.rulesText
                  : ""
            }
            placeholder="Rules, instructions, scoring notes, links…"
            className={fieldClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="track-instructions-file" className={labelClass}>
            Attachment <span className="normal-case text-ink-faint">(optional)</span>
          </label>
          <input
            id="track-instructions-file"
            name="instructionsFile"
            type="file"
            accept=".pdf,.ppt,.pptx,.doc,.docx,image/*,application/pdf"
            className="w-full rounded-lg border border-line-loud bg-paper px-3 py-2 text-sm text-ink file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-ink"
          />
          {track?.instructionsFileName || track?.rulesName ? (
            <p className="text-xs text-ink-soft">
              Currently{" "}
              <span className="text-ink">{track.instructionsFileName || track.rulesName}</span>.
            </p>
          ) : null}
        </div>
      </Section>

      <Section title="Registration closes">
        <DateTimeField
          id="track-reg-closes"
          name="registrationClosesAt"
          label="Optional date and time"
          defaultIso={track?.registrationClosesAt}
          timeZone={tz}
        />
        <p className="text-xs text-ink-soft">
          If blank, the event registration close date applies. When registration closes, team
          rosters lock automatically (you can still unlock a single team). Participant work windows
          are controlled by Phases.
        </p>
      </Section>

      <div className="flex items-center gap-2 border-t border-line pt-5">
        <SubmitButton pendingText="Saving…" className={buttonClass("primary")}>
          {editing ? "Save changes" : "Add competition"}
        </SubmitButton>
        {onCancel ? (
          <button type="button" onClick={onCancel} className={buttonClass("secondary")}>
            Cancel
          </button>
        ) : editing ? (
          <Link href={cancelHref} className={buttonClass("secondary")}>
            Cancel
          </Link>
        ) : null}
      </div>
    </form>
  );
}
