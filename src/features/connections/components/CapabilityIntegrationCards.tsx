"use client";

import { useState, useTransition, type ReactNode } from "react";
import { getCatalogEntry } from "../catalog";
import type { ConnectionCapability, ConnectionPublic, IntegrationCatalogEntry } from "../types";
import {
  findConnectionWithCapability,
  hasEnabledCapability,
  primaryActiveConnection,
} from "../lib/connectionCardHelpers";
import { formatSafeActionError } from "../lib/connectionUserErrors";
import {
  createTestCalendarEventAction,
  createTestDriveFolderAction,
  createTestMeetLinkAction,
  createTestSheetAction,
  openAvoelineFolderAction,
  setDefaultSenderAction,
  testConnectionAction,
} from "../actions/connections.action";
import { CapacityStrip } from "./CapacityStrip";
import { CalendarPicker } from "./CalendarPicker";
import { CalendarLinksHubPanel } from "./CalendarLinksHubPanel";
import { SheetSyncsHubPanel } from "./SheetSyncsHubPanel";
import { OrganizerLibraryClient } from "./OrganizerLibraryClient";
import { EmailBatchesClient } from "./EmailBatchesClient";
import { ConnectDialog } from "./ConnectDialog";
import { PermissionList } from "./PermissionList";
import type { OwnerCalendarLinkRow } from "../server/calendarSync.service";
import type { OwnerSheetSyncRow } from "../server/sheetSync.service";

function cardShell({
  id,
  title,
  benefit,
  children,
}: {
  id: string;
  title: string;
  benefit: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-4 rounded-2xl border border-line bg-paper p-5">
      <div>
        <h2 className="font-display text-lg text-ink">{title}</h2>
        <p className="mt-1 text-sm text-ink-soft">{benefit}</p>
      </div>
      {children}
    </section>
  );
}

function EnableButton({
  entry,
  ownerId,
  ownerType,
  googleReady,
  loginHint,
  label = "Enable",
}: {
  entry: IntegrationCatalogEntry;
  ownerId: string;
  ownerType: "user" | "org";
  googleReady: boolean;
  loginHint?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        disabled={!googleReady || !entry.active}
        className="rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-paper disabled:opacity-50"
        onClick={() => setOpen(true)}
      >
        {label}
      </button>
      <ConnectDialog
        open={open}
        onClose={() => setOpen(false)}
        entry={entry}
        ownerId={ownerId}
        ownerType={ownerType}
        loginHint={loginHint}
      />
    </>
  );
}

function StatusLine({ enabled }: { enabled: boolean }) {
  return (
    <p className="text-xs font-medium text-ink-soft">
      Status:{" "}
      <span className={enabled ? "text-emerald-800" : "text-amber-900"}>
        {enabled ? "Enabled" : "Not enabled"}
      </span>
    </p>
  );
}

