"use client";

import { useState, useTransition } from "react";
import type { OrganizerEmailConnectionPublic } from "@/src/features/email/types";
import {
  revokeEmailConnectionAction,
  startGoogleConnectAction,
  testEmailConnectionAction,
} from "@/src/features/email/actions/organizerEmailConnection.action";

type Props = {
  organizerId: string;
  connection: OrganizerEmailConnectionPublic | null;
  googleReady: boolean;
  /** When true, show owner-oriented copy (admin view). */
  asOwner?: boolean;
};

export function OrganizerEmailConnectPanel({
  organizerId,
  connection,
  googleReady,
  asOwner = false,
}: Props) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const active = connection?.status === "active";

  function report(
    result: { ok: true; data?: unknown } | { ok: false; error: { message: string } },
  ) {
    if (result.ok) {
      setError(null);
      setMessage("Saved.");
    } else {
      setMessage(null);
      setError(result.error.message);
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-line bg-paper p-5">
      <div>
        <h2 className="font-display text-lg text-ink">Outbound email</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Attendee, certificate, and bulk event mail must send from your Google account. SMTP is no
          longer supported. Platform mail (invites, billing) still uses Avoeline Resend — not this
          connection.
        </p>
      </div>

      {active ? (
        <div className="rounded-xl border border-line bg-canvas/60 px-4 py-3 text-sm">
          <p className="font-medium text-ink">
            Connected via {connection.provider === "google" ? "Google" : "SMTP (legacy)"}
          </p>
          <p className="mt-1 text-ink-soft">
            From {connection.fromEmail}
            {connection.createdBy === "saas_owner" ? " · provisioned by platform" : ""}
          </p>
          {connection.provider === "smtp" ? (
            <p className="mt-1 text-xs text-amber-800">
              This SMTP connection still works until you disconnect. Reconnect with Google when you
              can.
            </p>
          ) : null}
          {connection.lastTestedAt ? (
            <p className="mt-1 text-xs text-ink-soft">
              Last tested {new Date(connection.lastTestedAt).toLocaleString()}
            </p>
          ) : null}
          {connection.lastError ? (
            <p className="mt-1 text-xs text-red-700">{connection.lastError}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              className="rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-paper disabled:opacity-50"
              onClick={() =>
                start(async () => {
                  const r = await testEmailConnectionAction({ organizerId });
                  report(r);
                  if (r.ok) setMessage("Test email sent.");
                })
              }
            >
              Send test
            </button>
            <button
              type="button"
              disabled={pending}
              className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink disabled:opacity-50"
              onClick={() =>
                start(async () => {
                  const r = await revokeEmailConnectionAction({ organizerId });
                  report(r);
                  if (r.ok) setMessage("Connection revoked.");
                })
              }
            >
              Disconnect
            </button>
          </div>
        </div>
      ) : (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Email is not connected. Attendee and certificate sends are blocked until you connect
          Google
          {asOwner ? " for this organizer" : ""}.
        </p>
      )}

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-ink">Google</h3>
        {googleReady ? (
          <button
            type="button"
            disabled={pending}
            className="rounded-lg bg-ink px-3 py-2 text-sm font-medium text-paper disabled:opacity-50"
            onClick={() =>
              start(async () => {
                const r = await startGoogleConnectAction({ organizerId });
                if (!r.ok) {
                  setError(r.error.message);
                  return;
                }
                window.location.href = r.data.url;
              })
            }
          >
            {active && connection?.provider === "google" ? "Reconnect Google" : "Connect Google"}
          </button>
        ) : (
          <p className="text-xs text-ink-soft">
            Google OAuth setup incomplete on this deployment. Ask the platform owner to set
            GOOGLE_CLIENT_* and EMAIL_CONNECTION_SECRET.
          </p>
        )}
      </div>

      {message ? <p className="text-sm text-ink">{message}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </section>
  );
}
