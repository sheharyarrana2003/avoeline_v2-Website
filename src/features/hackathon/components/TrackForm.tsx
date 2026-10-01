"use client";

import { useActionState } from "react";
import Link from "next/link";
import { DateField } from "@/src/shared_components/DateField";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import { toIsoDate } from "@/src/lib/datetime";
import type { ActionResult } from "@/src/lib/action";
import type { HackathonTrack } from "../types";
import { HACKATHON_KINDS, HACKATHON_KIND_LABELS } from "../kinds";

/** Just enough of a sponsor to offer it in the picker. */
export interface SponsorOption {
    id: string;
    name: string;
    tier: string;
}

/**
 * Add or edit one track (spec 3.1).
 *
 * Dates go in and out as ISO `yyyy-mm-dd` through `DateField` -- `<input
 * type="date">` is banned in this repo because it renders in the OS locale --
 * and are converted with `toIsoDate`, not `toIsoString().slice(0,10)`, which is
 * UTC-based and lands a day early in this timezone.
 */
export function TrackForm({
    action,
    track,
    sponsors,
    currentSponsorId,
    cancelHref,
}: {
    action: (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;
    track: HackathonTrack | null;
    sponsors: SponsorOption[];
    currentSponsorId: string;
    cancelHref: string;
}) {
    const [state, formAction] = useActionState<ActionResult | null, FormData>(action, null);
    const editing = !!track;

    return (
        <form action={formAction} className="flex flex-col gap-5">
            {track ? <input type="hidden" name="trackId" value={track.id} /> : null}

            {state?.error ? <FormFeedback error={state.error} /> : null}
            {state?.success ? <FormFeedback success={editing ? "Track updated." : "Track added."} /> : null}

            <div className="flex flex-col gap-1.5">
                <label htmlFor="track-name" className={labelClass}>Track name</label>
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
                <label htmlFor="track-description" className={labelClass}>Description</label>
                <textarea
                    id="track-description"
                    name="description"
                    rows={3}
                    maxLength={4000}
                    defaultValue={track?.description ?? ""}
                    placeholder="What teams on this track are being asked to build."
                    className={fieldClass}
                />
            </div>

            <div className="flex flex-col gap-1.5">
                <label htmlFor="track-kind" className={labelClass}>Competition type</label>
                <select id="track-kind" name="kind" defaultValue={track?.kind ?? "other"} className={fieldClass}>
                    {HACKATHON_KINDS.map((k) => (
                        <option key={k} value={k}>
                            {HACKATHON_KIND_LABELS[k]}
                        </option>
                    ))}
                </select>
            </div>

            <div className="flex flex-col gap-1.5">
                <label htmlFor="track-rules-text" className={labelClass}>Rules text</label>
                <textarea
                    id="track-rules-text"
                    name="rulesText"
                    rows={6}
                    defaultValue={track?.rulesText ?? ""}
                    placeholder="Paste rules or a brief. You can also upload a file below."
                    className={fieldClass}
                />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                    <label htmlFor="track-min" className={labelClass}>Minimum team size</label>
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
                    <label htmlFor="track-max" className={labelClass}>Maximum team size</label>
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
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                    <label htmlFor="track-deadline" className={labelClass}>Submission deadline</label>
                    <DateField
                        id="track-deadline"
                        name="submissionDeadline"
                        defaultValue={toIsoDate(track?.submissionDeadline)}
                        className={fieldClass}
                    />
                    <p className="text-xs text-ink-soft">Submissions close at the end of this day.</p>
                </div>
                <div className="flex flex-col gap-1.5">
                    <label htmlFor="track-lock" className={labelClass}>Roster locks on</label>
                    <DateField
                        id="track-lock"
                        name="rosterLockDate"
                        defaultValue={toIsoDate(track?.rosterLockDate)}
                        className={fieldClass}
                    />
                    <p className="text-xs text-ink-soft">
                        From the start of this day teams cannot change, unless you unlock one.
                    </p>
                </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                    <label htmlFor="track-fee" className={labelClass}>Entry fee per team</label>
                    <input
                        id="track-fee"
                        name="fee"
                        type="number"
                        min={0}
                        step="1"
                        defaultValue={track?.fee ?? 0}
                        className={`${fieldClass} tabular-nums`}
                    />
                    <p className="text-xs text-ink-soft">
                        0 for a free track. A paid track will not accept a submission until you confirm the fee.
                    </p>
                </div>
                <div className="flex flex-col gap-1.5">
                    <label htmlFor="track-sponsor" className={labelClass}>Dedicated sponsor</label>
                    <select id="track-sponsor" name="sponsorOrgId" defaultValue={currentSponsorId} className={fieldClass}>
                        <option value="">No dedicated sponsor</option>
                        {sponsors.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.name}
                                {s.tier ? ` — ${s.tier}` : ""}
                            </option>
                        ))}
                    </select>
                    <p className="text-xs text-ink-soft">
                        {sponsors.length
                            ? "Shown on this track's page."
                            : "Add a sponsor on the Sponsors tab to offer one here."}
                    </p>
                </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                    <label htmlFor="track-discount" className={labelClass}>Discount %</label>
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
                    <label htmlFor="track-discount-expires" className={labelClass}>Discount expires</label>
                    <DateField
                        id="track-discount-expires"
                        name="discountExpiresAt"
                        defaultValue={toIsoDate(track?.discountExpiresAt)}
                        className={fieldClass}
                    />
                </div>
            </div>
            <div className="flex flex-col gap-1.5">
                <label htmlFor="track-discount-note" className={labelClass}>Discount note</label>
                <input
                    id="track-discount-note"
                    name="discountNote"
                    maxLength={500}
                    defaultValue={track?.discountNote ?? ""}
                    className={fieldClass}
                />
            </div>

            <div className="flex flex-col gap-1.5">
                <label htmlFor="track-image" className={labelClass}>
                    Competition image
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
                    <img src={track.imageUrl} alt="" className="max-w-full h-auto rounded-lg" />
                ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
                <label htmlFor="track-prize" className={labelClass}>Prize pool</label>
                <textarea
                    id="track-prize"
                    name="prizePool"
                    rows={2}
                    maxLength={2000}
                    defaultValue={track?.prizePool ?? ""}
                    placeholder="Rs 150,000 split across the top three teams, plus interview slots."
                    className={fieldClass}
                />
            </div>

            <div className="flex flex-col gap-1.5">
                <label htmlFor="track-rules" className={labelClass}>
                    Rules or problem statement{" "}
                    <span className="normal-case text-ink-faint">(PDF or slides, optional)</span>
                </label>
                <input
                    id="track-rules"
                    name="rules"
                    type="file"
                    accept=".pdf,.ppt,.pptx,.doc,.docx,application/pdf"
                    className="w-full rounded-lg border border-line-loud bg-paper px-3 py-2 text-sm text-ink file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-ink focus:border-ink focus:outline-2 focus:outline-offset-2 focus:outline-ink"
                />
                {track?.rulesName ? (
                    <p className="text-xs text-ink-soft">
                        Currently <span className="text-ink">{track.rulesName}</span>. Choosing a new file replaces it.
                    </p>
                ) : null}
            </div>

            <div className="flex items-center gap-2">
                <SubmitButton pendingText="Saving…" className={buttonClass("primary")}>
                    {editing ? "Save changes" : "Add track"}
                </SubmitButton>
                {editing ? (
                    <Link href={cancelHref} className={buttonClass("secondary")}>
                        Cancel
                    </Link>
                ) : null}
            </div>
        </form>
    );
}
