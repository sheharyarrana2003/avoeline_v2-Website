"use client";

import { useTransition } from "react";
import Link from "next/link";
import { dismissConnectionsChecklistAction } from "../actions/connections.action";

export function ConnectionsChecklistCard({
  organizerId,
  emailConnected,
}: {
  organizerId: string;
  emailConnected: boolean;
}) {
  const [pending, start] = useTransition();
  if (emailConnected) return null;

  const href = `/organizer/${organizerId}/settings/connections`;

  return (
    <section className="rounded-2xl border border-line bg-paper p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg text-ink">Set up your connections</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Connect Gmail so registration, certificate, and team emails send from your address.
          </p>
          <ul className="mt-3 space-y-1 text-sm text-ink-soft">
            <li>○ Gmail (send from your address)</li>
            <li className="text-ink-faint">○ Calendar & Meet — soon</li>
            <li className="text-ink-faint">○ Drive files — soon</li>
          </ul>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={href}
            className="rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-paper"
          >
            Open Connections
          </Link>
          <button
            type="button"
            disabled={pending}
            className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink disabled:opacity-50"
            onClick={() =>
              start(async () => {
                await dismissConnectionsChecklistAction({ organizerId });
              })
            }
          >
            Dismiss
          </button>
        </div>
      </div>
    </section>
  );
}
