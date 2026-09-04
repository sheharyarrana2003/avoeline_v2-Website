"use client";

import { useActionState } from "react";
import { CERTIFICATE_DESIGNS } from "@/src/features/certificates/designs";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import type { ActionResult } from "@/src/lib/action";

/**
 * Spec 6.1's selectable designs, as one submit button per design.
 *
 * A client component only because applying a design overwrites the current
 * styling and the organizer needs to be told whether it worked -- the editor
 * below re-renders from the server on success, so a silent action would look
 * like nothing happened.
 *
 * One `<form>` with a submit button per design rather than a select plus an
 * Apply button: the submitter's name and value land in the FormData, so the
 * choice and the confirmation are a single click.
 */
export function DesignPicker({
    apply,
    current,
}: {
    apply: (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;
    /**
     * Body colour of the saved template, used only to show which design it
     * currently resembles. Not authoritative -- an edited template may match
     * none of them, and then nothing is marked.
     */
    current: string;
}) {
    const [state, formAction] = useActionState<ActionResult | null, FormData>(apply, null);

    return (
        <form action={formAction} className="flex flex-col gap-3">
            {state?.error ? <FormFeedback error={state.error} /> : null}
            {state?.success ? <FormFeedback success="Design applied. Everything below is still editable." /> : null}

            <div className="grid gap-3 sm:grid-cols-3">
                {CERTIFICATE_DESIGNS.map((design) => {
                    const looksActive = design.swatch[0].toLowerCase() === String(current ?? "").toLowerCase();
                    return (
                        <SubmitButton
                            key={design.id}
                            name="design"
                            value={design.id}
                            pendingText="Applying…"
                            className={`flex flex-col items-start gap-2 rounded-lg border p-3 text-left transition hover:border-ink disabled:opacity-50 ${
                                looksActive ? "border-ink bg-muted" : "border-line-loud bg-paper"
                            }`}
                        >
                            <span className="flex gap-1" aria-hidden="true">
                                {design.swatch.map((c) => (
                                    <span
                                        key={c}
                                        className="size-4 rounded-full border border-line-loud"
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </span>
                            <span className="text-sm font-semibold text-ink">
                                {design.name}
                                {looksActive ? <span className="font-normal text-ink-soft"> — in use</span> : null}
                            </span>
                            <span className="text-xs font-normal text-ink-soft">{design.description}</span>
                        </SubmitButton>
                    );
                })}
            </div>
        </form>
    );
}