export function EmailIntegrationCard({
  connections,
  ownerId,
  ownerType = "user",
  googleReady,
  showCapacity,
  emailBatches,
}: {
  connections: ConnectionPublic[];
  ownerId: string;
  ownerType?: "user" | "org";
  googleReady: boolean;
  showCapacity?: boolean;
  emailBatches?: {
    rows: Parameters<typeof EmailBatchesClient>[0]["initialRows"];
    nextCursor: Parameters<typeof EmailBatchesClient>[0]["initialCursor"];
  };
}) {
  const entry = getCatalogEntry("email.send")!;
  const conn = findConnectionWithCapability(connections, "email.send");
  const any = primaryActiveConnection(connections);
  const enabled = Boolean(conn);
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return cardShell({
    id: "email",
    title: "Email",
    benefit: entry.benefit,
    children: (
      <>
        <PermissionList allows={entry.allows} never={entry.never} />
        <StatusLine enabled={enabled} />
        {!enabled ? (
          <EnableButton
            entry={entry}
            ownerId={ownerId}
            ownerType={ownerType}
            googleReady={googleReady}
            loginHint={any?.providerEmail}
          />
        ) : (
          <div className="space-y-3">
            {showCapacity && ownerType === "user" ? (
              <CapacityStrip ownerId={ownerId} kind="custom" />
            ) : (
              <p className="text-xs text-ink-soft">
                Bounces are not visible with send-only Gmail permission — check your Sent/Inbox for
                failures.
              </p>
            )}
            <p className="text-sm text-ink-soft">
              Default sender: <span className="font-medium text-ink">{conn!.providerEmail}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={pending}
                className="rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-paper disabled:opacity-50"
                onClick={() =>
                  start(async () => {
                    const r = await testConnectionAction({ connectionId: conn!.id });
                    if (r.ok) {
                      setError(null);
                      setMessage(`Test email sent to you.`);
                    } else {
                      setMessage(null);
                      setError(formatSafeActionError(r.error));
                    }
                  })
                }
              >
                Send test email to me
              </button>
              <button
                type="button"
                disabled={pending}
                className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink disabled:opacity-50"
                onClick={() =>
                  start(async () => {
                    const r = await setDefaultSenderAction({
                      ownerId,
                      ownerType,
                      connectionId: conn!.id,
                    });
                    if (r.ok) {
                      setError(null);
                      setMessage("Set as default sender.");
                    } else {
                      setMessage(null);
                      setError(formatSafeActionError(r.error));
                    }
                  })
                }
              >
                Set as default sender
              </button>
              <a
                href="#email-sent"
                className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink"
              >
                Sent emails
              </a>
            </div>
            {message ? <p className="text-xs text-emerald-800">{message}</p> : null}
            {error ? <p className="text-xs text-red-700">{error}</p> : null}
            {emailBatches ? (
              <div id="email-sent" className="scroll-mt-24 border-t border-line pt-4">
                <h3 className="mb-2 text-sm font-medium text-ink">Sent emails</h3>
                <EmailBatchesClient
                  ownerId={ownerId}
                  initialRows={emailBatches.rows}
                  initialCursor={emailBatches.nextCursor}
                />
              </div>
            ) : null}
          </div>
        )}
      </>
    ),
  });
}

