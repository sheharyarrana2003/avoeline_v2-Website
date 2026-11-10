import { ConnectionsHub } from "./ConnectionsHub";
import type { CatalogScope } from "../catalog";
import type { ConnectionPublic } from "../types";
import type { OwnerCalendarLinkRow } from "../server/calendarSync.service";
import type { OwnerSheetSyncRow } from "../server/sheetSync.service";
import type { diagnoseGoogleConnectionsEnv } from "@/src/env";

/** Thin wrapper around ConnectionsHub for organizer/vendor/department pages. */
export function ConnectionsPage({
  ownerType,
  ownerId,
  connections,
  googleReady,
  catalogScope = "organizer",
  showCapacity = true,
  showBatchesLink: _showBatchesLink = true,
  showGrants = false,
  personalConnections,
  personalOwnerId,
  error,
  success,
  blockedNote,
  hubBasePath,
  calendarLinks,
  sheetSyncs,
  emailBatches,
  oauthDiagnostics,
}: {
  ownerType: "user" | "org";
  ownerId: string;
  connections: ConnectionPublic[];
  googleReady: boolean;
  catalogScope?: CatalogScope;
  showCapacity?: boolean;
  showBatchesLink?: boolean;
  showGrants?: boolean;
  personalConnections?: ConnectionPublic[];
  personalOwnerId?: string;
  error?: string | null;
  success?: string | null;
  blockedNote?: string | null;
  hubBasePath?: string;
  calendarLinks?: OwnerCalendarLinkRow[];
  sheetSyncs?: OwnerSheetSyncRow[];
  emailBatches?: {
    rows: Array<{
      id: string;
      kind: string;
      total: number;
      sent: number;
      failed: number;
      skipped: number;
      cancelled: number;
      status: string;
      not_before: string | null;
      subject: string | null;
      created_at: string;
    }>;
    nextCursor: { createdAt: string; id: string } | null;
  };
  oauthDiagnostics?: ReturnType<typeof diagnoseGoogleConnectionsEnv> | null;
}) {
  return (
    <ConnectionsHub
      ownerType={ownerType}
      ownerId={ownerId}
      connections={connections}
      googleReady={googleReady}
      catalogScope={catalogScope}
      showCapacity={showCapacity}
      showGrants={showGrants}
      personalConnections={personalConnections}
      personalOwnerId={personalOwnerId}
      error={error}
      success={success}
      blockedNote={blockedNote}
      hubBasePath={
        hubBasePath ||
        (ownerType === "user"
          ? `/organizer/${ownerId}/settings/connections`
          : `/department/settings/connections`)
      }
      calendarLinks={calendarLinks}
      sheetSyncs={sheetSyncs}
      emailBatches={emailBatches}
      oauthDiagnostics={oauthDiagnostics}
    />
  );
}
