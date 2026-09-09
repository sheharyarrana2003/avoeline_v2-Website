"use client";

import { useActionState, useState } from "react";
import { Flag } from "lucide-react";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import type { ActionResult } from "@/src/lib/action";
import { REPORT_REASONS } from "../types";

/**
 * Spec 9.4's "events reported by users".
 *
 * Collapsed behind a quiet link, because on a page whose job is to sell an
 * event a permanent report form reads as a warning about it. Open only when
 * somebody has decided to complain.
 *
 * The reason comes from a fixed list so the admin queue groups rather than
 * filling with free text; the email is optional because insisting on one would
 * mean the people most worth hearing from stay quiet.
 */
export function ReportEvent({
    action,
}: {
    action: (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;
}) {
    const [open, setOpen] = useState(false);
    const [state, formAction] = useActionState<ActionResult | null, FormData>(action, null);

    if (state?.success) {
        return (
            <p className="text-xs text-ink-soft">
                Thank you — an administrator will look at this event.
            </p>
        );
    }

    if (!open) {
        return (
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs text-ink-soft hover:text-ink"
            >
                <Flag size={12} aria-hidden="true" />
                Report this event
            </button>
        );
    }

    return (
        <form action={formAction} className="flex flex-col gap-3 rounded-lg border border-line bg-paper p-4">
            <p className="text-sm font-medium text-ink">Report this event</p>
            {state?.error ? <FormFeedback error={state.error} /> : null}

            <div className="flex flex-col gap-1.5">
                <label htmlFor="report-reason" className={labelClass}>What is wrong with it?</label>
                <select id="report-reason" name="reason" required defaultValue="" className={fieldClass}>
                    <option value="" disabled>
                        Choose a reason…
                    </option>
                    {REPORT_REASONS.map((reason) => (
                        <option key={reason} value={reason}>
                            {reason}
                        </option>
                    ))}
                </select>
            </div>

            <div className="flex flex-col gap-1.5">
                <label htmlFor="report-detail" className={labelClass}>
                    Anything else <span className="normal-case text-ink-faint">(optional)</span>
                </label>
                <textarea id="report-detail" name="detail" rows={2} maxLength={1000} className={fieldClass} />
            </div>

            <div className="flex flex-col gap-1.5">
                <label htmlFor="report-email" className={labelClass}>
                    Your email <span className="normal-case text-ink-faint">(optional)</span>
                </label>
                <input id="report-email" name="reporterEmail" type="email" className={fieldClass} />
            </div>

            <div className="flex items-center gap-2">
                <SubmitButton pendingText="Sending…" className={buttonClass("secondary", "sm")}>
                    Send report
                </SubmitButton>
                <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="text-xs text-ink-soft hover:text-ink"
                >
                    Cancel
                </button>
            </div>
        </form>
    );
}
