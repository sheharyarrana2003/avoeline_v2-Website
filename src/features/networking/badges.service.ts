import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";

export async function listDirectory(role?: string) {
  const { data: users } = await supabaseAdmin
    .from(TABLES.USERS)
    .select("id, full_name, user_type, avatar_url")
    .eq("account_status", "active")
    .limit(60);
  const rows = (users ?? []).filter((u) => !role || u.user_type === role);

  const [attendees, organizers, vendors, badges] = await Promise.all([
    supabaseAdmin.from(TABLES.ATTENDEE_PROFILES).select("user_id, interests, skills"),
    supabaseAdmin.from(TABLES.ORGANIZER_PROFILES).select("user_id, specialties, org_name"),
    supabaseAdmin.from(TABLES.VENDOR_PROFILES).select("user_id, service_categories, business_name"),
    supabaseAdmin.from(TABLES.USER_BADGES).select("user_id, badge_tier_id"),
  ]);

  const attMap = new Map((attendees.data ?? []).map((a) => [a.user_id, a]));
  const orgMap = new Map((organizers.data ?? []).map((a) => [a.user_id, a]));
  const venMap = new Map((vendors.data ?? []).map((a) => [a.user_id, a]));

  return rows.map((u) => {
    const tags =
      u.user_type === "attendee"
        ? [...((attMap.get(u.id)?.interests as string[]) ?? []), ...((attMap.get(u.id)?.skills as string[]) ?? [])]
        : u.user_type === "organizer"
          ? ((orgMap.get(u.id)?.specialties as string[]) ?? [])
          : ((venMap.get(u.id)?.service_categories as string[]) ?? []);
    const name =
      u.full_name ||
      orgMap.get(u.id)?.org_name ||
      venMap.get(u.id)?.business_name ||
      "Member";
    return { id: u.id, name, role: u.user_type, tags, badgeCount: (badges.data ?? []).filter((b) => b.user_id === u.id).length };
  });
}

export async function listMeetups() {
  const { data } = await supabaseAdmin.from(TABLES.BADGE_MEETUPS).select("*").order("scheduled_at", { ascending: true }).limit(20);
  return data ?? [];
}
