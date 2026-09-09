"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { ConfirmSubmit } from "@/src/shared_components/ui/ConfirmDialog";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import type { ActionResult } from "@/src/lib/action";

type Action = (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;

/**
 * One decision plus the reason it is logged with.
 *
 * Shared by organizer suspension, event moderation and vendor decisions,
 * because the spec asks for a logged reason on the middle one and the other two
 * are exactly as consequential. The reason field is required by the action, not
 * by the browser, so a hand-made POST cannot skip it either.
 */
export function ModerationForm({
    action,
    hidden,
    reasonLabel,
    reasonPlaceholder,
    confirmTitle,
    confirmDescription,
    confirmLabel,
    submitLabel,
    tone = "danger",
    requiresReason = true,
    successMessage,
}: {
    action: Action;
    hidden: Record<string, string>;
    reasonLabel?: string;
    reasonPlaceholder?: string;
    confirmTitle: string;
    confirmDescription: string;
    confirmLabel: string;
    submitLabel: string;
    tone?: "danger" | "default";
    requiresReason?: boolean;
    successMessage?: string;
}) {
    const [state, formAction] = useActionState<ActionResult | null, FormData>(action, null);

    return (
        <form action={formAction} className="flex flex-col gap-3">
            {Object.entries(hidden).map(([name, value]) => (
                <input key={name} type="hidden" name={name} value={value} />
            ))}

            {state?.error ? <FormFeedback error={state.error} /> : null}
            {state?.success ? <FormFeedback success={successMessage ?? "Done."} /> : null}

            {requiresReason ? (
                <div className="flex flex-col gap-1.5">
                    <label className={labelClass}>{reasonLabel ?? "Reason"}</label>
                    <textarea
                        name="reason"
                        rows={2}
                        maxLength={2000}
                        placeholder={reasonPlaceholder}
                        className={fieldClass}
                    />
                    <p className="text-xs text-ink-soft">
                        Recorded in the moderation log with your name, and sent to them.
                    </p>
                </div>
            ) : null}

            <div>
                <ConfirmSubmit
                    tone={tone}
                    title={confirmTitle}
                    description={confirmDescription}
                    confirmLabel={confirmLabel}
                    className={buttonClass(tone === "danger" ? "destructive" : "secondary", "sm")}
                >
                    {submitLabel}
                </ConfirmSubmit>
            </div>
        </form>
    );
}

/** A one-click state change with no reason: reactivating, or a status flip. */
export function QuickAction({
    action,
    hidden,
    label,
    className,
}: {
    action: Action;
    hidden: Record<string, string>;
    label: string;
    className?: string;
}) {
    const [state, formAction] = useActionState<ActionResult | null, FormData>(action, null);

    return (
        <form action={formAction} className="flex flex-col gap-1">
            {Object.entries(hidden).map(([name, value]) => (
                <input key={name} type="hidden" name={name} value={value} />
            ))}
            {state?.error ? <FormFeedback error={state.error} /> : null}
            <SubmitButton
                pendingText="Saving…"
                className={className ?? "text-2xs uppercase text-ink-faint hover:text-ink"}
            >
                {label}
            </SubmitButton>
        </form>
    );
}
