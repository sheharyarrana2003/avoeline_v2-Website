"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import type { ActionResult } from "@/src/lib/action";
import { formatDateMedium } from "@/src/lib/datetime";
import type { SupportMessage } from "../supportThread.service";
import { TICKET_STATUSES, type SupportTicket, type TicketStatus } from "../types";
import { replyToTicket, reopenTicket, updateTicket } from "../actions/support.action";

const STATUS_LABEL: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
};

const STATUS_HELP: Record<TicketStatus, string> = {
  open: "New or reopened — waiting for the team.",
  in_progress: "Someone is working on it.",
  resolved: "Marked done. The requester may reopen if needed.",
};

type Action = (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;

export function TicketReplyForm({
  ticketId,
  action = replyToTicket,
}: {
  ticketId: string;
  action?: Action;
}) {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(action, null);

  return (
    <form action={formAction} className="space-y-3" encType="multipart/form-data">
      <input type="hidden" name="ticketId" value={ticketId} />
      {state?.error ? <FormFeedback error={state.error} /> : null}
      {state?.success ? <FormFeedback success="Reply sent." /> : null}
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`reply-${ticketId}`} className={labelClass}>
          Reply
        </label>
        <textarea
          id={`reply-${ticketId}`}
          name="body"
          required
          rows={4}
          maxLength={4000}
          className={fieldClass}
          placeholder="Write your reply…"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`att-${ticketId}`} className={labelClass}>
          Attachment (optional, max 10MB)
        </label>
        <input
          id={`att-${ticketId}`}
          type="file"
          name="attachment"
          accept="image/*,.pdf,.txt,.csv,.zip,.docx"
          className="text-sm text-ink-soft"
        />
      </div>
      <SubmitButton pendingText="Sending…" className={buttonClass("primary")}>
        Send reply
      </SubmitButton>
    </form>
  );
}

export function TicketStatusHelp({ status }: { status: TicketStatus }) {
  return (
    <p className="text-xs text-ink-soft">
      <span className="font-medium text-ink">{STATUS_LABEL[status]}</span> — {STATUS_HELP[status]}
    </p>
  );
}

export function TicketThread({
  ticket,
  messages,
  currentUserId,
  canManage,
}: {
  ticket: SupportTicket;
  messages: SupportMessage[];
  currentUserId: string;
  canManage: boolean;
}) {
  return (
    <div className="space-y-6">
      <TicketStatusHelp status={ticket.status} />

      <ol className="space-y-4">
        {messages.map((m) => {
          const mine = m.authorUserId === currentUserId;
          const staffSide = canManage && m.authorUserId !== ticket.fromUserId;
          return (
            <li
              key={m.id}
              className={`rounded-xl border border-line px-4 py-3 ${
                staffSide || mine ? "bg-muted/40" : "bg-paper"
              }`}
            >
              <p className="text-2xs uppercase text-ink-faint">
                {m.authorUserId === ticket.fromUserId ? "Requester" : "Support"}
                {m.createdAt ? ` · ${formatDateMedium(m.createdAt)}` : ""}
              </p>
              <p className="mt-2 whitespace-pre-line text-sm text-ink">{m.body}</p>
              {m.attachments.length ? (
                <ul className="mt-2 space-y-1">
                  {m.attachments.map((a) => (
                    <li key={a.id}>
                      {a.signedUrl ? (
                        <a
                          href={a.signedUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-medium text-ink underline"
                        >
                          {a.filename}
                        </a>
                      ) : (
                        <span className="text-sm text-ink-soft">{a.filename}</span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ol>

      <TicketReplyForm ticketId={ticket.id} />

      {canManage ? (
        <div className="border-t border-line pt-4">
          <AdminTicketControls ticket={ticket} />
        </div>
      ) : ticket.status === "resolved" ? (
        <RequesterReopen ticketId={ticket.id} />
      ) : null}
    </div>
  );
}

function AdminTicketControls({ ticket }: { ticket: SupportTicket }) {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(updateTicket, null);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="ticketId" value={ticket.id} />
      {state?.error ? <FormFeedback error={state.error} /> : null}
      {state?.success ? <FormFeedback success="Updated." /> : null}
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`note-${ticket.id}`} className={labelClass}>
          Internal note
        </label>
        <textarea
          id={`note-${ticket.id}`}
          name="adminNote"
          rows={2}
          maxLength={2000}
          defaultValue={ticket.adminNote}
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

function RequesterReopen({ ticketId }: { ticketId: string }) {
  const [state, formAction] = useActionState<ActionResult | null, FormData>(reopenTicket, null);
  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="ticketId" value={ticketId} />
      {state?.error ? <FormFeedback error={state.error} /> : null}
      {state?.success ? <FormFeedback success="Ticket reopened." /> : null}
      <SubmitButton pendingText="Reopening…" className={buttonClass("secondary", "sm")}>
        Reopen ticket
      </SubmitButton>
    </form>
  );
}
