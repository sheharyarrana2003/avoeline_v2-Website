"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import type { ActionResult } from "@/src/lib/action";
import { SkillPicker } from "./SkillPicker";

type Action = (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;

/**
 * The two ways into a team (spec 3.2): start one and share the code, or enter a
 * code somebody shared.
 *
 * Two separate `useActionState` forms rather than one, so a refusal from the
 * join attempt does not clear what was typed into the create form.
 */
export function CreateOrJoinTeam({
    trackId,
    trackName,
    create,
    join,
    maxTeamSize,
}: {
    trackId: string;
    trackName: string;
    create: Action;
    join: Action;
    maxTeamSize: number;
}) {
    const [createState, createAction] = useActionState<ActionResult | null, FormData>(create, null);
    const [joinState, joinAction] = useActionState<ActionResult | null, FormData>(join, null);

    return (
        <div className="grid gap-8 sm:grid-cols-2">
            <form action={createAction} className="flex flex-col gap-4">
                <input type="hidden" name="trackId" value={trackId} />
                <div>
                    <h3 className="text-sm font-semibold text-ink">Start a team</h3>
                    <p className="text-xs text-ink-soft">
                        You will get a join code to share. Up to {maxTeamSize}{" "}
                        {maxTeamSize === 1 ? "person" : "people"} on {trackName}.
                    </p>
                </div>
                {createState?.error ? <FormFeedback error={createState.error} /> : null}

                <div className="flex flex-col gap-1.5">
                    <label htmlFor="team-name" className={labelClass}>Team name</label>
                    <input
                        id="team-name"
                        name="name"
                        required
                        maxLength={80}
                        placeholder="Night Shift"
                        className={fieldClass}
                    />
                </div>

                <div className="flex flex-col gap-2">
                    <span className={labelClass}>Your skills</span>
                    <SkillPicker selected={[]} idPrefix="create-skill" />
                    <p className="text-xs text-ink-soft">
                        Shown to people looking for a team, so they can see what you bring.
                    </p>
                </div>

                <SubmitButton pendingText="Creating…" className={buttonClass("primary")}>
                    Create team
                </SubmitButton>
            </form>

            <form action={joinAction} className="flex flex-col gap-4 border-t border-line pt-8 sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0">
                <div>
                    <h3 className="text-sm font-semibold text-ink">Join a team</h3>
                    <p className="text-xs text-ink-soft">Enter the code a teammate gave you.</p>
                </div>
                {joinState?.error ? <FormFeedback error={joinState.error} /> : null}

                <div className="flex flex-col gap-1.5">
                    <label htmlFor="join-code" className={labelClass}>Join code</label>
                    <input
                        id="join-code"
                        name="joinCode"
                        required
                        maxLength={12}
                        autoCapitalize="characters"
                        placeholder="H4KT9M"
                        // Upper-cased for the eye; the server normalizes anyway,
                        // so a lower-case paste still works.
                        className={`${fieldClass} font-mono uppercase tracking-widest`}
                    />
                </div>

                <div className="flex flex-col gap-2">
                    <span className={labelClass}>Your skills</span>
                    <SkillPicker selected={[]} idPrefix="join-skill" />
                </div>

                <SubmitButton pendingText="Joining…" className={buttonClass("secondary")}>
                    Join team
                </SubmitButton>
            </form>
        </div>
    );
}
