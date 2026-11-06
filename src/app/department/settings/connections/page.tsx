import { redirect } from "next/navigation";
import Link from "next/link";
import { AuthService } from "@/src/features/auth/authService";
import { ConnectionsPage } from "@/src/features/connections/components/ConnectionsPage";
import {
  googleConnectionsConfigured,
  listConnections,
} from "@/src/features/connections/server/connections.service";
import { canManageConnections } from "@/src/features/connections/server/assertConnectionsAccess";
import { consumeReconnectToken } from "@/src/features/connections/server/reconnectTokens.service";
import { buildBlockedByAdminNote } from "@/src/features/connections/lib/blockedByAdminCopy";
import { getGoogleOAuthConfig } from "@/src/env";
import { resolveDepartment } from "@/src/features/department/department.service";
import PageHeader from "@/src/shared_components/ui/PageHeader";

export default async function DepartmentConnectionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    e?: string;
    ok?: string;
    t?: string;
    reconnect?: string;
    orgId?: string;
  }>;
}) {
  const user = await AuthService.getCurrentUser();
  if (!user) redirect("/signin?next=/department/settings/connections");
  const sp = await searchParams;
  const { department } = await resolveDepartment(sp.orgId);
  if (!(await canManageConnections(user, department.id))) redirect("/access-denied");

  let reconnectOk: string | undefined;
  let reconnectErr: string | undefined;
  if (sp.t) {
    const consumed = await consumeReconnectToken({
      token: sp.t,
      ownerType: "org",
      ownerId: department.id,
    });
    if (consumed.ok) reconnectOk = "Reconnect link accepted — connect Google below.";
    else reconnectErr = consumed.error;
  }

  const [connections, personal, googleReady] = await Promise.all([
    listConnections({ ownerType: "org", ownerId: department.id, includeQuota: true }),
    listConnections({ ownerType: "user", ownerId: user.userId, includeQuota: true }),
    Promise.resolve(googleConnectionsConfigured()),
  ]);
  const oauth = getGoogleOAuthConfig();
  const blockedNote = buildBlockedByAdminNote({ clientId: oauth.clientId || "" });

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader
        title="Connections"
        description="Organization Google account for department email. Grant members use below."
      />
      <p className="mb-4 text-sm text-ink-soft">
        <Link href="/department" className="underline hover:text-ink">
          Back to department
        </Link>
      </p>
      <ConnectionsPage
        ownerType="org"
        ownerId={department.id}
        connections={connections}
        googleReady={googleReady}
        catalogScope="org"
        showCapacity={false}
        showBatchesLink={false}
        showGrants
        personalConnections={personal}
        personalOwnerId={user.userId}
        error={sp.e || reconnectErr}
        success={sp.ok || reconnectOk}
        blockedNote={blockedNote}
      />
    </div>
  );
}
