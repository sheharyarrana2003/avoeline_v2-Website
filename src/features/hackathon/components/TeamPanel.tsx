"use client";

import { useActionState } from "react";
import { Lock, Users } from "lucide-react";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { ConfirmSubmit } from "@/src/shared_components/ui/ConfirmDialog";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { buttonClass, labelClass } from "@/src/lib/ui";
import type { ActionResult } from "@/src/lib/action";
import { rosterProgress, type HackathonTeam } from "../types";
import { SkillPicker } from "./SkillPicker";

/**
 * The participant's own team: who is on it, the code to share, their skills,
 * whether they are still looking, and the way out.
 *
 * The roster lock is enforced server-side; here it only decides what is offered,
 * so a locked team does not show a Leave button it cannot use. Skills and
 * "looking for members" stay editable while locked -- describing yourself is not
 * a roster change.
 */
export function TeamPanel({
    team,
    registrationId,
    locked,
    updatePrefs,
    leave,
}: {
    team: HackathonTeam;
    registrationId: string;
    locked: boolean;
    updatePrefs: (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;
    leave: (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;
}) {
    const [prefsState, prefsAction] = useActionState<ActionResult | null, FormData>(updatePrefs, null);
    // Leaving can be refused -- a locked roster, or a stale page -- so it needs
    // somewhere to say so rather than appearing to do nothing.
    const [leaveState, leaveAction] = useActionState<ActionResult | null, FormData>(leave, null);
    const me = team.members.find((m) => m.registrationId === registrationId);
    const progress = rosterProgress(team);

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h3 className="font-display text-lg text-ink">{team.name}</h3>
                    <p className="text-xs text-ink-soft">
                        {progress.label}
                        {team.lookingForMembers && progress.hasRoom ? " · still looking" : ""}
                    </p>
                </div>
                <div className="text-right">
                    <p className={labelClass}>Join code</p>
                    <p className="font-mono text-xl tracking-widest text-ink">{team.joinCode}</p>
                    <p className="text-xs text-ink-soft">Share this with your teammates.</p>
                </div>
            </div>

            {locked ? (
                <p className="flex items-start gap-2 rounded-lg border border-line bg-muted px-3 py-2.5 text-xs text-ink-soft">
                    <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span>
                        This roster is locked. Ask the organiser to unlock your team if somebody needs to join
                        or leave.
                    </span>
                </p>
            ) : null}

            <div>
                <p className={labelClass}>Members</p>
                <ul className="mt-2 divide-y divide-line border-y border-line">
                    {team.members.map((m) => (
                        <li key={m.registrationId} className="flex flex-wrap items-baseline justify-between gap-2 py-2.5">
                            <span className="text-sm text-ink">
                                {m.name}
                                {m.registrationId === registrationId ? (
                                    <span className="text-ink-soft"> · you</span>
                                ) : null}
                                {m.isOwner ? <span className="text-ink-soft"> · started the team</span> : null}
                            </span>
                            <span className="text-2xs uppercase text-ink-faint">
                                {m.skills.length ? m.skills.join(" · ") : "no skills listed"}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>

            <form action={prefsAction} className="flex flex-col gap-3">
                <input type="hidden" name="teamId" value={team.id} />
                {prefsState?.error ? <FormFeedback error={prefsState.error} /> : null}
                {prefsState?.success ? <FormFeedback success="Saved." /> : null}

                <span className={labelClass}>Your skills</span>
                <SkillPicker selected={me?.skills ?? []} idPrefix="my-skill" />

                {progress.hasRoom ? (
                    <label className="mt-1 flex items-start gap-2.5 text-sm text-ink">
                        <input
                            type="checkbox"
                            name="lookingForMembers"
                            value="true"
                            defaultChecked={team.lookingForMembers}
                            className="mt-0.5 h-4 w-4 shrink-0 accent-current"
                        />
                        <span>
                            List this team as looking for members
                            <span className="block text-xs text-ink-soft">
                                People without a team will see you, with the skills you still need.
                            </span>
                        </span>
                    </label>
                ) : (
                    <p className="flex items-center gap-2 text-xs text-ink-soft">
                        <Users className="h-3.5 w-3.5" aria-hidden="true" />
                        Your team is full, so it is no longer listed as looking.
                    </p>
                )}

                <div>
                    <SubmitButton pendingText="Saving…" className={buttonClass("secondary", "sm")}>
                        Save
                    </SubmitButton>
                </div>
            </form>

            {!locked ? (
                <form action={leaveAction} className="flex flex-col gap-2 border-t border-line pt-4">
                    <input type="hidden" name="teamId" value={team.id} />
                    {leaveState?.error ? <FormFeedback error={leaveState.error} /> : null}
                    <ConfirmSubmit
                        tone="danger"
                        title={`Leave ${team.name}?`}
                        description={
                            team.members.length === 1
                                ? "You are the only member, so the team is removed with you. Its join code stops working."
                                : "You can rejoin with the team's code while the roster is open."
                        }
                        confirmLabel="Leave team"
                        className={buttonClass("destructive", "sm")}
                    >
                        Leave team
                    </ConfirmSubmit>
                </form>
            ) : null}
        </div>
    );
}

/** A team's fee state, shown to its own members. */
export function TeamFeePanel({
    team,
    feeLabel,
    uploadProof,
}: {
    team: HackathonTeam;
    feeLabel: string;
    uploadProof: (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;
}) {
    const [state, action] = useActionState<ActionResult | null, FormData>(uploadProof, null);

    return (
        <form action={action} className="flex flex-col gap-3">
            <input type="hidden" name="teamId" value={team.id} />
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className={labelClass}>Entry fee</p>
                    <p className="text-sm text-ink">{feeLabel} per team</p>
                </div>
                <StatusBadge status={team.feeStatus} size="sm" />
            </div>

            {state?.error ? <FormFeedback error={state.error} /> : null}
            {state?.success ? <FormFeedback success="Uploaded. The organiser will confirm it." /> : null}

            {team.feeStatus === "fee_paid" ? (
                <p className="text-xs text-ink-soft">
                    The organiser has confirmed your fee, so your track submission is open.
                </p>
            ) : (
                <>
                    <p className="text-xs text-ink-soft">
                        Transfer the fee, then upload a screenshot. The organiser confirms it, and your
                        submission opens once they have.
                        {team.feeProofPath ? " A screenshot is already on file." : ""}
                    </p>
                    <input
                        name="proof"
                        type="file"
                        accept="image/*"
                        className="w-full rounded-lg border border-line-loud bg-paper px-3 py-2 text-sm text-ink file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-ink"
                    />
                    <div>
                        <SubmitButton pendingText="Uploading…" className={buttonClass("secondary", "sm")}>
                            {team.feeProofPath ? "Replace screenshot" : "Upload screenshot"}
                        </SubmitButton>
                    </div>
                </>
            )}
        </form>
    );
}
