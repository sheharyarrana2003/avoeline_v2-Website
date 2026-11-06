import { redirect } from "next/navigation";
import Link from "next/link";
import { AuthService } from "@/src/features/auth/authService";
import { ConnectionsPage } from "@/src/features/connections/components/ConnectionsPage";
import {
  googleConnectionsConfigured,
  listConnections,
} from "@/src/features/connections/server/connections.service";
import { buildBlockedByAdminNote } from "@/src/features/connections/lib/blockedByAdminCopy";
import { getGoogleOAuthConfig } from "@/src/env";
import PageHeader from "@/src/shared_components/ui/PageHeader";

export default async function VendorConnectionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ vendor_id: string }>;
  searchParams: Promise<{ e?: string; ok?: string }>;
}) {
  const { vendor_id } = await params;
  const { e, ok } = await searchParams;
  const user = await AuthService.getCurrentUser();
  if (!user) redirect(`/signin?next=/vendor/${vendor_id}/settings/connections`);
  if (user.userId !== vendor_id) {
    const admin = await AuthService.requireAdmin("vendors");
    if (!admin?.isOwner) redirect("/access-denied");
  }

  const [connections, googleReady] = await Promise.all([
    listConnections({ ownerType: "user", ownerId: vendor_id, includeQuota: true }),
    Promise.resolve(googleConnectionsConfigured()),
  ]);
  const oauth = getGoogleOAuthConfig();
  const blockedNote = buildBlockedByAdminNote({
    clientId: oauth.clientId || "",
    capabilities: ["email.send", "calendar", "meet", "drive.files"],
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader
        title="Connections"
        description="Optional Gmail for quotes, plus Calendar, Meet, and Drive when enabled."
      />
      <p className="mb-4 text-sm text-ink-soft">
        <Link href={`/vendor/${vendor_id}/profile`} className="underline hover:text-ink">
          Back to profile
        </Link>
      </p>
      <ConnectionsPage
        ownerType="user"
        ownerId={vendor_id}
        connections={connections}
        googleReady={googleReady}
        catalogScope="vendor"
        showBatchesLink={false}
        error={e}
        success={ok}
        blockedNote={blockedNote}
      />
    </div>
  );
}
