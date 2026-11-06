import Link from "next/link";
import { catalogForScope, type CatalogScope } from "../catalog";
import type { ConnectionPublic } from "../types";
import type { OwnerCalendarLinkRow } from "../server/calendarSync.service";
import type { OwnerSheetSyncRow } from "../server/sheetSync.service";
import { IntegrationCard } from "./IntegrationCard";
import { CapacityStrip } from "./CapacityStrip";
import { ConnectionGrantsPanel } from "./ConnectionGrantsPanel";
import { BlockedByAdminBanner } from "./BlockedByAdminBanner";
import { OrganizerLibraryClient } from "./OrganizerLibraryClient";
import { EmailBatchesClient } from "./EmailBatchesClient";
import { CalendarLinksHubPanel } from "./CalendarLinksHubPanel";
import { SheetSyncsHubPanel } from "./SheetSyncsHubPanel";

export type ConnectionsHubTab = "accounts" | "library" | "calendar" | "sheets" | "email";

const TABS: { id: ConnectionsHubTab; label: string }[] = [
  { id: "accounts", label: "Accounts" },
  { id: "library", label: "Library" },
  { id: "calendar", label: "Calendar" },
  { id: "sheets", label: "Sheets" },
  { id: "email", label: "Sent email" },
];

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
  tab = "accounts",
  hubBasePath,
  calendarLinks = [],
  sheetSyncs = [],
  emailBatches,
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
  tab?: ConnectionsHubTab;
  /** Base path for tab links, e.g. /organizer/{id}/settings/connections */
  hubBasePath: string;
  calendarLinks?: OwnerCalendarLinkRow[];
  sheetSyncs?: OwnerSheetSyncRow[];
  emailBatches?: {
    rows: Parameters<typeof EmailBatchesClient>[0]["initialRows"];
    nextCursor: Parameters<typeof EmailBatchesClient>[0]["initialCursor"];
  };
}) {
  const catalog = catalogForScope(catalogScope);
  const blocked = connections.filter((c) => c.status === "blocked_by_admin");
  const ownerChanged = connections.filter(
    (c) => c.status === "needs_reconnect" && c.lastError === "owner_changed",
  );
  const active = TABS.some((t) => t.id === tab) ? tab : "accounts";
  const showHubExtras = ownerType === "user" && catalogScope === "organizer";

  return (
    <div className="space-y-6">
      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
        >
          {error}
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

      {showHubExtras ? (
        <nav
          className="flex flex-wrap gap-1 border-b border-line pb-px"
          aria-label="Connections sections"
        >
          {TABS.map((t) => {
            const href = `${hubBasePath}?tab=${t.id}`;
            const isActive = active === t.id;
            return (
              <Link
                key={t.id}
                href={href}
                className={`rounded-t-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "border border-b-paper border-line bg-paper text-ink"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
      ) : null}

      {(!showHubExtras || active === "accounts") && (
        <div className="space-y-6">
          {showCapacity && ownerType === "user" ? (
            <CapacityStrip ownerId={ownerId} kind="custom" />
          ) : null}
          <p className="text-sm text-ink-soft">
            Connect Google for email, Calendar, Meet, Drive, and Sheets. Disconnect any account
            below at any time. Platform mail still uses Avoeline Resend — not these connections.
          </p>
          <div className="space-y-4">
            {catalog.map((entry) => (
              <div key={entry.key}>
                <IntegrationCard
                  entry={entry}
                  connections={connections}
                  ownerId={ownerId}
                  ownerType={ownerType}
                  googleReady={googleReady}
                />
                {showGrants && entry.key === "email.send"
                  ? connections
                      .filter((c) => c.capabilities.some((cap) => cap.capability === "email.send"))
                      .map((c) => (
                        <ConnectionGrantsPanel
                          key={`grant-${c.id}`}
                          connection={c}
                          orgId={ownerId}
                        />
                      ))
                  : null}
              </div>
            ))}
          </div>

          {personalOwnerId && personalConnections ? (
            <section className="space-y-3 border-t border-line pt-6">
              <h2 className="font-display text-lg text-ink">Your personal connections</h2>
              <p className="text-sm text-ink-soft">
                Optional. In the sender picker you can choose “Me” or the organization.
              </p>
              {catalogForScope("personal")
                .filter((e) => e.key === "email.send")
                .map((entry) => (
                  <IntegrationCard
                    key={`personal-${entry.key}`}
                    entry={entry}
                    connections={personalConnections}
                    ownerId={personalOwnerId}
                    ownerType="user"
                    googleReady={googleReady}
                  />
                ))}
            </section>
          ) : null}
        </div>
      )}

      {showHubExtras && active === "library" ? (
        <OrganizerLibraryClient organizerId={ownerId} />
      ) : null}

      {showHubExtras && active === "calendar" ? (
        <CalendarLinksHubPanel links={calendarLinks} />
      ) : null}

      {showHubExtras && active === "sheets" ? (
        <SheetSyncsHubPanel ownerId={ownerId} syncs={sheetSyncs} />
      ) : null}

      {showHubExtras && active === "email" && emailBatches ? (
        <EmailBatchesClient
          ownerId={ownerId}
          initialRows={emailBatches.rows}
          initialCursor={emailBatches.nextCursor}
        />
      ) : null}
    </div>
  );
}
