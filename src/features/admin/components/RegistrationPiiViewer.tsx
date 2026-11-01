"use client";

import { useState, useTransition } from "react";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import { unlockRegistrationPiiAction } from "../actions/registrationPii.action";

type Row = {
  id: string;
  eventId: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  status: string | null;
  createdAt: string | null;
  customResponses: unknown;
  paymentProofPath: string | null;
};

export function RegistrationPiiViewer() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [registrationId, setRegistrationId] = useState("");
  const [eventId, setEventId] = useState("");
  const [email, setEmail] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-soft">
        Platform staff may open registration personal data only for support, with a written reason.
        Access is audit-logged. There is no bulk export of attendee data for platform use.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className={labelClass}>Registration id</label>
          <input
            className={fieldClass}
            value={registrationId}
            onChange={(e) => setRegistrationId(e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Event id (optional)</label>
          <input
            className={fieldClass}
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Attendee email</label>
          <input
            className={fieldClass}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <label className={labelClass}>Support reason (required)</label>
          <textarea
            className={`${fieldClass} min-h-20`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why do you need this registration data?"
          />
        </div>
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <button
        type="button"
        className={buttonClass("primary", "md")}
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setRows(null);
            const res = await unlockRegistrationPiiAction({
              reason,
              registrationId: registrationId.trim() || undefined,
              eventId: eventId.trim() || undefined,
              email: email.trim() || undefined,
            });
            if (!res.ok) {
              setError(res.error.message);
              return;
            }
            setError(null);
            setRows(res.data.rows);
          })
        }
      >
        {pending ? "Looking up…" : "Unlock with reason"}
      </button>

      {rows ? (
        rows.length === 0 ? (
          <p className="text-sm text-ink-soft">No matching registrations.</p>
        ) : (
          <ul className="space-y-3">
            {rows.map((r) => (
              <li key={r.id} className="rounded-2xl border border-line p-4 text-sm">
                <p>
                  <span className="text-ink-soft">Id:</span> {r.id}
                </p>
                <p>
                  <span className="text-ink-soft">Event:</span> {r.eventId}
                </p>
                <p>
                  <span className="text-ink-soft">Name:</span> {r.name || "—"}
                </p>
                <p>
                  <span className="text-ink-soft">Email:</span> {r.email || "—"}
                </p>
                <p>
                  <span className="text-ink-soft">Phone:</span> {r.phone || "—"}
                </p>
                <p>
                  <span className="text-ink-soft">Status:</span> {r.status || "—"}
                </p>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}
