"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import type { ActionResult } from "@/src/lib/action";
import { TICKET_STATUSES, type SupportTicket, type TicketStatus } from "../types";

type Action = (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;

const STATUS_LABEL: Record<TicketStatus, string> = {
    open: "Open",
    in_progress: "In progress",
    resolved: "Resolved",
};

/** Spec 9.7: anybody signed in can raise a ticket. */
export function NewTicketForm({ action, email, role }: { action: Action; email: string; role: string }) {
    const [state, formAction] = useActionState<ActionResult | null, FormData>(action, null);

    return (
        <form action={formAction} className="flex flex-col gap-5">
            {state?.error ? <FormFeedback error={state.error} /> : null}
            {state?.success ? (
                <FormFeedback success="Sent. Somebody will pick it up, and you can see its progress below." />
            ) : null}

            <div className="flex flex-col gap-1.5">
                <label htmlFor="ticket-subject" className={labelClass}>Subject</label>
                <input
                    id="ticket-subject"
                    name="subject"
                    required
                    maxLength={160}
                    placeholder="Certificates are not sending for my event"
                    className={fieldClass}
                />
            </div>

            <div className="flex flex-col gap-1.5">
                <label htmlFor="ticket-body" className={labelClass}>What do you need help with?</label>
                <textarea
                    id="ticket-body"
                    name="body"
                    required
                    rows={5}
                    maxLength={4000}
                    placeholder="What you were doing, what happened, and what you expected instead."
                    className={fieldClass}
                />
            </div>

            <p className="text-xs text-ink-soft">
                {/* Taken from the session, not typed: a ticket that could claim
                    to be from anybody is worse than no ticket. */}
                Sent as <span className="text-ink">{email}</span> ({role}).
            </p>

            <div>
                <SubmitButton pendingText="Sending…" className={buttonClass("primary")}>
                    Send to support
                </SubmitButton>
            </div>
        </form>
    );
}

/** The admin's control on one ticket: move it along, and leave a note. */
export function TicketControls({ ticket, action }: { ticket: SupportTicket; action: Action }) {
    const [state, formAction] = useActionState<ActionResult | null, FormData>(action, null);

    return (
        <form action={formAction} className="flex flex-col gap-3">
            <input type="hidden" name="ticketId" value={ticket.id} />

            {state?.error ? <FormFeedback error={state.error} /> : null}
            {state?.success ? <FormFeedback success="Updated." /> : null}

            <div className="flex flex-col gap-1.5">
                <label htmlFor={`note-${ticket.id}`} className={labelClass}>Internal note</label>
                <textarea
                    id={`note-${ticket.id}`}
                    name="adminNote"
                    rows={2}
                    maxLength={2000}
                    defaultValue={ticket.adminNote}
                    placeholder="What was done, or what it is waiting on."
                    className={fieldClass}
                />
            </div>

            <div className="flex flex-wrap gap-2">
                {TICKET_STATUSES.filter((s) => s !== ticket.status).map((status) => (
                    <SubmitButton
                        key={status}
                        name="status"
                        value={status}
                        pendingText="Saving…"
                        className={buttonClass(status === "resolved" ? "primary" : "secondary", "sm")}
                    >
                        Move to {STATUS_LABEL[status]}
                    </SubmitButton>
                ))}
                {/* Saving the note without changing the status still needs a
                    status, so the current one is submitted alongside it. */}
                <SubmitButton
                    name="status"
                    value={ticket.status}
                    pendingText="Saving…"
                    className={buttonClass("ghost", "sm")}
                >
                    Save note only
                </SubmitButton>
            </div>
        </form>
    );
}
