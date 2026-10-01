import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import type { CurrentUserData } from "@/src/services/models/user.type";

type OrgRow = { id: string; org_type: string; parent_org_id: string | null; owner_user_id: string | null };

async function readOrg(orgId: string): Promise<OrgRow | null> {
  if (!orgId) return null;
  const { data } = await supabaseAdmin
    .from(TABLES.ORGANIZATIONS)
    .select("id, org_type, parent_org_id, owner_user_id")
    .eq("id", orgId)
    .maybeSingle();
  return (data as OrgRow | null) ?? null;
}

function isPlatformAdmin(user: CurrentUserData): boolean {
  return user.role === "platform_admin" || user.userType === "admin";
}

/** Department admin of this department, or of the department a club sits under. */
export async function canManageOrg(user: CurrentUserData | null, orgId: string): Promise<boolean> {
  if (!user?.userId) return false;
  if (isPlatformAdmin(user)) return true;
  const org = await readOrg(orgId);
  if (!org) return false;
  const departmentId = org.org_type === "department" ? org.id : org.parent_org_id;
  if (!departmentId) return false;
  if (user.role === "department_admin" && (user.orgId === departmentId || user.managedOrgIds?.includes(departmentId))) return true;
  if (org.org_type === "department") return org.owner_user_id === user.userId;
  const dept = await readOrg(departmentId);
  return dept?.owner_user_id === user.userId;
}

/** The club's president (membership or owner), or anyone who manages its department. */
export async function canLeadClub(user: CurrentUserData | null, clubId: string): Promise<boolean> {
  if (!user?.userId) return false;
  if (user.presidentOfOrgIds?.includes(clubId)) return true;
  const org = await readOrg(clubId);
  if (org?.org_type === "club" && org.owner_user_id === user.userId) return true;
  return canManageOrg(user, clubId);
}
