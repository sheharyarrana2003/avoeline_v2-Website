"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { Modal } from "@/src/components/ui/Modal";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import {
  DEFAULT_EVENT_EMAILS,
  EMAIL_BLOCK_LABELS,
  EMAIL_INCLUDE_BLOCKS,
  EMAIL_TOKEN_MENU,
  toggleEmailBlockInBody,
  type EmailIncludeBlock,
  type EventEmailKind,
  type EventEmailTemplate,
} from "../emailTypes";
import {
  previewBulkAttendeeEmailAction,
  saveEventEmailTemplateAction,
  sendBulkAttendeeEmailAction,
  sendMemberEmailAction,
} from "../actions/eventEmail.action";
import type { ActionResult } from "@/src/lib/action";
import { useSearchParams } from "next/navigation";

function TokenInsertMenu({
  onInsert,
  hidePayment,
}: {
  onInsert: (token: string) => void;
  hidePayment?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <span className="text-2xs font-medium uppercase text-ink-soft">Insert token</span>
      {EMAIL_TOKEN_MENU.filter((t) => !(hidePayment && t.paymentOnly)).map((t) => (
        <button
          key={t.token}
          type="button"
          className="rounded-md border border-line bg-muted px-2 py-0.5 text-2xs text-ink hover:bg-paper"
          onClick={() => onInsert(t.token)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function IncludeChecklist({
  blocks,
  setBlocks,
  body,
  setBody,
  showTeamBlocks,
}: {
  blocks: EmailIncludeBlock[];
  setBlocks: (next: EmailIncludeBlock[]) => void;
  body: string;
  setBody: (next: string) => void;
  showTeamBlocks: boolean;
}) {
  const options = EMAIL_INCLUDE_BLOCKS.filter(
    (b) => showTeamBlocks || (b !== "team_name" && b !== "team_members" && b !== "competition"),
  );
  return (
    <fieldset className="flex flex-wrap gap-3">
      <legend className={labelClass}>Include in email</legend>
      {options.map((block) => (
        <label key={block} className="flex items-center gap-1.5 text-xs text-ink">
          <input
            type="checkbox"
            name="block"
            value={block}
            checked={blocks.includes(block)}
            onChange={(e) => {
              const enabled = e.target.checked;
              setBlocks(enabled ? [...blocks, block] : blocks.filter((b) => b !== block));
              setBody(toggleEmailBlockInBody(body, block, enabled));
            }}
          />
          {EMAIL_BLOCK_LABELS[block]}
        </label>
      ))}
    </fieldset>
  );
}

/** @deprecated Prefer EmailConnectionRequiredBanner */
export function ResendTestBanner({ show }: { show: boolean }) {
  return <EmailConnectionRequiredBanner show={show} organizerId={undefined} />;
}

export function EmailConnectionRequiredBanner({
  show,
  organizerId,
}: {
  show: boolean;
  organizerId?: string;
}) {
  if (!show) return null;
  const href = organizerId ? `/organizer/${organizerId}/email` : null;
  return (
    <p
      role="status"
      className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
    >
      Connect Google to send attendee emails
      {href ? (
        <>
          {" "}
          —{" "}
          <a className="font-medium underline" href={href}>
            Connect Google
          </a>
          .
        </>
      ) : (
        ". Open Organizer → Email to connect your Google account."
      )}{" "}
      Platform Resend is not used for attendee mail.
    </p>
  );
}

export function RegistrationEmailsModal({
  eventId,
  organizerId,
  templates,
  hidePayment,
}: {
  eventId: string;
  organizerId: string;
  templates: EventEmailTemplate[];
  hidePayment?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Exclude<EventEmailKind, "custom">>("registration_received");
  const saved = templates.find((t) => t.kind === kind);
  const fallback = DEFAULT_EVENT_EMAILS[kind];
  const [subject, setSubject] = useState(saved?.subject || fallback.subject);
  const [body, setBody] = useState(saved?.body || fallback.body);
  const [blocks, setBlocks] = useState<EmailIncludeBlock[]>(
    saved?.includeBlocks?.length ? saved.includeBlocks : fallback.includeBlocks,
  );
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  function switchKind(next: Exclude<EventEmailKind, "custom">) {
    const row = templates.find((t) => t.kind === next);
    const def = DEFAULT_EVENT_EMAILS[next];
    setKind(next);
    setSubject(row?.subject || def.subject);
    setBody(row?.body || def.body);
    setBlocks(row?.includeBlocks?.length ? row.includeBlocks : def.includeBlocks);
  }

  function insertToken(token: string) {
    const el = bodyRef.current;
    if (!el) {
      setBody((b) => b + token);
      return;
    }
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    const next = body.slice(0, start) + token + body.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  }

  return (
    <>
      <button
        type="button"
        className={buttonClass("secondary", "sm")}
        onClick={() => setOpen(true)}
      >
        Registration emails
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Registration emails"
        description="Sent automatically to the team lead (or solo attendee). Extra members do not get these. Requires a Google connection."
        maxWidth="2xl"
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className={buttonClass("secondary", "sm")}
              onClick={() => setOpen(false)}
            >
              Close
            </button>
            <SubmitButton form="reg-email-template-form" className={buttonClass("primary", "sm")}>
              Save template
            </SubmitButton>
          </div>
        }
      >
        <form
          id="reg-email-template-form"
          action={saveEventEmailTemplateAction}
          className="space-y-4"
        >
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="organizerId" value={organizerId} />
          <input
            type="hidden"
            name="returnTo"
            value={`/organizer/${organizerId}/events/${eventId}/attendees`}
          />
          <input type="hidden" name="kind" value={kind} />
          <div className="flex gap-2">
            <button
              type="button"
              className={buttonClass(
                kind === "registration_received" ? "primary" : "secondary",
                "sm",
              )}
              onClick={() => switchKind("registration_received")}
            >
              On submit
            </button>
            <button
              type="button"
              className={buttonClass(
                kind === "registration_confirmed" ? "primary" : "secondary",
                "sm",
              )}
              onClick={() => switchKind("registration_confirmed")}
            >
              After confirm + pay
            </button>
          </div>
          <div>
            <label className={labelClass} htmlFor="email-subject">
              Subject
            </label>
            <input
              id="email-subject"
              name="subject"
              className={`${fieldClass} mt-1`}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="email-body">
              Body
            </label>
            <textarea
              id="email-body"
              name="body"
              ref={bodyRef}
              rows={8}
              className={`${fieldClass} mt-1`}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <div className="mt-2">
              <TokenInsertMenu onInsert={insertToken} hidePayment={hidePayment} />
            </div>
          </div>
          <IncludeChecklist
            blocks={blocks}
            setBlocks={setBlocks}
            body={body}
            setBody={setBody}
            showTeamBlocks
          />
          <p className="text-2xs text-ink-soft">
            Checking a box inserts a block into the body (you can edit it). Unchecking removes that
            block.
          </p>
        </form>
      </Modal>
    </>
  );
}

export function BulkAttendeeEmailModal({
  eventId,
  hasTeams,
  hidePayment,
}: {
  eventId: string;
  hasTeams?: boolean;
  hidePayment?: boolean;
}) {
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [kind, setKind] = useState<EventEmailKind>("custom");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [blocks, setBlocks] = useState<EmailIncludeBlock[]>(["ticket_url", "event_details"]);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [previewMeta, setPreviewMeta] = useState<{ count: number; emails: string[] } | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [state, action] = useActionState<(ActionResult & { sent?: number }) | null, FormData>(
    sendBulkAttendeeEmailAction,
    null,
  );
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  function filterHiddens() {
    return (
      <>
        <input type="hidden" name="eventId" value={eventId} />
        <input type="hidden" name="value" value={searchParams.get("value") ?? ""} />
        <input type="hidden" name="status" value={searchParams.get("status") ?? "all"} />
        <input type="hidden" name="payment" value={searchParams.get("payment") ?? "all"} />
        <input type="hidden" name="checkin" value={searchParams.get("checkin") ?? "all"} />
        <input type="hidden" name="track" value={searchParams.get("track") ?? "all"} />
      </>
    );
  }

  function insertToken(token: string) {
    const el = bodyRef.current;
    if (!el) {
      setBody((b) => b + token);
      return;
    }
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    const next = body.slice(0, start) + token + body.slice(end);
    setBody(next);
  }

  function runPreview() {
    const fd = new FormData();
    fd.set("eventId", eventId);
    fd.set("kind", kind);
    fd.set("subject", subject);
    fd.set("body", body);
    fd.set(
      "recipientMode",
      hasTeams
        ? String(
            (document.getElementById("bulk-recipients") as HTMLSelectElement | null)?.value ||
              "leads",
          )
        : "members",
    );
    for (const key of ["value", "status", "payment", "checkin", "track"] as const) {
      fd.set(key, searchParams.get(key) ?? (key === "value" ? "" : "all"));
    }
    for (const b of blocks) fd.append("block", b);
    setPreviewError(null);
    startTransition(async () => {
      const result = await previewBulkAttendeeEmailAction(fd);
      if (!result.success) {
        setPreviewHtml("");
        setPreviewMeta(null);
        setPreviewError(result.error || "Preview failed.");
        return;
      }
      setPreviewHtml(result.html || "");
      setPreviewMeta({ count: result.count || 0, emails: result.sampleEmails || [] });
    });
  }

  return (
    <>
      <button type="button" className={buttonClass("primary", "sm")} onClick={() => setOpen(true)}>
        Email these results
      </button>
      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setConfirming(false);
        }}
        title="Email these results"
        description="Uses the search and filters on the attendee list. Preview first, then confirm. Requires Google."
        maxWidth="2xl"
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              className={buttonClass("secondary", "sm")}
              onClick={runPreview}
              disabled={pending}
            >
              {pending ? "Previewing…" : "Refresh preview"}
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                className={buttonClass("secondary", "sm")}
                onClick={() => {
                  setOpen(false);
                  setConfirming(false);
                }}
              >
                Cancel
              </button>
              {!confirming ? (
                <button
                  type="button"
                  className={buttonClass("primary", "sm")}
                  disabled={pending}
                  onClick={() => {
                    runPreview();
                    setConfirming(true);
                  }}
                >
                  Preview & continue
                </button>
              ) : (
                <SubmitButton
                  form="bulk-email-form"
                  className={buttonClass("primary", "sm")}
                  disabled={!previewMeta || previewMeta.count < 1}
                >
                  Confirm send{previewMeta ? ` (${previewMeta.count})` : ""}
                </SubmitButton>
              )}
            </div>
          </div>
        }
      >
        <form id="bulk-email-form" action={action} className="space-y-4">
          {filterHiddens()}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="bulk-email-type">
                Email type
              </label>
              <select
                id="bulk-email-type"
                name="kind"
                className={`${fieldClass} mt-1`}
                value={kind}
                onChange={(e) => {
                  setKind(e.target.value as EventEmailKind);
                  setConfirming(false);
                }}
              >
                <option value="registration_received">Registration received</option>
                <option value="registration_confirmed">Registration confirmed</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            {hasTeams ? (
              <div>
                <label className={labelClass} htmlFor="bulk-recipients">
                  Recipients
                </label>
                <select
                  id="bulk-recipients"
                  name="recipientMode"
                  className={`${fieldClass} mt-1`}
                  defaultValue="leads"
                  onChange={() => setConfirming(false)}
                >
                  <option value="leads">Team leads (and solos)</option>
                  <option value="members">Every matching member</option>
                </select>
              </div>
            ) : (
              <input type="hidden" name="recipientMode" value="members" />
            )}
          </div>
          <div>
            <label className={labelClass} htmlFor="bulk-subject">
              Subject
            </label>
            <input
              id="bulk-subject"
              name="subject"
              className={`${fieldClass} mt-1`}
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                setConfirming(false);
              }}
              placeholder="Subject"
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="bulk-body">
              Body
            </label>
            <textarea
              id="bulk-body"
              name="body"
              ref={bodyRef}
              rows={6}
              className={`${fieldClass} mt-1`}
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                setConfirming(false);
              }}
              placeholder="Body"
            />
            <div className="mt-2">
              <TokenInsertMenu onInsert={insertToken} hidePayment={hidePayment} />
            </div>
          </div>
          <IncludeChecklist
            blocks={blocks}
            setBlocks={(next) => {
              setBlocks(next);
              setConfirming(false);
            }}
            body={body}
            setBody={(next) => {
              setBody(next);
              setConfirming(false);
            }}
            showTeamBlocks={!!hasTeams}
          />
          {previewError ? <FormFeedback error={previewError} /> : null}
          {state?.error ? <FormFeedback error={state.error} /> : null}
          {state?.success && state.sent ? (
            <p className="text-xs text-ink-soft">Sent {state.sent}.</p>
          ) : null}
          {previewMeta ? (
            <div className="rounded-xl border border-line bg-muted/40 px-3 py-2 text-xs text-ink-soft">
              <p>
                <span className="font-medium text-ink">{previewMeta.count}</span> recipients. First{" "}
                {previewMeta.emails.length}: {previewMeta.emails.join(", ") || "—"}
              </p>
            </div>
          ) : null}
          {previewHtml ? (
            <div>
              <p className={labelClass}>Preview (sample recipient)</p>
              <iframe
                title="Email preview"
                sandbox=""
                srcDoc={previewHtml}
                className="mt-1 h-48 w-full rounded-xl border border-line bg-paper"
              />
            </div>
          ) : null}
          {confirming ? (
            <p className="text-sm font-medium text-ink">
              {previewMeta
                ? `Ready to send to ${previewMeta.count} recipient${previewMeta.count === 1 ? "" : "s"}. This cannot be undone.`
                : "Refresh the preview, then confirm send."}
            </p>
          ) : null}
        </form>
      </Modal>
    </>
  );
}

