import { Check, TriangleAlert } from "lucide-react";

export type FormFeedbackProps = {
    /** Rendered as solid ink. Takes precedence over `success` if both are somehow set. */
    error?: string | null;
    /** Rendered outlined. */
    success?: string | null;
    className?: string;
};

/**
 * The banner that tells someone whether their submit worked.
 *
 * Before this, eight call sites handled `if (res.success)` with no else at all,
 * so a failed upload or a rejected review looked exactly like nothing having
 * happened. Renders nothing when there is nothing to say.
 *
 * Errors are assertive so a screen reader interrupts with them; successes are
 * polite so they wait their turn. Visually the two are separated by weight rather
 * than hue: an error inverts to solid ink because it has to stop you, a success
 * stays on paper with an ink outline. The icon is the third channel, and the
 * assertive/polite split was never a visual channel to begin with.
 */
export function FormFeedback({ error, success, className = "" }: FormFeedbackProps) {
    if (!error && !success) return null;

    const isError = Boolean(error);

    return (
        <div
            role={isError ? "alert" : "status"}
            aria-live={isError ? "assertive" : "polite"}
            className={`flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm font-medium ring-1 ${
                isError
                    ? "bg-danger-soft text-danger ring-danger-line"
                    : "bg-success-soft text-success ring-success-line"
            } ${className}`}
        >
            {isError ? (
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
            ) : (
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
            )}
            <span className="leading-snug">{error || success}</span>
        </div>
    );
}

export default FormFeedback;