export function CalendarMeetIntegrationCard({
  connections,
  ownerId,
  ownerType = "user",
  googleReady,
  calendarLinks = [],
}: {
  connections: ConnectionPublic[];
  ownerId: string;
  ownerType?: "user" | "org";
  googleReady: boolean;
  calendarLinks?: OwnerCalendarLinkRow[];
}) {
  const calEntry = getCatalogEntry("calendar")!;
  const meetEntry = getCatalogEntry("meet")!;
  const calConn = findConnectionWithCapability(connections, "calendar");
  const meetConn =
    findConnectionWithCapability(connections, "meet") ||
    (calConn && hasEnabledCapability(calConn, "meet") ? calConn : undefined);
  const any = primaryActiveConnection(connections);
  const calendarOn = Boolean(calConn);
  const meetOn = Boolean(meetConn) || (calConn ? hasEnabledCapability(calConn, "meet") : false);
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testLink, setTestLink] = useState<string | null>(null);

  const benefit = `${calEntry.benefit} ${meetEntry.benefit}`;

  return cardShell({
    id: "calendar",
    title: "Calendar and Meet",
    benefit,
    children: (
      <>
        <PermissionList allows={[...calEntry.allows, ...meetEntry.allows]} never={calEntry.never} />
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="inline-flex items-center gap-2 text-ink">
            <input type="checkbox" checked={calendarOn} readOnly disabled className="rounded" />
            Calendar
          </label>
          <label className="inline-flex items-center gap-2 text-ink">
            <input type="checkbox" checked={meetOn} readOnly disabled className="rounded" />
            Meet
          </label>
        </div>
        <StatusLine enabled={calendarOn} />
        {!calendarOn ? (
          <EnableButton
            entry={calEntry}
            ownerId={ownerId}
            ownerType={ownerType}
            googleReady={googleReady}
            loginHint={any?.providerEmail}
            label="Enable"
          />
        ) : (
          <div className="space-y-3">
            <CalendarPicker connectionId={calConn!.id} />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={pending}
                className="rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-paper disabled:opacity-50"
                onClick={() =>
                  start(async () => {
                    const r = await createTestCalendarEventAction({ connectionId: calConn!.id });
                    if (r.ok) {
                      setError(null);
                      setTestLink(r.data.htmlLink);
                      setMessage(
                        r.data.cleanedUp
                          ? "Test event created and removed."
                          : "Test event created (cleanup may have failed).",
                      );
                    } else {
                      setMessage(null);
                      setTestLink(null);
                      setError(formatSafeActionError(r.error));
                    }
                  })
                }
              >
                Create a test event
              </button>
              <button
                type="button"
                disabled={pending}
                className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink disabled:opacity-50"
                onClick={() =>
                  start(async () => {
                    const r = await createTestMeetLinkAction({ connectionId: calConn!.id });
                    if (r.ok) {
                      setError(null);
                      setTestLink(r.data.meetUrl || r.data.htmlLink);
                      setMessage(
                        r.data.cleanedUp
                          ? "Test Meet created and removed."
                          : "Test Meet created (cleanup may have failed).",
                      );
                    } else {
                      setMessage(null);
                      setTestLink(null);
                      setError(formatSafeActionError(r.error));
                    }
                  })
                }
              >
                Create a test Meet link
              </button>
              {!meetOn ? (
                <EnableButton
                  entry={meetEntry}
                  ownerId={ownerId}
                  ownerType={ownerType}
                  googleReady={googleReady}
                  loginHint={calConn?.providerEmail}
                  label="Enable Meet"
                />
              ) : null}
            </div>
            {testLink ? (
              <p className="text-xs text-ink-soft">
                Link:{" "}
                <a href={testLink} className="underline" target="_blank" rel="noreferrer">
                  {testLink}
                </a>
              </p>
            ) : null}
            {message ? <p className="text-xs text-emerald-800">{message}</p> : null}
            {error ? <p className="text-xs text-red-700">{error}</p> : null}
            <div className="border-t border-line pt-4">
              <h3 className="mb-2 text-sm font-medium text-ink">Recent synced events</h3>
              <CalendarLinksHubPanel links={calendarLinks} />
            </div>
          </div>
        )}
      </>
    ),
  });
}

export function DriveIntegrationCard({
  connections,
  ownerId,
  ownerType = "user",
  googleReady,
  showLibrary,
}: {
  connections: ConnectionPublic[];
  ownerId: string;
  ownerType?: "user" | "org";
  googleReady: boolean;
  showLibrary?: boolean;
}) {
  const entry = getCatalogEntry("drive.files")!;
  const conn = findConnectionWithCapability(connections, "drive.files");
  const any = primaryActiveConnection(connections);
  const enabled = Boolean(conn);
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [folderLink, setFolderLink] = useState<string | null>(null);

  return cardShell({
    id: "drive",
    title: "Drive and Files",
    benefit: entry.benefit,
    children: (
      <>
        <PermissionList allows={entry.allows} never={entry.never} />
        <StatusLine enabled={enabled} />
        {!enabled ? (
          <EnableButton
            entry={entry}
            ownerId={ownerId}
            ownerType={ownerType}
            googleReady={googleReady}
            loginHint={any?.providerEmail}
          />
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={pending}
                className="rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-paper disabled:opacity-50"
                onClick={() =>
                  start(async () => {
                    const r = await openAvoelineFolderAction({ connectionId: conn!.id });
                    if (r.ok && r.data.webViewLink) {
                      setError(null);
                      setFolderLink(r.data.webViewLink);
                      window.open(r.data.webViewLink, "_blank", "noopener,noreferrer");
                    } else if (!r.ok) {
                      setError(formatSafeActionError(r.error));
                    }
                  })
                }
              >
                Open the Avoeline folder
              </button>
              <button
                type="button"
                disabled={pending}
                className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink disabled:opacity-50"
                onClick={() =>
                  start(async () => {
                    const r = await createTestDriveFolderAction({ connectionId: conn!.id });
                    if (r.ok) {
                      setError(null);
                      setFolderLink(r.data.webViewLink);
                      setMessage(
                        r.data.cleanedUp
                          ? "Test folder created and removed."
                          : "Test folder created (cleanup may have failed).",
                      );
                    } else {
                      setMessage(null);
                      setError(formatSafeActionError(r.error));
                    }
                  })
                }
              >
                Create a test folder
              </button>
              <a
                href="#drive-library"
                className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-ink"
              >
                All files
              </a>
            </div>
            {folderLink ? (
              <p className="text-xs text-ink-soft">
                Link:{" "}
                <a href={folderLink} className="underline" target="_blank" rel="noreferrer">
                  {folderLink}
                </a>
              </p>
            ) : null}
            {message ? <p className="text-xs text-emerald-800">{message}</p> : null}
            {error ? <p className="text-xs text-red-700">{error}</p> : null}
            {showLibrary ? (
              <div id="drive-library" className="scroll-mt-24 border-t border-line pt-4">
                <h3 className="mb-2 text-sm font-medium text-ink">All files</h3>
                <OrganizerLibraryClient organizerId={ownerId} />
              </div>
            ) : null}
          </div>
        )}
      </>
    ),
  });
}

