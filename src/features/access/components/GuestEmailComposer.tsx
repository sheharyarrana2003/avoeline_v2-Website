"use client";

import { useActionState, useMemo, useState } from "react";
import { Copy, Mail } from "lucide-react";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import type { ActionResult } from "@/src/lib/action";
import { sendGuestEmailBatchAction } from "../actions/guestEmailBatch.action";
import {
  filterGuestRecipients,
  guestLinkFor,
  previewGuestEmailHtml,
  type GuestEmailFilter,
  type GuestEmailRow,
} from "../guestEmail.logic";

const FILTER_OPTIONS: { value: GuestEmailFilter; label: string }[] = [
  { value: "all_pending", label: "All pending" },
  { value: "selected", label: "Selected rows" },
  { value: "not_opened", label: "Not opened (invites)" },
  { value: "not_registered", label: "Not registered" },
  { value: "failed_or_pending_resend", label: "Failed / pending resend" },
];

export function GuestEmailComposer({
  eventId,
  eventUrl,
  guests,
  senderConnected,
}: {
  eventId: string;
  eventUrl: string;
  guests: GuestEmailRow[];
  senderConnected: boolean;
}) {
  const [state, formAction] = useActionState<
    (ActionResult & { sent?: number; skipped?: number }) | null,
    FormData
  >(sendGuestEmailBatchAction, null);
  const [filter, setFilter] = useState<GuestEmailFilter>("all_pending");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [subject, setSubject] = useState("You're invited — {{name}}");
  const [body, setBody] = useState(
    "Hi {{name}},\n\nUse your personal link to register:\n{{inviteLink}}\n\nOr open the event page:\n{{eventLink}}",
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const recipients = useMemo(
    () => filterGuestRecipients(guests, filter, [...selected]),
    [guests, filter, selected],
  );

  const sample = useMemo(() => {
    const g = recipients[0] || guests[0];
    const link = g ? guestLinkFor(g, eventUrl) : eventUrl;
    return {
      inviteLink: g?.kind === "invite" ? link : eventUrl,
      eventLink: eventUrl,
      name: g?.name || g?.email?.split("@")[0] || "Alex",
      email: g?.email || "guest@example.com",
    };
  }, [recipients, guests, eventUrl]);

  const preview = useMemo(
    () => previewGuestEmailHtml(subject, body, sample),
    [subject, body, sample],
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyLink = async (g: GuestEmailRow) => {
    const link = guestLinkFor(g, eventUrl);
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(g.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {!senderConnected ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-ink">
          Email is disconnected. Connect Google under Settings → Connections to send, or use{" "}
          <strong>Copy link</strong> on each row below.
        </div>
      ) : null}

      <form action={formAction} className="flex flex-col gap-5">
        <input type="hidden" name="eventId" value={eventId} />
        <input type="hidden" name="filter" value={filter} />
        <input type="hidden" name="selectedIds" value={[...selected].join(",")} />

        {state?.error ? <FormFeedback error={state.error} /> : null}
        {state?.success ? (
          <FormFeedback
            success={`Sent ${state.sent ?? 0}${state.skipped ? ` · ${state.skipped} failed` : ""}.`}
          />
        ) : null}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="guest-filter" className={labelClass}>
            Recipients
          </label>
          <select
            id="guest-filter"
            value={filter}
            onChange={(e) => setFilter(e.target.value as GuestEmailFilter)}
            className={fieldClass}
          >
            {FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-ink-soft">{recipients.length} will receive this send.</p>
        </div>

        {filter === "selected" ? (
          <ul className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-line p-3 text-sm">
            {guests.map((g) => (
              <li key={g.id}>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selected.has(g.id)}
                    onChange={() => toggle(g.id)}
                    className="h-4 w-4 accent-current"
                  />
                  <span>
                    {g.email}
                    {g.name ? ` · ${g.name}` : ""}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="guest-subject" className={labelClass}>
            Subject
          </label>
          <input
            id="guest-subject"
            name="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className={fieldClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="guest-body" className={labelClass}>
            Body
          </label>
          <textarea
            id="guest-body"
            name="body"
            rows={6}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className={`${fieldClass} resize-none font-mono text-xs`}
          />
          <p className="text-xs text-ink-soft">
            Tokens: <code>{"{{inviteLink}}"}</code>, <code>{"{{eventLink}}"}</code>,{" "}
            <code>{"{{name}}"}</code>, <code>{"{{email}}"}</code>
          </p>
        </div>

        <div className="rounded-xl border border-line p-4">
          <p className="text-2xs font-medium uppercase text-ink-soft">Preview</p>
          <p className="mt-2 text-sm font-medium text-ink">{preview.subject}</p>
          <div
            className="prose prose-sm mt-2 max-w-none text-ink-soft"
            dangerouslySetInnerHTML={{ __html: preview.html }}
          />
        </div>

        <div className="flex justify-end border-t border-line pt-5">
          <SubmitButton
            pendingText="Sending…"
            className={buttonClass("primary")}
            disabled={!senderConnected || recipients.length === 0}
          >
            <Mail size={14} aria-hidden />
            Send to {recipients.length}
          </SubmitButton>
        </div>
      </form>

      <div className="border-t border-line pt-5">
        <p className="mb-2 text-2xs font-medium uppercase text-ink-soft">Copy link fallback</p>
        <ul className="max-h-48 space-y-1 overflow-y-auto text-sm">
          {guests.slice(0, 50).map((g) => (
            <li key={g.id} className="flex items-center justify-between gap-2 py-1">
              <span className="truncate text-ink-soft">{g.email}</span>
              <button
                type="button"
                className={`${buttonClass("ghost", "sm")} inline-flex items-center gap-1`}
                onClick={() => copyLink(g)}
              >
                <Copy size={12} aria-hidden />
                {copiedId === g.id ? "Copied" : "Copy link"}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
