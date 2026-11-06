import { ConnectionsHub, type ConnectionsHubTab } from "./ConnectionsHub";
import type { CatalogScope } from "../catalog";
import type { ConnectionPublic } from "../types";
import type { OwnerCalendarLinkRow } from "../server/calendarSync.service";
import type { OwnerSheetSyncRow } from "../server/sheetSync.service";

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
  tab,
  hubBasePath,
  calendarLinks,
  sheetSyncs,
  emailBatches,
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
  tab?: ConnectionsHubTab;
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
      tab={tab}
      hubBasePath={
        hubBasePath ||
        (ownerType === "user"
          ? `/organizer/${ownerId}/settings/connections`
          : `/department/settings/connections`)
      }
      calendarLinks={calendarLinks}
      sheetSyncs={sheetSyncs}
      emailBatches={emailBatches}
    />
  );
}