/** @deprecated inline cards — prefer RegistrationEmailsModal + BulkAttendeeEmailModal */
export function EventEmailTemplatesCard(props: {
  eventId: string;
  organizerId: string;
  templates: EventEmailTemplate[];
  hidePayment?: boolean;
}) {
  return <RegistrationEmailsModal {...props} />;
}

/** @deprecated */
export function BulkAttendeeEmail(props: {
  eventId: string;
  hasTeams?: boolean;
  hidePayment?: boolean;
}) {
  return <BulkAttendeeEmailModal {...props} />;
}

export function MemberEmailForm({
  eventId,
  registrationId,
  startOpen = false,
  hidePayment,
}: {
  eventId: string;
  registrationId: string;
  startOpen?: boolean;
  hidePayment?: boolean;
}) {
  const [open, setOpen] = useState(startOpen);
  const [state, action] = useActionState<ActionResult | null, FormData>(
    sendMemberEmailAction,
    null,
  );
  if (!open) {
    return (
      <button
        type="button"
        className={buttonClass("secondary", "sm")}
        onClick={() => setOpen(true)}
      >
        Send email
      </button>
    );
  }
  return (
    <form action={action} className="space-y-3 rounded-xl border border-line p-5">
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="registrationId" value={registrationId} />
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-ink">Compose</p>
        <button
          type="button"
          className="text-xs text-ink-soft hover:text-ink"
          onClick={() => setOpen(false)}
        >
          Cancel
        </button>
      </div>
      <div>
        <label className={labelClass} htmlFor={`email-type-${registrationId}`}>
          Email type
        </label>
        <select
          id={`email-type-${registrationId}`}
          name="kind"
          className={`${fieldClass} mt-1`}
          defaultValue="registration_confirmed"
        >
          <option value="registration_received">Registration received</option>
          <option value="registration_confirmed">Registration confirmed</option>
          <option value="custom">Custom</option>
        </select>
      </div>
      <div>
        <label className={labelClass} htmlFor={`email-subject-${registrationId}`}>
          Subject override
        </label>
        <input
          id={`email-subject-${registrationId}`}
          name="subject"
          className={`${fieldClass} mt-1`}
          placeholder="Leave blank to use the template"
        />
      </div>
      <div>
        <label className={labelClass} htmlFor={`email-body-${registrationId}`}>
          Body override
        </label>
        <textarea
          id={`email-body-${registrationId}`}
          name="body"
          rows={3}
          className={`${fieldClass} mt-1`}
          placeholder="Leave blank to use the template"
        />
      </div>
      <div className="flex flex-wrap gap-3">
        {EMAIL_INCLUDE_BLOCKS.filter((b) => !hidePayment || b !== "ticket_url" || true).map(
          (block) => (
            <label key={block} className="flex items-center gap-1.5 text-xs text-ink">
              <input
                type="checkbox"
                name="block"
                value={block}
                defaultChecked={block === "ticket_url" || block === "qr_code"}
              />
              {EMAIL_BLOCK_LABELS[block]}
            </label>
          ),
        )}
      </div>
      {state?.error ? <FormFeedback error={state.error} /> : null}
      {state?.success ? <p className="text-xs text-ink-soft">Sent.</p> : null}
      <SubmitButton className={buttonClass("primary", "sm")}>Send</SubmitButton>
    </form>
  );
}
