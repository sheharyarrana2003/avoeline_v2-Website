"use client";

import { useActionState } from "react";
import { registerAttendeeAction } from "../actions/registerAttendee.action";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { ActionResult } from "@/src/lib/action";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import type { CustomFieldOption } from "@/src/services/models/event.model";

export interface RegistrationFormProps {
    eventId: string;
    /** Drives the copy on the button and the note beneath it. */
    isPaid: boolean;
    priceLabel: string;
    /** Carried through from `?invite=` so the action can re-check the invite. */
    inviteToken?: string | null;
    /** Carried through from `?code=` for the same reason. */
    accessCode?: string | null;
    /** True when the event is full and the waitlist is what registering joins. */
    joinsWaitlist?: boolean;
    /** True when the organizer vets registrations before confirming them. */
    needsApproval?: boolean;
    /**
     * Tiers the attendee may pick from. Empty unless the event allows
     * self-selection, and already filtered to exclude gated tiers they have not
     * unlocked -- the server re-checks both, this only avoids offering a choice
     * that would be refused.
     */
    tierChoices?: string[];
    /**
     * The event's own registration questions. Written by the wizard's step 3 for
     * a long time and rendered nowhere, so every event that defined them
     * collected nothing.
     */
    customFields?: CustomFieldOption[];
}

/**
 * One organizer-defined question.
 *
 * Uncontrolled and name-based, unlike `CategoryStep`'s controlled equivalent:
 * this form is a plain `<form action={}>` and the answers are read off the
 * FormData by `readAnswers`, which keys on `custom_<fieldId>`. Nothing here
 * holds state, so there is nothing to reset -- which is the whole reason the
 * two are not one component.
 */
function CustomQuestion({ field }: { field: CustomFieldOption }) {
    const id = `custom-${field.fieldId}`;
    const name = `custom_${field.fieldId}`;

    if (field.type === "checkbox") {
        return (
            <label htmlFor={id} className="flex items-start gap-2.5 text-sm text-ink">
                {/* No `required` on a checkbox even when the question is: the browser
                    would demand a tick, and the honest answer is often no. The server
                    treats an unticked required box as answered. */}
                <input id={id} name={name} type="checkbox" value="yes" className="mt-0.5 h-4 w-4 shrink-0 accent-current" />
                <span>{field.label}</span>
            </label>
        );
    }

    return (
        <div className="flex flex-col gap-1.5">
            <label htmlFor={id} className={labelClass}>
                {field.label}
                {field.required ? " *" : ""}
            </label>
            {field.type === "dropdown" ? (
                <select id={id} name={name} required={field.required} defaultValue="" className={fieldClass}>
                    <option value="">Select…</option>
                    {field.options.map((o) => (
                        <option key={o} value={o}>{o}</option>
                    ))}
                </select>
            ) : (
                <input
                    id={id}
                    name={name}
                    type={field.type === "number" ? "number" : "text"}
                    inputMode={field.type === "number" ? "numeric" : undefined}
                    min={field.type === "number" ? 0 : undefined}
                    maxLength={field.type === "number" ? undefined : 500}
                    required={field.required}
                    className={`${fieldClass}${field.type === "number" ? " tabular-nums" : ""}`}
                />
            )}
        </div>
    );
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
export function RegistrationForm({
    eventId,
    isPaid,
    priceLabel,
    inviteToken = null,
    accessCode = null,
    tierChoices = [],
    joinsWaitlist = false,
    needsApproval = false,
    customFields = [],
}: RegistrationFormProps) {
    const boundAction = registerAttendeeAction.bind(null, eventId);
    const [state, formAction] = useActionState<ActionResult | null, FormData>(boundAction, null);

    return (
        <form action={formAction} className="flex flex-col gap-5">
            {/* The credentials the page was reached with. Hidden inputs rather than
                bound arguments so they survive a re-render, and re-verified server
                side -- they prove nothing on their own. */}
            {inviteToken ? <input type="hidden" name="inviteToken" value={inviteToken} /> : null}
            {accessCode ? <input type="hidden" name="accessCode" value={accessCode} /> : null}

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

            {tierChoices.length > 1 ? (
                <div className="flex flex-col gap-1.5">
                    <label htmlFor="reg-tier" className={labelClass}>Ticket type</label>
                    <select id="reg-tier" name="tier" defaultValue={tierChoices[0]} className={fieldClass}>
                        {tierChoices.map((t) => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                </div>
            ) : null}

            {customFields.length ? (
                <div className="flex flex-col gap-5 border-t border-line pt-5">
                    <p className={labelClass}>A few questions from the organiser</p>
                    {customFields.map((field) => (
                        <CustomQuestion key={field.fieldId} field={field} />
                    ))}
                </div>
            ) : null}

            {isPaid ? (
                <div className="flex flex-col gap-1.5 border-t border-line pt-5">
                    <label htmlFor="reg-proof" className={labelClass}>
                        Payment screenshot <span className="normal-case text-ink-faint">(optional)</span>
                    </label>
                    <input
                        id="reg-proof"
                        name="paymentProof"
                        type="file"
                        // Images only, and the camera offered first: on a phone this is
                        // almost always a screenshot or a photo of a receipt.
                        accept="image/*"
                        className="w-full rounded-lg border border-line-loud bg-paper px-3 py-2 text-sm text-ink file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-ink focus:border-ink focus:outline-2 focus:outline-offset-2 focus:outline-ink"
                    />
                    <p className="text-xs text-ink-soft">
                        Upload proof of your transfer and the organiser will verify it. You can also
                        register now and send it later.
                    </p>
                </div>
            ) : null}

            <SubmitButton pendingText="Registering…" className={buttonClass("primary", "lg", "w-full")}>
                {joinsWaitlist ? "Join the waitlist" : isPaid ? `Register — ${priceLabel}` : "Register for free"}
            </SubmitButton>

            {/* Ordered by what actually decides the outcome. The waitlist wins
                because a full event grants no place at all, so promising one --
                which this said unconditionally for any free event -- is wrong
                before payment or approval even come into it. */}
            <p className="text-xs text-ink-soft">
                {joinsWaitlist
                    ? "This event is full. You will join the waitlist and be emailed if a place frees up."
                    : isPaid
                      ? "Your place is held once the organiser confirms your payment."
                      : needsApproval
                        ? "The organiser reviews registrations for this event, and will email you once they decide."
                        : "Your place is confirmed as soon as you register."}
            </p>
        </form>
    );
}

export default RegistrationForm;
