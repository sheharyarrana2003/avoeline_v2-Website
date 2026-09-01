import { Lock } from "lucide-react";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";

/**
 * The access-code form for a private event.
 *
 * Rendered *instead of* the event, never alongside it: the page must not leak
 * the title, date or venue of something the visitor has not been let into. It
 * says only that a code is needed.
 *
 * A plain GET form, so the code comes back as `?code=` and the page re-resolves
 * access on the next render. No action, no client component, and the resulting
 * URL is shareable with the code in it -- which is the point, since the code is
 * the credential and the organizer hands it out anyway.
 */
export function AccessGate({
    eventId,
    inviteToken,
    wrongCode,
}: {
    eventId: string;
    inviteToken: string | null;
    wrongCode: boolean;
}) {
    return (
        <div className="rounded-2xl border border-line bg-paper p-6">
            <div className="mb-4 flex items-center gap-2">
                <Lock size={18} className="text-ink-faint" aria-hidden="true" />
                <h1 className="font-display text-lg text-ink">This event is private</h1>
            </div>
            <p className="mb-5 text-sm text-ink-soft">
                Enter the access code the organizer gave you to see the event and register.
            </p>

            {wrongCode ? <FormFeedback error="That access code is not right." className="mb-4" /> : null}

            <form method="get" action={`/events/${eventId}`} className="flex flex-col gap-4">
                {/* Preserved, or following a private invite link and then entering a
                    code would drop the invite and lose the tier it carries. */}
                {inviteToken ? <input type="hidden" name="invite" value={inviteToken} /> : null}

                <div className="flex flex-col gap-1.5">
                    <label htmlFor="access-code" className={labelClass}>Access code</label>
                    <input
                        id="access-code"
                        name="code"
                        type="text"
                        required
                        autoComplete="off"
                        autoCapitalize="none"
                        spellCheck={false}
                        className={fieldClass}
                    />
                </div>

                <button type="submit" className={buttonClass("primary", "lg", "w-full")}>
                    Continue
                </button>
            </form>
        </div>
    );
}
