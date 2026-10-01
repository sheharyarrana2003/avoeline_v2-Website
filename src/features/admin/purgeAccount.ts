import { adminAuth } from "@/data/admin_db";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";

async function authIdsForOrg(orgId: string): Promise<string[]> {
  const [{ data: org }, { data: members }, { data: children }] = await Promise.all([
    supabaseAdmin.from(TABLES.ORGANIZATIONS).select("id, owner_user_id").eq("id", orgId).maybeSingle(),
    supabaseAdmin
      .from(TABLES.ORG_MEMBERSHIPS)
      .select("user_id, role")
      .eq("org_id", orgId)
      .in("role", ["department_admin", "president"]),
    supabaseAdmin.from(TABLES.ORGANIZATIONS).select("id").eq("parent_org_id", orgId),
  ]);

  const ids = new Set<string>();
  if (org?.owner_user_id) ids.add(String(org.owner_user_id));
  for (const row of members ?? []) ids.add(String(row.user_id));
  for (const child of children ?? []) {
    for (const id of await authIdsForOrg(String(child.id))) ids.add(id);
  }

  if (ids.size === 0) return [];
  const { data: users } = await supabaseAdmin
    .from(TABLES.USERS)
    .select("id, is_owner, user_type")
    .in("id", [...ids]);
  return (users ?? [])
    .filter((u) => !u.is_owner && String(u.user_type) !== "platform_admin")
    .map((u) => String(u.id));
}

export async function purgeUserWithAuth(userId: string): Promise<void> {
  const { error } = await supabaseAdmin.rpc("admin_purge_user", { target: userId });
  if (error) throw error;
  await adminAuth.deleteUser(userId);
}

export async function purgeOrgWithAuth(orgId: string): Promise<void> {
  const authIds = await authIdsForOrg(orgId);
  const { error } = await supabaseAdmin.rpc("admin_purge_org", { target: orgId });
  if (error) throw error;
  await Promise.all(authIds.map((id) => adminAuth.deleteUser(id).catch(() => {})));
}
