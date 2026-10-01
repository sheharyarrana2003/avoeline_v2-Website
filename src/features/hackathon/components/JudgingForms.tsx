"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import type { ActionResult } from "@/src/lib/action";
import { formatRubricLines } from "../judging";
import type { RubricCategory } from "../types";

type Action = (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;

/**
 * Spec 3.3's rubric builder, as one textarea.
 *
 * `Label | max` per line, the same shape module 1 used for admin-defined event
 * fields: no per-row add and remove buttons, no client state, and an organizer
 * can paste a rubric in from wherever they wrote it. The maximum per category
 * is the weight, which is what the spec already describes.
 */
export function RubricForm({
    trackId,
    rubric,
    action,
}: {
    trackId: string;
    rubric: RubricCategory[];
    action: Action;
}) {
    const [state, formAction] = useActionState<ActionResult | null, FormData>(action, null);

    return (
        <form action={formAction} className="flex flex-col gap-3">
            <input type="hidden" name="trackId" value={trackId} />
            {state?.error ? <FormFeedback error={state.error} /> : null}
            {state?.success ? <FormFeedback success="Rubric saved." /> : null}

            <div className="flex flex-col gap-1.5">
                <label htmlFor="rubric" className={labelClass}>Categories and their maximums</label>
                <textarea
                    id="rubric"
                    name="rubric"
                    rows={5}
                    defaultValue={formatRubricLines(rubric)}
                    placeholder={"Innovation | 20\nExecution | 20\nImpact | 10"}
                    className={`${fieldClass} font-mono text-xs`}
                />
                <p className="text-xs text-ink-soft">
                    One per line, as <span className="font-mono">Label | max</span>. The maximum is the weight — a
                    category worth 20 moves the total twice as far as one worth 10. Editing this does not change
                    scores judges have already given.
                </p>
            </div>

            <div>
                <SubmitButton pendingText="Saving…" className={buttonClass("secondary", "sm")}>
                    Save rubric
                </SubmitButton>
            </div>
        </form>
    );
}

/** Spec 3.3: assign judges to specific tracks, by email invite. */
export function JudgeInviteForm({
    tracks,
    action,
}: {
    tracks: { id: string; name: string }[];
    action: Action;
}) {
    const [state, formAction] = useActionState<ActionResult | null, FormData>(action, null);

    return (
        <form action={formAction} className="flex flex-col gap-4">
            {state?.error ? <FormFeedback error={state.error} /> : null}
            {state?.success ? <FormFeedback success="Invited. They have been emailed their scoring link." /> : null}

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                    <label htmlFor="judge-name" className={labelClass}>Name</label>
                    <input id="judge-name" name="name" required maxLength={120} className={fieldClass} />
                </div>
                <div className="flex flex-col gap-1.5">
                    <label htmlFor="judge-email" className={labelClass}>Email</label>
                    <input id="judge-email" name="email" type="email" required className={fieldClass} />
                </div>
            </div>

            <div className="flex flex-col gap-2">
                <span className={labelClass}>Tracks they judge</span>
                {tracks.length ? (
                    <div className="flex flex-wrap gap-2">
                        {tracks.map((track) => (
                            <label
                                key={track.id}
                                htmlFor={`judge-track-${track.id}`}
                                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-line-loud px-3 py-1.5 text-xs text-ink transition hover:border-ink has-checked:border-ink has-checked:bg-ink has-checked:text-ink-invert"
                            >
                                <input
                                    id={`judge-track-${track.id}`}
                                    type="checkbox"
                                    name="trackIds"
                                    value={track.id}
                                    className="sr-only"
                                />
                                {track.name}
                            </label>
                        ))}
                    </div>
                ) : (
                    <p className="text-xs text-ink-soft">Add a track first, then you can assign judges to it.</p>
                )}
                <p className="text-xs text-ink-soft">
                    They get a private link that needs no account. Re-inviting the same address changes their
                    tracks and keeps their existing link working.
                </p>
            </div>

            <div>
                <SubmitButton pendingText="Inviting…" disabled={!tracks.length} className={buttonClass("primary", "sm")}>
                    Invite judge
                </SubmitButton>
            </div>
        </form>
    );
}

/** Spec 3.3's multi-round support: close a round and carry the top teams. */
export function AdvanceRoundForm({
    trackId,
    round,
    teamsInRound,
    action,
}: {
    trackId: string;
    round: number;
    teamsInRound: number;
    action: Action;
}) {
    const [state, formAction] = useActionState<ActionResult | null, FormData>(action, null);

    return (
        <form action={formAction} className="flex flex-col gap-3">
            <input type="hidden" name="trackId" value={trackId} />
            {/* A carried-ties message arrives as `error` alongside success, so it
                reads as a notice rather than a failure. */}
            {state?.error ? <FormFeedback error={state.error} /> : null}
            {state?.success && !state.error ? <FormFeedback success={`Round ${round} closed.`} /> : null}

            <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1.5">
                    <label htmlFor="topN" className={labelClass}>Teams to advance</label>
                    <input
                        id="topN"
                        name="topN"
                        type="number"
                        min={1}
                        max={Math.max(1, teamsInRound)}
                        defaultValue={Math.max(1, Math.min(3, teamsInRound))}
                        className={`${fieldClass} w-28 tabular-nums`}
                    />
                </div>
                <SubmitButton pendingText="Closing…" className={buttonClass("primary", "sm")}>
                    Close round {round}
                </SubmitButton>
            </div>
            <p className="text-xs text-ink-soft">
                The top teams move to round {round + 1} and the rest are marked eliminated. Teams tied on the
                cut-off all advance, rather than the app choosing between them. Only teams a judge has scored can
                advance.
            </p>
        </form>
    );
}
