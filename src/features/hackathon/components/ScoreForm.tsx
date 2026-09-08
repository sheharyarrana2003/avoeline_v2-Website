"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import type { ActionResult } from "@/src/lib/action";
import type { RubricCategory } from "../types";
import type { JudgeScore } from "../judging";

/**
 * One judge's card for one team (spec 3.3's scoring interface).
 *
 * A number input per rubric category with its own maximum, and the total is
 * deliberately NOT computed here: the server recomputes it from the rubric,
 * because the total is what decides who wins and a number posted from a form
 * cannot be the one that counts. The running figure shown while typing would
 * only be decoration, so it is left out rather than implied.
 */
export function ScoreForm({
    teamId,
    teamName,
    rubric,
    existing,
    action,
}: {
    teamId: string;
    teamName: string;
    rubric: RubricCategory[];
    existing: JudgeScore | null;
    action: (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;
}) {
    const [state, formAction] = useActionState<ActionResult | null, FormData>(action, null);

    return (
        <form action={formAction} className="flex flex-col gap-4">
            <input type="hidden" name="teamId" value={teamId} />

            {state?.error ? <FormFeedback error={state.error} /> : null}
            {state?.success ? <FormFeedback success={`Score saved for ${teamName}.`} /> : null}

            <div className="grid gap-4 sm:grid-cols-2">
                {rubric.map((category) => (
                    <div key={category.id} className="flex flex-col gap-1.5">
                        <label htmlFor={`${teamId}-${category.id}`} className={labelClass}>
                            {category.label}
                            <span className="ml-1 normal-case text-ink-faint">out of {category.maxScore}</span>
                        </label>
                        <input
                            id={`${teamId}-${category.id}`}
                            name={`score-${category.id}`}
                            type="number"
                            min={0}
                            max={category.maxScore}
                            step={1}
                            inputMode="numeric"
                            defaultValue={existing?.byCategory?.[category.id] ?? ""}
                            placeholder="0"
                            className={`${fieldClass} tabular-nums`}
                        />
                    </div>
                ))}
            </div>

            <div className="flex flex-col gap-1.5">
                <label htmlFor={`${teamId}-comment`} className={labelClass}>
                    Comment <span className="normal-case text-ink-faint">(optional)</span>
                </label>
                <textarea
                    id={`${teamId}-comment`}
                    name="comment"
                    rows={2}
                    maxLength={2000}
                    defaultValue={existing?.comment ?? ""}
                    placeholder="What stood out, and what held it back."
                    className={fieldClass}
                />
            </div>

            <div className="flex items-center gap-3">
                <SubmitButton pendingText="Saving…" className={buttonClass("primary", "sm")}>
                    {existing ? "Update score" : "Save score"}
                </SubmitButton>
                {existing ? (
                    <span className="text-xs text-ink-soft tabular-nums">
                        You scored this {existing.total} so far.
                    </span>
                ) : null}
            </div>
        </form>
    );
}
