import type { CatalogScope } from "../catalog";
import { catalogForScope } from "../catalog";
import type { ConnectionPublic } from "../types";
import type { OwnerCalendarLinkRow } from "../server/calendarSync.service";
import type { OwnerSheetSyncRow } from "../server/sheetSync.service";
import type { diagnoseGoogleConnectionsEnv } from "@/src/env";
import { BlockedByAdminBanner } from "./BlockedByAdminBanner";
import { ConnectionGrantsPanel } from "./ConnectionGrantsPanel";
import { GoogleAccountCard } from "./GoogleAccountCard";
import { ConnectionsOAuthStatus } from "./ConnectionsOAuthStatus";
import {
  CalendarMeetIntegrationCard,
  DriveIntegrationCard,
  EmailIntegrationCard,
  SheetsIntegrationCard,
} from "./CapabilityIntegrationCards";
import { EmailBatchesClient } from "./EmailBatchesClient";
import { formatConnectionUserError } from "../lib/connectionUserErrors";

export function ConnectionsHub({
  ownerType,
  ownerId,
  connections,
  googleReady,
  catalogScope = "organizer",
  showCapacity = true,
  showGrants = false,
  personalConnections,
  personalOwnerId,
  error,
  success,
  blockedNote,
  hubBasePath: _hubBasePath,
  calendarLinks = [],
  sheetSyncs = [],
  emailBatches,
  oauthDiagnostics,
}: {
  ownerType: "user" | "org";
  ownerId: string;
  connections: ConnectionPublic[];
  googleReady: boolean;
  catalogScope?: CatalogScope;
  showCapacity?: boolean;
  showGrants?: boolean;
  personalConnections?: ConnectionPublic[];
  personalOwnerId?: string;
  error?: string | null;
  success?: string | null;
  blockedNote?: string | null;
  /** @deprecated tabs removed; kept for call-site compatibility */
  hubBasePath?: string;
  calendarLinks?: OwnerCalendarLinkRow[];
  sheetSyncs?: OwnerSheetSyncRow[];
  emailBatches?: {
    rows: Parameters<typeof EmailBatchesClient>[0]["initialRows"];
    nextCursor: Parameters<typeof EmailBatchesClient>[0]["initialCursor"];
  };
  oauthDiagnostics?: ReturnType<typeof diagnoseGoogleConnectionsEnv> | null;
}) {
  const showOrganizerExtras = ownerType === "user" && catalogScope === "organizer";
  const showSheets = catalogForScope(catalogScope).some((e) => e.key === "sheets.sync");
  const blocked = connections.filter((c) => c.status === "blocked_by_admin");
  const ownerChanged = connections.filter(
    (c) => c.status === "needs_reconnect" && c.lastError === "owner_changed",
  );
  const safeError = error ? formatConnectionUserError(error, error) : null;

  return (
    <div className="space-y-6">
      {safeError ? (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
        >
          {safeError}
        </p>
      ) : null}
      {success ? (
        <p
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
        >
          {success}
        </p>
      ) : null}
      {ownerChanged.length ? (
        <p
          role="status"
          className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        >
          Owner changed — re-authorize the organization Google account. Any org admin can reconnect
          or disconnect it.
        </p>
      ) : null}
      {blocked.length && blockedNote ? <BlockedByAdminBanner note={blockedNote} /> : null}

      <ConnectionsOAuthStatus
        googleReady={googleReady}
        hasAccounts={connections.length > 0}
        diagnostics={oauthDiagnostics}
      />

      <p className="text-sm text-ink-soft">
        Connect Google for email, Calendar, Meet, Drive, and Sheets. Disconnect any account below at
        any time. Platform mail still uses Avoeline Resend — not these connections.
      </p>

      <div className="space-y-4">
        {connections.map((c) => (
          <GoogleAccountCard
            key={c.id}
            connection={c}
            ownerId={ownerId}
            ownerType={ownerType}
            googleReady={googleReady}
          />
        ))}
        {!connections.length ? (
          <p className="rounded-2xl border border-dashed border-line bg-canvas/30 px-4 py-6 text-sm text-ink-soft">
            No Google account connected yet. Enable Email below to connect your first account.
          </p>
        ) : null}
      </div>

      <EmailIntegrationCard
        connections={connections}
        ownerId={ownerId}
        ownerType={ownerType}
        googleReady={googleReady}
        showCapacity={showCapacity}
        emailBatches={showOrganizerExtras ? emailBatches : undefined}
      />

      {showGrants
        ? connections
            .filter((c) => c.capabilities.some((cap) => cap.capability === "email.send"))
            .map((c) => (
              <ConnectionGrantsPanel key={`grant-${c.id}`} connection={c} orgId={ownerId} />
            ))
        : null}

      <CalendarMeetIntegrationCard
        connections={connections}
        ownerId={ownerId}
        ownerType={ownerType}
        googleReady={googleReady}
        calendarLinks={showOrganizerExtras ? calendarLinks : []}
      />

      <DriveIntegrationCard
        connections={connections}
        ownerId={ownerId}
        ownerType={ownerType}
        googleReady={googleReady}
        showLibrary={showOrganizerExtras}
      />

      {showSheets ? (
        <SheetsIntegrationCard
          connections={connections}
          ownerId={ownerId}
          ownerType={ownerType}
          googleReady={googleReady}
          sheetSyncs={showOrganizerExtras ? sheetSyncs : []}
        />
      ) : null}

      {personalOwnerId && personalConnections ? (
        <section className="space-y-3 border-t border-line pt-6">
          <h2 className="font-display text-lg text-ink">Your personal connections</h2>
          <p className="text-sm text-ink-soft">
            Optional. In the sender picker you can choose “Me” or the organization.
          </p>
          {personalConnections.map((c) => (
            <GoogleAccountCard
              key={`personal-${c.id}`}
              connection={c}
              ownerId={personalOwnerId}
              ownerType="user"
              googleReady={googleReady}
            />
          ))}
          <EmailIntegrationCard
            connections={personalConnections}
            ownerId={personalOwnerId}
            ownerType="user"
            googleReady={googleReady}
            showCapacity={false}
          />
        </section>
      ) : null}
    </div>
  );
}
