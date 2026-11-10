import { redirect } from "next/navigation";
import { AuthService } from "@/src/features/auth/authService";
import { ConnectionsPage } from "@/src/features/connections/components/ConnectionsPage";
import { DelayedConfirmationsBanner } from "@/src/features/connections/components/DelayedConfirmationsBanner";
import { ScrollToConnectionSection } from "@/src/features/connections/components/ScrollToConnectionSection";
import {
  googleConnectionsConfigured,
  listConnections,
} from "@/src/features/connections/server/connections.service";
import { listCalendarLinksForOwner } from "@/src/features/connections/server/calendarSync.service";
import { listSheetSyncsForOwner } from "@/src/features/connections/server/sheetSync.service";
import { listBatches } from "@/src/features/connections/server/batch.service";
import { consumeReconnectToken } from "@/src/features/connections/server/reconnectTokens.service";
import { buildBlockedByAdminNote } from "@/src/features/connections/lib/blockedByAdminCopy";
import { diagnoseGoogleConnectionsEnv, getGoogleOAuthConfig } from "@/src/env";
import PageHeader from "@/src/shared_components/ui/PageHeader";

const TAB_TO_SECTION: Record<string, string> = {
  library: "drive",
  email: "email",
  calendar: "calendar",
  sheets: "sheets",
  accounts: "",
};

export default async function OrganizerConnectionsSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ organizer_id: string }>;
  searchParams: Promise<{
    e?: string;
    ok?: string;
    t?: string;
    reconnect?: string;
    tab?: string;
    section?: string;
  }>;
}) {
  const { organizer_id } = await params;
  const sp = await searchParams;
  const user = await AuthService.getCurrentUser();
  if (!user) redirect(`/auth/signin?next=/organizer/${organizer_id}/settings/connections`);
  if (user.userId !== organizer_id) {
    const admin = await AuthService.requireAdmin("organizers");
    if (!admin?.isOwner) redirect("/access-denied");
  }

  // Legacy ?tab= → ?section= (tabs removed; server redirects cannot keep #hash).
  if (sp.tab && TAB_TO_SECTION[sp.tab] !== undefined && !sp.section) {
    const section = TAB_TO_SECTION[sp.tab];
    const q = new URLSearchParams();
    if (sp.e) q.set("e", sp.e);
    if (sp.ok) q.set("ok", sp.ok);
    if (sp.t) q.set("t", sp.t);
    if (sp.reconnect) q.set("reconnect", sp.reconnect);
    if (section) q.set("section", section);
    const qs = q.toString();
    redirect(`/organizer/${organizer_id}/settings/connections${qs ? `?${qs}` : ""}`);
  }

  const section = sp.section || (sp.tab ? TAB_TO_SECTION[sp.tab] : undefined);

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

  // Platform owners / admins only — presence flags, never secret values.
  const adminIdentity = await AuthService.requireAdmin("organizers");
  const oauthDiagnostics = adminIdentity ? diagnoseGoogleConnectionsEnv() : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <ScrollToConnectionSection section={section} />
      <PageHeader
        title="Connections"
        description="Google account, email, Calendar and Meet, Drive, and Sheets."
      />
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
        calendarLinks={calendarLinks}
        sheetSyncs={sheetSyncs}
        emailBatches={{ rows: emailPage.rows, nextCursor: emailPage.nextCursor }}
        error={sp.e || reconnectErr}
        success={sp.ok || reconnectOk}
        blockedNote={blockedNote}
        oauthDiagnostics={oauthDiagnostics}
      />
    </div>
  );
}
