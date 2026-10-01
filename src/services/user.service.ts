import { cache } from "react";
import { User } from "./models/user.type";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { pgGet, pgGetEq } from "@/data/pg";
import { toIsoString } from "@/src/lib/datetime";
import type { UserRow } from "@/src/lib/database.types";

function mapToUser(raw: Partial<UserRow> & { id?: string; user_id?: string }): User {
  const userTypeDb = String(raw.user_type ?? "attendee");
  const isOwner = !!raw.is_owner;
  const isAdmin = userTypeDb === "platform_admin" || userTypeDb === "admin" || isOwner;
  const role: User["role"] = isAdmin
    ? "platform_admin"
    : userTypeDb === "organizer"
      ? "organizer"
      : "attendee";

  return {
    userId: String(raw.id || raw.user_id || ""),
    email: raw.email || "",
    role,
    userType: isAdmin ? "admin" : (userTypeDb as User["userType"]),
    orgId: undefined,
    managedOrgIds: [],
    accountStatus: (raw.account_status as User["accountStatus"]) || "active",
    isOwner,
    adminPermissions: Array.isArray(raw.admin_permissions) ? raw.admin_permissions.map(String) : [],
    profile: {
      fullName: raw.full_name || "",
      phoneNumber: raw.phone_number || "",
      profileImageUrl: raw.avatar_url || "",
      gender: (raw.gender as User["profile"]["gender"]) || "other",
    },
    location: {
      city: raw.city || "",
      country: raw.country || "",
    },
    preferences: {
      emailNotifications: Boolean(raw.email_notifications ?? true),
      pushNotifications: Boolean(raw.push_notifications ?? true),
      language: (raw.language as "en" | "ur") || "en",
      theme: (raw.theme as "light" | "dark") || "light",
    },
    security: {
      lastLogin: toIsoString(raw.last_login_at) || "",
      loginCount: raw.login_count || 0,
      failedLoginAttempts: raw.failed_login_attempts || 0,
      mfaEnabled: Boolean(raw.mfa_enabled),
      mfaMethod: null,
    },
    verification: {
      isEmailVerified: Boolean(raw.email_verified),
      isPhoneVerified: Boolean(raw.phone_verified),
      emailVerifiedAt: toIsoString(raw.email_verified_at),
      phoneVerifiedAt: null,
    },
    createdAt: toIsoString(raw.created_at) || new Date().toISOString(),
    updatedAt: toIsoString(raw.updated_at) || new Date().toISOString(),
    lastActive: toIsoString(raw.last_active_at) || new Date().toISOString(),
    mustResetPassword: Boolean((raw as { must_reset_password?: boolean }).must_reset_password),
  };
}

/**
 * Department and club standing lives in org_memberships, not users.user_type
 * (which stays "organizer"). Platform admins keep their role untouched.
 */
async function withOrgStanding(user: User): Promise<User> {
  if (!user.userId || user.role === "platform_admin" || user.userType !== "organizer") return user;

  const { data: memberships } = await supabaseAdmin
    .from(TABLES.ORG_MEMBERSHIPS)
    .select("org_id, role")
    .eq("user_id", user.userId)
    .in("role", ["department_admin", "president"]);
  if (!memberships?.length) return user;

  const departmentIds = memberships.filter((m) => m.role === "department_admin").map((m) => String(m.org_id));
  const presidentOf = memberships.filter((m) => m.role === "president").map((m) => String(m.org_id));

  if (!departmentIds.length) return { ...user, presidentOfOrgIds: presidentOf };

  const { data: clubs } = await supabaseAdmin
    .from(TABLES.ORGANIZATIONS)
    .select("id")
    .eq("org_type", "club")
    .in("parent_org_id", departmentIds);

  return {
    ...user,
    role: "department_admin",
    orgId: departmentIds[0],
    managedOrgIds: [...new Set([...departmentIds, ...(clubs ?? []).map((c) => String(c.id))])],
    presidentOfOrgIds: presidentOf,
  };
}

/** Where a signed-in user lands after login, password reset, or access-denied. */
export function landingPathFor(
  user: { userId: string; role?: string; userType: string; presidentOfOrgIds?: string[] } | null | undefined,
): string {
  if (!user?.userId) return "/";
  if (user.role === "platform_admin" || user.userType === "admin") return "/admin";
  if (user.role === "department_admin") return "/department";
  if (user.presidentOfOrgIds?.length) return `/clubs/${user.presidentOfOrgIds[0]}`;
  if (user.userType === "organizer") return `/organizer/${user.userId}/dashboard`;
  if (user.userType === "vendor") return `/vendor/${user.userId}/dashboard`;
  return `/attendee/${user.userId}/dashboard`;
}

export const UserService = {
  suspendedOrganizerIds: cache(async (): Promise<Set<string>> => {
    try {
      const { data, error } = await supabaseAdmin
        .from(TABLES.USERS)
        .select("id")
        .eq("account_status", "suspended")
        .eq("user_type", "organizer");
      if (error) throw error;
      return new Set((data ?? []).map((d) => String(d.id)));
    } catch (err) {
      console.error("[suspendedOrganizerIds] read failed", err);
      return new Set<string>();
    }
  }),

  getUserById: cache(async (user_id: String) => {
    const row = await pgGet<UserRow>(TABLES.USERS, String(user_id));
    return withOrgStanding(mapToUser(row ?? { id: String(user_id) }));
  }),

  async getUsersByIds(ids: string[]): Promise<Map<string, User>> {
    const uniqueIds = [...new Set(ids.filter(Boolean).map(String))];
    const map = new Map<string, User>();
    if (uniqueIds.length === 0) return map;
    const { data, error } = await supabaseAdmin.from(TABLES.USERS).select("*").in("id", uniqueIds);
    if (error) throw error;
    for (const id of uniqueIds) {
      const row = (data ?? []).find((d) => d.id === id);
      map.set(id, mapToUser((row as UserRow) ?? { id }));
    }
    return map;
  },

  async listMembershipOrgIds(userId: string): Promise<string[]> {
    const rows = await pgGetEq<{ org_id: string }>(TABLES.ORG_MEMBERSHIPS, "user_id", userId);
    return rows.map((r) => r.org_id);
  },
};