export function SheetsIntegrationCard({
  connections,
  ownerId,
  ownerType = "user",
  googleReady,
  sheetSyncs = [],
}: {
  connections: ConnectionPublic[];
  ownerId: string;
  ownerType?: "user" | "org";
  googleReady: boolean;
  sheetSyncs?: OwnerSheetSyncRow[];
}) {
  const entry = getCatalogEntry("sheets.sync")!;
  const conn =
    findConnectionWithCapability(connections, "sheets.sync") ||
    findConnectionWithCapability(connections, "drive.files");
  const sheetsOn = Boolean(findConnectionWithCapability(connections, "sheets.sync"));
  const any = primaryActiveConnection(connections);
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sheetLink, setSheetLink] = useState<string | null>(null);

  return cardShell({
    id: "sheets",
    title: "Sheets",
    benefit: entry.benefit,
    children: (
      <>
        <PermissionList allows={entry.allows} never={entry.never} />
        <StatusLine enabled={sheetsOn} />
        {!sheetsOn ? (
          <EnableButton
            entry={entry}
            ownerId={ownerId}
            ownerType={ownerType}
            googleReady={googleReady}
            loginHint={any?.providerEmail}
          />
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={pending || !conn}
                className="rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-paper disabled:opacity-50"
                onClick={() =>
                  start(async () => {
                    if (!conn) return;
                    const r = await createTestSheetAction({ connectionId: conn.id });
                    if (r.ok) {
                      setError(null);
                      setSheetLink(r.data.webViewLink);
                      setMessage(
                        r.data.cleanedUp
                          ? "Test sheet created and removed."
                          : "Test sheet created (cleanup may have failed).",
                      );
                    } else {
                      setMessage(null);
                      setError(formatSafeActionError(r.error));
                    }
                  })
                }
              >
                Create a test sheet
              </button>
            </div>
            {sheetLink ? (
              <p className="text-xs text-ink-soft">
                Link:{" "}
                <a href={sheetLink} className="underline" target="_blank" rel="noreferrer">
                  {sheetLink}
                </a>
              </p>
            ) : null}
            {message ? <p className="text-xs text-emerald-800">{message}</p> : null}
            {error ? <p className="text-xs text-red-700">{error}</p> : null}
            <div className="border-t border-line pt-4">
              <h3 className="mb-2 text-sm font-medium text-ink">Linked sheets</h3>
              <SheetSyncsHubPanel ownerId={ownerId} syncs={sheetSyncs} />
            </div>
          </div>
        )}
      </>
    ),
  });
}

/** @deprecated kept for type imports that referenced capability keys in tests */
export type CapabilityCardKey = ConnectionCapability;
