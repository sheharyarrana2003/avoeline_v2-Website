"use client";

import { useActionState, useMemo, useState } from "react";
import { registerAttendeeAction } from "../actions/registerAttendee.action";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { ActionResult } from "@/src/lib/action";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import { formatCurrency } from "@/src/lib/money";
import type { CustomFieldOption } from "@/src/services/models/event.model";
import { HACKATHON_KIND_LABELS, type HackathonKind } from "@/src/features/hackathon/kinds";

export type CompetitionChoice = {
    id: string;
    name: string;
    kind: HackathonKind;
    description: string;
    instructions: string;
    policies: string;
    rulesText: string;
    fee: number;
    due: number;
    currency: string;
    discountPercent: number;
    discountNote: string;
    minTeamSize: number;
    maxTeamSize: number;
    submissionDeadline: string;
    prizePool: string;
    imageUrl: string;
};

export interface RegistrationFormProps {
    eventId: string;
    /** Drives the copy on the button and the note beneath it when there is no competition picker. */
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
    /**
     * Who is signed in, when anybody is. Registering does not need an account,
     * so these are only ever prefilled convenience -- every field stays
     * editable, because the person booking is not always the account holder.
     */
    attendee?: { name?: string; email?: string } | null;
    /** Open competitions on a hackathon. Empty for a regular event. */
    competitions?: CompetitionChoice[];
    groupRegistration?: boolean;
    groupMinSize?: number;
    groupMaxSize?: number;
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
function CustomQuestion({ field, namePrefix = "custom_", idPrefix = "custom" }: { field: CustomFieldOption; namePrefix?: string; idPrefix?: string }) {
    const id = `${idPrefix}-${field.fieldId}`;
    const name = `${namePrefix}${field.fieldId}`;

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

    if (field.type === "checkboxes" || field.type === "radio") {
        return (
            <fieldset className="flex flex-col gap-2">
                <legend className={labelClass}>
                    {field.label}
                    {field.required ? " *" : ""}
                </legend>
                {(field.options ?? []).filter(Boolean).map((option) => (
                    <label key={option} className="flex items-center gap-2.5 text-sm text-ink">
                        <input
                            type={field.type === "radio" ? "radio" : "checkbox"}
                            name={name}
                            value={option}
                            required={field.type === "radio" ? field.required : undefined}
                            className="h-4 w-4 shrink-0 accent-current"
                        />
                        <span>{option}</span>
                    </label>
                ))}
            </fieldset>
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
            ) : field.type === "long_text" ? (
                <textarea id={id} name={name} required={field.required} maxLength={500} rows={4} className={fieldClass} />
            ) : (
                <input
                    id={id}
                    name={name}
                    type={
                        field.type === "number"
                            ? "number"
                            : field.type === "email"
                              ? "email"
                              : field.type === "date"
                                ? "date"
                                : field.type === "file" || field.type === "image"
                                  ? "file"
                                  : "text"
                    }
                    accept={field.type === "image" ? "image/*" : field.type === "file" ? undefined : undefined}
                    inputMode={field.type === "number" ? "numeric" : undefined}
                    min={field.type === "number" ? 0 : undefined}
                    maxLength={field.type === "number" || field.type === "file" || field.type === "image" ? undefined : 500}
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
    attendee = null,
    competitions = [],
    groupRegistration = false,
    groupMinSize = 2,
    groupMaxSize = 8,
}: RegistrationFormProps) {
    const boundAction = registerAttendeeAction.bind(null, eventId);
    const [state, formAction] = useActionState<ActionResult | null, FormData>(boundAction, null);
    const [trackId, setTrackId] = useState(competitions[0]?.id ?? "");
    const [memberSlots, setMemberSlots] = useState<number[]>([]);
    const selected = useMemo(() => competitions.find((c) => c.id === trackId) ?? competitions[0], [competitions, trackId]);
    const due = selected ? selected.due : isPaid ? 1 : 0;
    const paidNow = competitions.length ? due > 0 : isPaid;
    const groupMode = groupRegistration && !competitions.length;
    const maxMembers = groupMode
        ? Math.max(0, groupMaxSize - 1)
        : Math.max(0, (selected?.maxTeamSize ?? 1) - 1);
    const minExtra = groupMode ? Math.max(0, groupMinSize - 1) : 0;
    const groupFields = customFields.filter((f) => f.askOnce === "group");
    const memberFields = customFields.filter((f) => f.askOnce !== "group");
    const amountLabel = selected
        ? selected.due > 0
            ? formatCurrency(selected.due, selected.currency, "Free")
            : "Free"
        : priceLabel;

    return (
        <form action={formAction} className="flex flex-col gap-5" encType="multipart/form-data">
            {inviteToken ? <input type="hidden" name="inviteToken" value={inviteToken} /> : null}
            {accessCode ? <input type="hidden" name="accessCode" value={accessCode} /> : null}

            {state?.error && <FormFeedback error={state.error} />}

            {competitions.length || groupMode ? (
                <div className="flex flex-col gap-1.5">
                    <label htmlFor="team-name" className={labelClass}>
                        {groupMode ? "Group name" : "Team name"}
                    </label>
                    <input id="team-name" name="teamName" type="text" required maxLength={80} placeholder={groupMode ? "Table 4" : "Night Shift"} className={fieldClass} />
                    <input type="hidden" name="memberCount" value={memberSlots.length} />
                    {groupMode ? <input type="hidden" name="groupRegister" value="1" /> : null}
                    <p className="text-xs text-ink-soft">
                        {groupMode
                            ? `Register a group of ${groupMinSize}–${groupMaxSize}. Each person still gets their own ticket.`
                            : `You are registering as team lead. Teams of ${selected?.minTeamSize ?? 1}–${selected?.maxTeamSize ?? 1} for this competition.`}
                    </p>
                </div>
            ) : null}

            {competitions.length ? (
                <fieldset className="flex flex-col gap-3">
                    <legend className={labelClass}>Competition</legend>
                    <p className="text-xs text-ink-soft">
                        Pick the track you are entering. Fees, team size and rules below follow that choice.
                    </p>
                    <div className="flex flex-col gap-2">
                        {competitions.map((c) => {
                            const active = c.id === selected?.id;
                            return (
                                <label
                                    key={c.id}
                                    className={`cursor-pointer rounded-xl border px-3 py-3 ${
                                        active ? "border-ink bg-muted" : "border-line bg-paper"
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="trackId"
                                        value={c.id}
                                        checked={active}
                                        onChange={() => setTrackId(c.id)}
                                        className="sr-only"
                                        required
                                    />
                                    <span className="flex flex-wrap items-baseline justify-between gap-2">
                                        <span className="text-sm font-medium text-ink">{c.name}</span>
                                        <span className="text-xs tabular-nums text-ink-soft">
                                            {c.due > 0 ? formatCurrency(c.due, c.currency, "Free") : "Free"}
                                        </span>
                                    </span>
                                    <span className="mt-0.5 block text-2xs uppercase text-ink-faint">
                                        {HACKATHON_KIND_LABELS[c.kind]} · teams of {c.minTeamSize}–{c.maxTeamSize}
                                    </span>
                                </label>
                            );
                        })}
                    </div>
                    {selected ? (
                        <div className="space-y-2 rounded-xl border border-line bg-paper p-4 text-sm text-ink-soft">
                            {selected.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={selected.imageUrl} alt="" className="mb-2 max-w-full h-auto rounded-lg" />
                            ) : null}
                            {selected.description ? <p className="whitespace-pre-line text-ink">{selected.description}</p> : null}
                            <p>
                                Entry:{" "}
                                <span className="font-medium text-ink">
                                    {selected.due > 0 ? formatCurrency(selected.due, selected.currency, "Free") : "Free"}
                                </span>
                                {selected.fee > 0 && selected.due < selected.fee ? (
                                    <span className="ml-2 text-xs line-through">{formatCurrency(selected.fee, selected.currency)}</span>
                                ) : null}
                            </p>
                            {selected.discountNote && selected.due < selected.fee ? (
                                <p className="text-xs">{selected.discountNote}</p>
                            ) : null}
                            {selected.prizePool ? <p>Prizes: {selected.prizePool}</p> : null}
                            {selected.submissionDeadline ? <p>Submit by {selected.submissionDeadline}</p> : null}
                            {selected.instructions ? (
                                <p className="whitespace-pre-line">
                                    <span className="font-medium text-ink">Instructions. </span>
                                    {selected.instructions}
                                </p>
                            ) : null}
                            {selected.policies ? (
                                <p className="whitespace-pre-line">
                                    <span className="font-medium text-ink">Policies. </span>
                                    {selected.policies}
                                </p>
                            ) : null}
                            {selected.rulesText ? (
                                <p className="whitespace-pre-line">
                                    <span className="font-medium text-ink">Rules. </span>
                                    {selected.rulesText}
                                </p>
                            ) : null}
                        </div>
                    ) : null}
                </fieldset>
            ) : null}

            <div className="flex flex-col gap-1.5">
                <label htmlFor="reg-name" className={labelClass}>
                    {competitions.length || groupMode ? (groupMode ? "Group lead — full name" : "Team lead — full name") : "Full name"}
                </label>
                <input
                    id="reg-name"
                    name="name"
                    defaultValue={attendee?.name ?? ""}
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
                    defaultValue={attendee?.email ?? ""}
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

            {groupFields.length ? (
                <div className="flex flex-col gap-5 border-t border-line pt-5">
                    <p className={labelClass}>Questions for the group</p>
                    {groupFields.map((field) => (
                        <CustomQuestion key={field.fieldId} field={field} />
                    ))}
                </div>
            ) : null}

            {memberFields.length ? (
                <div className="flex flex-col gap-5 border-t border-line pt-5">
                    <p className={labelClass}>A few questions from the organiser</p>
                    {memberFields.map((field) => (
                        <CustomQuestion key={field.fieldId} field={field} />
                    ))}
                </div>
            ) : null}

            {(competitions.length || groupMode) && maxMembers > 0 ? (
                <div className="flex flex-col gap-5 border-t border-line pt-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className={labelClass}>{groupMode ? "Group members" : "Team members"}</p>
                        {memberSlots.length < maxMembers ? (
                            <button
                                type="button"
                                className={buttonClass("secondary", "sm")}
                                onClick={() => setMemberSlots((slots) => [...slots, Date.now()])}
                            >
                                Add {groupMode ? "member" : "team member"}
                            </button>
                        ) : null}
                    </div>
                    <p className="text-xs text-ink-soft">
                        {groupMode
                            ? `Add at least ${minExtra} extra ${minExtra === 1 ? "person" : "people"} (group size ${groupMinSize}–${groupMaxSize}).`
                            : `Same questions as above, for each extra person. You can add up to ${maxMembers} besides yourself.`}
                    </p>
                    {memberSlots.map((slot, index) => (
                        <div key={slot} className="space-y-4 rounded-xl border border-line p-4">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-ink">Member {index + 2}</p>
                                <button
                                    type="button"
                                    className="text-2xs uppercase text-ink-faint hover:text-ink"
                                    onClick={() => setMemberSlots((slots) => slots.filter((s) => s !== slot))}
                                >
                                    Remove
                                </button>
                            </div>
                            <input type="hidden" name={`member_${index}_slot`} value="1" />
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor={`m-${index}-name`} className={labelClass}>Full name</label>
                                <input id={`m-${index}-name`} name={`member_${index}_name`} required maxLength={120} className={fieldClass} />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor={`m-${index}-email`} className={labelClass}>Email</label>
                                <input id={`m-${index}-email`} name={`member_${index}_email`} type="email" required className={fieldClass} />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor={`m-${index}-phone`} className={labelClass}>Phone</label>
                                <input id={`m-${index}-phone`} name={`member_${index}_phone`} type="tel" required className={fieldClass} />
                            </div>
                            {memberFields.map((field) => (
                                <CustomQuestion
                                    key={`${slot}-${field.fieldId}`}
                                    field={field}
                                    namePrefix={`member_${index}_custom_`}
                                    idPrefix={`member-${index}-custom`}
                                />
                            ))}
                        </div>
                    ))}
                </div>
            ) : null}

            {paidNow ? (
                <div className="flex flex-col gap-1.5 border-t border-line pt-5">
                    <label htmlFor="reg-promo" className={labelClass}>
                        Promo code <span className="normal-case text-ink-faint">(optional)</span>
                    </label>
                    <input id="reg-promo" name="promoCode" className={fieldClass} autoComplete="off" />
                </div>
            ) : null}

            {paidNow ? (
                <div className="flex flex-col gap-1.5 border-t border-line pt-5">
                    <label htmlFor="reg-proof" className={labelClass}>
                        Payment screenshot <span className="normal-case text-ink-faint">(optional)</span>
                    </label>
                    <input
                        id="reg-proof"
                        name="paymentProof"
                        type="file"
                        accept="image/*"
                        className="w-full rounded-lg border border-line-loud bg-paper px-3 py-2 text-sm text-ink file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-ink focus:border-ink focus:outline-2 focus:outline-offset-2 focus:outline-ink"
                    />
                    <p className="text-xs text-ink-soft">
                        Transfer {amountLabel} and upload a screenshot so the organiser can confirm it. You can
                        also register now and send proof later.
                    </p>
                </div>
            ) : null}

            <SubmitButton pendingText="Registering…" className={buttonClass("primary", "lg", "w-full")}>
                {joinsWaitlist
                    ? "Join the waitlist"
                    : paidNow
                      ? `Register — ${amountLabel}`
                      : "Register for free"}
            </SubmitButton>

            <p className="text-xs text-ink-soft">
                {joinsWaitlist
                    ? "This event is full. You will join the waitlist and be emailed if a place frees up."
                    : paidNow
                      ? "Your place is held once the organiser confirms your payment."
                      : needsApproval
                        ? "The organiser reviews registrations for this event, and will email you once they decide."
                        : "Your place is confirmed as soon as you register."}
            </p>
        </form>
    );
}

export default RegistrationForm;
