"use client";

import { useActionState } from "react";
import { registerAttendeeAction } from "../actions/registerAttendee.action";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { ActionResult } from "@/src/lib/action";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";

export interface RegistrationFormProps {
    eventId: string;
    /** Drives the copy on the button and the note beneath it. */
    isPaid: boolean;
    priceLabel: string;
}

/**
 * The public sign-up form.
 *
 * No account, no session -- the three fields here are the whole of what an
 * attendee supplies. Everything that decides money or status (price, tier,
 * organizer, whether the event is even open) is resolved server-side from the
 * event, so nothing here is worth tampering with.
 *
 * On success the action redirects to the ticket, so there is no success branch to
 * render: this component only ever shows the form or an error.
 */
export function RegistrationForm({ eventId, isPaid, priceLabel }: RegistrationFormProps) {
    const boundAction = registerAttendeeAction.bind(null, eventId);
    const [state, formAction] = useActionState<ActionResult | null, FormData>(boundAction, null);

    return (
        <form action={formAction} className="flex flex-col gap-5">
            {state?.error && <FormFeedback error={state.error} />}

            <div className="flex flex-col gap-1.5">
                <label htmlFor="reg-name" className={labelClass}>
                    Full name
                </label>
                <input
                    id="reg-name"
                    name="name"
                    type="text"
                    required
                    maxLength={120}
                    autoComplete="name"
                    placeholder="Ayesha Khan"
                    className={fieldClass}
                />
            </div>

            <div className="flex flex-col gap-1.5">
                <label htmlFor="reg-email" className={labelClass}>
                    Email
                </label>
                <input
                    id="reg-email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    className={fieldClass}
                />
                <p className="text-xs text-ink-soft">
                    Your ticket and QR code are sent here, so check it is right.
                </p>
            </div>

            <div className="flex flex-col gap-1.5">
                <label htmlFor="reg-phone" className={labelClass}>
                    Phone
                </label>
                <input
                    id="reg-phone"
                    name="phone"
                    // `tel`, not `number`: phone numbers carry +, spaces and leading
                    // zeros, all of which a number input destroys.
                    type="tel"
                    required
                    autoComplete="tel"
                    placeholder="+92 300 1234567"
                    className={fieldClass}
                />
            </div>

            <SubmitButton pendingText="Registering…" className={buttonClass("primary", "lg", "w-full")}>
                {isPaid ? `Register — ${priceLabel}` : "Register for free"}
            </SubmitButton>

            <p className="text-xs text-ink-soft">
                {isPaid
                    ? "Your place is held once the organiser confirms your payment."
                    : "Your place is confirmed as soon as you register."}
            </p>
        </form>
    );
}

export default RegistrationForm;
