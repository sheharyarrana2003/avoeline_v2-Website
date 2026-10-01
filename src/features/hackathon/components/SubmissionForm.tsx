"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import type { ActionResult } from "@/src/lib/action";
import type { TeamSubmission } from "../types";

/**
 * Spec 3.3's submission form: repository link, pitch deck, demo video and a
 * description.
 *
 * Editable until the deadline, and the first save is what counts as submitted --
 * `submittedAt` is set once and kept, so a team polishing its description does
 * not look like it handed in late.
 */
export function SubmissionForm({
    teamId,
    submission,
    action,
    closed,
    blockedByFee,
}: {
    teamId: string;
    submission: TeamSubmission;
    action: (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;
    closed: boolean;
    blockedByFee: boolean;
}) {
    const [state, formAction] = useActionState<ActionResult | null, FormData>(action, null);

    if (closed) {
        return (
            <p className="rounded-lg border border-line bg-muted px-3 py-2.5 text-sm text-ink-soft">
                The submission deadline for this track has passed.
                {submission.submittedAt ? " Your entry was received." : " Nothing was submitted."}
            </p>
        );
    }

    if (blockedByFee) {
        return (
            <p className="rounded-lg border border-line bg-muted px-3 py-2.5 text-sm text-ink-soft">
                Your submission opens once the organiser confirms this track&apos;s entry fee for your team.
            </p>
        );
    }

    return (
        <form action={formAction} className="flex flex-col gap-5">
            <input type="hidden" name="teamId" value={teamId} />

            {state?.error ? <FormFeedback error={state.error} /> : null}
            {state?.success ? <FormFeedback success="Submission saved. You can keep editing it until the deadline." /> : null}

            <div className="flex flex-col gap-1.5">
                <label htmlFor="sub-repo" className={labelClass}>Repository link</label>
                <input
                    id="sub-repo"
                    name="repoUrl"
                    type="url"
                    inputMode="url"
                    maxLength={500}
                    defaultValue={submission.repoUrl}
                    placeholder="https://github.com/your-team/project"
                    className={fieldClass}
                />
            </div>

            <div className="flex flex-col gap-1.5">
                <label htmlFor="sub-video" className={labelClass}>Demo video link</label>
                <input
                    id="sub-video"
                    name="demoVideoUrl"
                    type="url"
                    inputMode="url"
                    maxLength={500}
                    defaultValue={submission.demoVideoUrl}
                    placeholder="https://youtu.be/…"
                    className={fieldClass}
                />
            </div>

            <div className="flex flex-col gap-1.5">
                <label htmlFor="sub-deck" className={labelClass}>
                    Pitch deck <span className="normal-case text-ink-faint">(PDF or slides)</span>
                </label>
                <input
                    id="sub-deck"
                    name="deck"
                    type="file"
                    accept=".pdf,.ppt,.pptx,.key,application/pdf"
                    className="w-full rounded-lg border border-line-loud bg-paper px-3 py-2 text-sm text-ink file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-ink"
                />
                {submission.deckName ? (
                    <p className="text-xs text-ink-soft">
                        Currently <span className="text-ink">{submission.deckName}</span>. Choosing a new file
                        replaces it.
                    </p>
                ) : null}
            </div>

            <div className="flex flex-col gap-1.5">
                <label htmlFor="sub-description" className={labelClass}>What you built</label>
                <textarea
                    id="sub-description"
                    name="description"
                    rows={5}
                    maxLength={4000}
                    defaultValue={submission.description}
                    placeholder="What it does, how it works, and what you would do next."
                    className={fieldClass}
                />
            </div>

            <div>
                <SubmitButton pendingText="Saving…" className={buttonClass("primary")}>
                    {submission.submittedAt ? "Update submission" : "Submit project"}
                </SubmitButton>
            </div>
        </form>
    );
}
