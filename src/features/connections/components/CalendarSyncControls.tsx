"use client";

import { useEffect, useState, useTransition } from "react";
import {
  listMyCalendarConnectionsAction,
  removeEntityFromCalendarAction,
  syncEntityToCalendarAction,
} from "../actions/calendar.action";
import type { CalendarEntityType } from "../types";

export function CalendarSyncControls({
  entityType,
  entityId,
  summary,
  description,
  location,
  startIso,
  endIso,
  timeZone,
  attendeeEmails,
  showMeet = true,
  showInviteOptIn = false,
  meetUrl,
}: {
  entityType: CalendarEntityType;
  entityId: string;
  summary: string;
  description?: string;
  location?: string;
  startIso: string;
  endIso: string;
  timeZone: string;
  attendeeEmails?: string[];
  showMeet?: boolean;
  showInviteOptIn?: boolean;
  meetUrl?: string | null;
}) {
  const [connections, setConnections] = useState<Array<{ id: string; email: string }>>([]);
  const [connectionId, setConnectionId] = useState("");
  const [addToCalendar, setAddToCalendar] = useState(false);
  const [addMeet, setAddMeet] = useState(false);
  const [sendInvite, setSendInvite] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [linkMeet, setLinkMeet] = useState<string | null>(meetUrl || null);
  const [pending, start] = useTransition();

  useEffect(() => {
    start(async () => {
      const r = await listMyCalendarConnectionsAction({});
      if (r.ok) {
        setConnections(r.data.connections);
        if (r.data.connections[0]) setConnectionId(r.data.connections[0].id);
      }
    });
  }, []);

  if (!connections.length) {
    return (
      <p className="text-xs text-ink-soft">
        Connect Google Calendar under Settings → Connections to sync this item (optional).
      </p>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border border-line bg-canvas/30 px-3 py-2 text-xs text-ink">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={addToCalendar}
          onChange={(e) => setAddToCalendar(e.target.checked)}
        />
        Add to my calendar
      </label>
      {showMeet ? (
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={addMeet}
            disabled={!addToCalendar}
            onChange={(e) => setAddMeet(e.target.checked)}
          />
          Add Meet link
        </label>
      ) : null}
      {showInviteOptIn ? (
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={sendInvite}
            disabled={!addToCalendar}
            onChange={(e) => setSendInvite(e.target.checked)}
          />
          Send Google Calendar invite
        </label>
      ) : null}
      <label className="block">
        Calendar account
        <select
          className="mt-1 w-full rounded border border-line bg-paper px-2 py-1"
          value={connectionId}
          onChange={(e) => setConnectionId(e.target.value)}
        >
          {connections.map((c) => (
            <option key={c.id} value={c.id}>
              {c.email}
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending || !addToCalendar || !connectionId || !startIso}
          className="rounded-lg bg-ink px-2 py-1 text-[11px] font-medium text-paper disabled:opacity-50"
          onClick={() =>
            start(async () => {
              const r = await syncEntityToCalendarAction({
                connectionId,
                entityType,
                entityId,
                summary,
                description,
                location,
                startIso,
                endIso,
                timeZone,
                withMeet: addMeet,
                sendUpdates: sendInvite ? "all" : "none",
                attendeeEmails,
              });
              if (r.ok) {
                setStatus(r.data.status === "pending" ? "Link is being created…" : "Synced.");
                setLinkMeet(r.data.meetUrl);
              } else setStatus(r.error.message);
            })
          }
        >
          Sync now
        </button>
        <button
          type="button"
          disabled={pending || !connectionId}
          className="rounded-lg border border-line px-2 py-1 text-[11px] disabled:opacity-50"
          onClick={() =>
            start(async () => {
              const r = await removeEntityFromCalendarAction({
                connectionId,
                entityType,
                entityId,
                sendUpdates: sendInvite ? "all" : "none",
              });
              setStatus(r.ok ? "Removed from calendar." : r.error.message);
              if (r.ok) setLinkMeet(null);
            })
          }
        >
          Remove
        </button>
      </div>
      {linkMeet ? (
        <a
          href={linkMeet}
          target="_blank"
          rel="noreferrer"
          className="inline-flex rounded-lg border border-line px-2 py-1 font-medium underline"
        >
          Join Meet
        </a>
      ) : null}
      {status ? <p className="text-ink-soft">{status}</p> : null}
    </div>
  );
}
