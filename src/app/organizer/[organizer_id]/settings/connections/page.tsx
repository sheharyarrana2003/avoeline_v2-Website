import { redirect } from "next/navigation";
import Link from "next/link";
import { AuthService } from "@/src/features/auth/authService";
import { ConnectionsPage } from "@/src/features/connections/components/ConnectionsPage";
import type { ConnectionsHubTab } from "@/src/features/connections/components/ConnectionsHub";
import { DelayedConfirmationsBanner } from "@/src/features/connections/components/DelayedConfirmationsBanner";
import {
  googleConnectionsConfigured,
  listConnections,
} from "@/src/features/connections/server/connections.service";
import { listCalendarLinksForOwner } from "@/src/features/connections/server/calendarSync.service";
import { listSheetSyncsForOwner } from "@/src/features/connections/server/sheetSync.service";
import { listBatches } from "@/src/features/connections/server/batch.service";
import { consumeReconnectToken } from "@/src/features/connections/server/reconnectTokens.service";
import { buildBlockedByAdminNote } from "@/src/features/connections/lib/blockedByAdminCopy";
import { getGoogleOAuthConfig } from "@/src/env";
import PageHeader from "@/src/shared_components/ui/PageHeader";

const TABS = new Set<ConnectionsHubTab>(["accounts", "library", "calendar", "sheets", "email"]);

export default async function OrganizerConnectionsSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ organizer_id: string }>;
  searchParams: Promise<{ e?: string; ok?: string; t?: string; reconnect?: string; tab?: string }>;
}) {
  const { organizer_id } = await params;
  const sp = await searchParams;
  const user = await AuthService.getCurrentUser();
  if (!user) redirect(`/auth/signin?next=/organizer/${organizer_id}/settings/connections`);
  if (user.userId !== organizer_id) {
    const admin = await AuthService.requireAdmin("organizers");
    if (!admin?.isOwner) redirect("/access-denied");
  }

  let reconnectOk: string | undefined;
  let reconnectErr: string | undefined;
  if (sp.t) {
    const consumed = await consumeReconnectToken({
      token: sp.t,
      ownerType: "user",
      ownerId: organizer_id,
    });
    if (consumed.ok) reconnectOk = "Reconnect link accepted — connect Google below.";
    else reconnectErr = consumed.error;
  }

  const tabRaw = String(sp.tab || "accounts") as ConnectionsHubTab;
  const tab = TABS.has(tabRaw) ? tabRaw : "accounts";
  const hubBase = `/organizer/${organizer_id}/settings/connections`;

  const [connections, googleReady, calendarLinks, sheetSyncs, emailPage] = await Promise.all([
    listConnections({ ownerType: "user", ownerId: organizer_id, includeQuota: true }),
    Promise.resolve(googleConnectionsConfigured()),
    listCalendarLinksForOwner({ ownerType: "user", ownerId: organizer_id }),
    listSheetSyncsForOwner({ ownerType: "user", ownerId: organizer_id }),
    listBatches({ ownerId: organizer_id, limit: 20 }),
  ]);
  const oauth = getGoogleOAuthConfig();
  const blockedNote = buildBlockedByAdminNote({ clientId: oauth.clientId || "" });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader
        title="Connections"
        description="Google accounts, Drive library, calendar syncs, Sheets, and sent email."
      />
      <p className="mb-4 text-sm text-ink-soft">
        <Link href={`/organizer/${organizer_id}/profile`} className="underline hover:text-ink">
          Back to profile
        </Link>
        {" · "}
        <Link href={`/organizer/${organizer_id}/forms`} className="underline hover:text-ink">
          Custom Forms
        </Link>
      </p>
      <div className="mb-4">
        <DelayedConfirmationsBanner ownerId={organizer_id} />
      </div>
      <ConnectionsPage
        ownerType="user"
        ownerId={organizer_id}
        connections={connections}
        googleReady={googleReady}
        catalogScope="organizer"
        hubBasePath={hubBase}
        tab={tab}
        calendarLinks={calendarLinks}
        sheetSyncs={sheetSyncs}
        emailBatches={{ rows: emailPage.rows, nextCursor: emailPage.nextCursor }}
        error={sp.e || reconnectErr}
        success={sp.ok || reconnectOk}
        blockedNote={blockedNote}
      />
    </div>
  );
}
