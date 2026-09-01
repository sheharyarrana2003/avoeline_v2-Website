"use client";

import { useActionState, useState } from "react";
import { Upload } from "lucide-react";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { DateField } from "@/src/shared_components/DateField";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import type { ActionResult } from "@/src/lib/action";
import { addGuests } from "../actions/guestList.action";

/**
 * Add addresses to the guest list, or issue unique invite links.
 *
 * The same form does both, because they differ only in whether a token is minted
 * and whether it can expire -- and the report that comes back (added, skipped,
 * repeated, invalid, emailed) is the same either way. Spec 2.2 asks for that
 * detection *before* saving, so the result is spelled out rather than reduced to
 * "done".
 */
export function GuestListPanel({ eventId }: { eventId: string }) {
    const [state, formAction] = useActionState<ActionResult | null, FormData>(addGuests, null);
    const [kind, setKind] = useState<"whitelist" | "invite">("whitelist");

    return (
        <form action={formAction} className="flex flex-col gap-5">
            <input type="hidden" name="eventId" value={eventId} />

            {/* The report arrives on the error channel because it is the only one
                that carries text -- a partial import must not read as a clean one. */}
            {state?.error ? <FormFeedback error={state.error} /> : null}
            {state?.success ? <FormFeedback success="Everyone on that list was added." /> : null}

            <div className="flex flex-col gap-1.5">
                <label htmlFor="guest-kind" className={labelClass}>Add as</label>
                <select
                    id="guest-kind"
                    name="kind"
                    value={kind}
                    onChange={(e) => setKind(e.target.value as "whitelist" | "invite")}
                    className={fieldClass}
                >
                    <option value="whitelist">Whitelist — these addresses may register</option>
                    <option value="invite">Invite — each person gets their own trackable link</option>
                </select>
            </div>

            <div className="flex flex-col gap-1.5">
                <label htmlFor="guests" className={labelClass}>Addresses</label>
                <textarea
                    id="guests"
                    name="guests"
                    rows={6}
                    placeholder={"ayesha@example.com, Ayesha Khan, VIP\nbilal@example.com"}
                    className={`${fieldClass} resize-none font-mono text-xs`}
                />
                <p className="text-xs text-ink-soft">
                    One per line. Optionally <code>email, name, tier</code>. A header row is ignored.
                </p>
            </div>

            <div className="flex flex-col gap-1.5">
                <label htmlFor="guest-file" className={labelClass}>
                    Or upload a CSV <span className="normal-case text-ink-faint">(optional)</span>
                </label>
                <input
                    id="guest-file"
                    name="file"
                    type="file"
                    accept=".csv,text/csv,text/plain"
                    className={`${fieldClass} file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1 file:text-xs file:text-ink`}
                />
            </div>

            {kind === "invite" ? (
                <div className="flex flex-col gap-4 rounded-xl border border-line p-4">
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="expiresAt" className={labelClass}>
                            Expires <span className="normal-case text-ink-faint">(optional)</span>
                        </label>
                        <DateField id="expiresAt" name="expiresAt" className={fieldClass} />
                        <p className="text-xs text-ink-soft">The link stops working at the end of this day.</p>
                    </div>
                    <label className="flex items-start gap-2.5 text-sm text-ink">
                        <input type="checkbox" name="singleUse" className="mt-0.5 h-4 w-4 accent-current" />
                        <span>Single use — the link stops working once they register</span>
                    </label>
                    <label className="flex items-start gap-2.5 text-sm text-ink">
                        <input type="checkbox" name="notify" defaultChecked className="mt-0.5 h-4 w-4 accent-current" />
                        <span>Email each person their link now</span>
                    </label>
                </div>
            ) : null}

            <div className="flex justify-end border-t border-line pt-5">
                <SubmitButton pendingText="Adding…" className={buttonClass("primary")}>
                    <Upload size={14} aria-hidden="true" />
                    {kind === "invite" ? "Create invites" : "Add to whitelist"}
                </SubmitButton>
            </div>
        </form>
    );
}
