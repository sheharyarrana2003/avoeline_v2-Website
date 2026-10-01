"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import type { ActionResult } from "@/src/lib/action";
import { saveOrganization } from "../actions/organizations.action";
import {
    DEFAULT_BENEFITS,
    ORGANIZATION_TYPES,
    ORGANIZATION_TYPE_META,
    PARTNERSHIP_KINDS,
    COLLABORATOR_ROLE_META,
    type EventOrganization,
    type OrganizationType,
} from "../types";

/**
 * The one form the spec asks for: a Type selector that changes which extra
 * fields appear.
 *
 * Fields that do not apply are not merely hidden, they are absent -- the action
 * clears the values they would have written, so switching a sponsor to a partner
 * cannot leave a contract value on a record that is not supposed to have
 * financial fields.
 */
export function OrganizationForm({
    eventId,
    sponsorTiers,
    editing,
    onDone,
}: {
    eventId: string;
    sponsorTiers: string[];
    editing?: EventOrganization;
    onDone?: string;
}) {
    const [state, formAction] = useActionState<ActionResult | null, FormData>(saveOrganization, null);
    const [type, setType] = useState<OrganizationType>(editing?.type ?? "sponsor");

    return (
        <form action={formAction} className="flex flex-col gap-5">
            <input type="hidden" name="eventId" value={eventId} />
            {editing ? <input type="hidden" name="id" value={editing.id} /> : null}

            {state?.error ? <FormFeedback error={state.error} /> : null}
            {state?.success ? <FormFeedback success={editing ? "Saved." : "Added."} /> : null}

            <div className="flex flex-col gap-1.5">
                <label htmlFor="org-type" className={labelClass}>Type</label>
                <select
                    id="org-type"
                    name="type"
                    value={type}
                    onChange={(e) => setType(e.target.value as OrganizationType)}
                    className={fieldClass}
                >
                    {ORGANIZATION_TYPES.map((t) => (
                        <option key={t} value={t}>{ORGANIZATION_TYPE_META[t].label}</option>
                    ))}
                </select>
                <p className="text-xs text-ink-soft">{ORGANIZATION_TYPE_META[type].description}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                    <label htmlFor="org-name" className={labelClass}>Name</label>
                    <input id="org-name" name="name" defaultValue={editing?.name} required maxLength={120} className={fieldClass} />
                </div>
                <div className="flex flex-col gap-1.5">
                    <label htmlFor="org-website" className={labelClass}>Website</label>
                    <input id="org-website" name="websiteUrl" type="url" defaultValue={editing?.websiteUrl} placeholder="https://" className={fieldClass} />
                </div>
            </div>

            <div className="flex flex-col gap-1.5">
                <label htmlFor="org-logo" className={labelClass}>Logo URL</label>
                <input id="org-logo" name="logoUrl" type="url" defaultValue={editing?.logoUrl} placeholder="https://" className={fieldClass} />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
                <div className="flex flex-col gap-1.5">
                    <label htmlFor="org-contact-name" className={labelClass}>Contact</label>
                    <input id="org-contact-name" name="contactName" defaultValue={editing?.contactName} className={fieldClass} />
                </div>
                <div className="flex flex-col gap-1.5">
                    <label htmlFor="org-contact-email" className={labelClass}>Email</label>
                    <input id="org-contact-email" name="contactEmail" type="email" defaultValue={editing?.contactEmail} className={fieldClass} />
                </div>
                <div className="flex flex-col gap-1.5">
                    <label htmlFor="org-contact-phone" className={labelClass}>Phone</label>
                    <input id="org-contact-phone" name="contactPhone" defaultValue={editing?.contactPhone} className={fieldClass} />
                </div>
            </div>

            {type === "sponsor" ? (
                <div className="flex flex-col gap-5 rounded-xl border border-line p-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="org-tier" className={labelClass}>Tier</label>
                            <select id="org-tier" name="tier" defaultValue={editing?.tier ?? sponsorTiers[0]} className={fieldClass}>
                                {sponsorTiers.map((t) => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                            <p className="text-xs text-ink-soft">Higher tiers appear first and larger on the public page.</p>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="org-value" className={labelClass}>Contract value</label>
                            <input
                                id="org-value"
                                name="contractValue"
                                inputMode="numeric"
                                defaultValue={editing?.contractValue ? String(editing.contractValue) : ""}
                                placeholder="0"
                                className={`${fieldClass} tabular-nums`}
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="org-benefits" className={labelClass}>Benefits owed</label>
                        <textarea
                            id="org-benefits"
                            name="benefits"
                            rows={5}
                            defaultValue={(editing?.benefits.length ? editing.benefits.map((b) => b.label) : DEFAULT_BENEFITS).join("\n")}
                            className={`${fieldClass} resize-none`}
                        />
                        <p className="text-xs text-ink-soft">
                            One per line. Editing this keeps whatever you have already ticked off as delivered.
                        </p>
                    </div>
                </div>
            ) : null}

            {type === "collaborator" ? (
                <div className="flex flex-col gap-1.5 rounded-xl border border-line p-4">
                    <span className={labelClass}>Dashboard access</span>
                    {(["full", "track"] as const).map((r) => (
                        <label key={r} className="mt-2 flex gap-3">
                            <input
                                type="radio"
                                name="role"
                                value={r}
                                defaultChecked={(editing?.role ?? "track") === r}
                                className="mt-0.5 h-4 w-4 shrink-0 accent-current"
                            />
                            <span>
                                <span className="block text-sm font-medium text-ink">{COLLABORATOR_ROLE_META[r].label}</span>
                                <span className="block text-xs text-ink-soft">{COLLABORATOR_ROLE_META[r].description}</span>
                            </span>
                        </label>
                    ))}
                    <p className="mt-2 text-xs text-ink-soft">
                        Invite them once saved. Track-only access takes effect when tracks arrive with the hackathon module.
                    </p>
                </div>
            ) : null}

            {type === "partner" ? (
                <div className="flex flex-col gap-1.5">
                    <label htmlFor="org-kind" className={labelClass}>Partnership type</label>
                    <select id="org-kind" name="partnershipKind" defaultValue={editing?.partnershipKind ?? PARTNERSHIP_KINDS[0]} className={fieldClass}>
                        {PARTNERSHIP_KINDS.map((k) => (
                            <option key={k} value={k}>{k}</option>
                        ))}
                    </select>
                </div>
            ) : null}

            <div className="flex justify-end gap-2 border-t border-line pt-5">
                {onDone ? <a href={onDone} className={buttonClass("secondary")}>Cancel</a> : null}
                <SubmitButton pendingText="Saving…" className={buttonClass("primary")}>
                    {editing ? "Save changes" : <><Plus size={14} aria-hidden="true" />Add</>}
                </SubmitButton>
            </div>
        </form>
    );
}
