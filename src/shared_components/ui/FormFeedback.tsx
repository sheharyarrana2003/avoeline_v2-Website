import { Check, TriangleAlert } from "lucide-react";

export type FormFeedbackProps = {
    /** Rendered red. Takes precedence over `success` if both are somehow set. */
    error?: string | null;
    /** Rendered green. */
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
 * polite so they wait their turn. Both carry an icon as well as colour, since
 * colour alone is not a message everyone receives.
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
                    ? "bg-red-50 text-red-800 ring-red-600/20"
                    : "bg-emerald-50 text-emerald-800 ring-emerald-600/20"
            } ${className}`}
        >
            {isError ? (
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
            ) : (
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
            )}
            <span className="leading-snug">{error || success}</span>
        </div>
    );
}

export default FormFeedback;
