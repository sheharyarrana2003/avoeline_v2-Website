import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { clampKeysetLimit, decodeKeysetCursor, encodeKeysetCursor } from "@/src/lib/keyset";
import { TeamEngineService } from "@/src/features/teams/teamEngine.service";
import type { AnnouncementAudience, AnnouncementChannel } from "./types";

export type ResolvedRecipient = {
  userId: string;
  email: string;
  displayName: string;
};

export async function resolveAnnouncementRecipients(input: {
  departmentId: string;
  audience: AnnouncementAudience;
  clubIds: string[];
}): Promise<ResolvedRecipient[]> {
  const clubs = await TeamEngineService.listClubsByDepartment(input.departmentId);
  let targetClubs = clubs;
  if (input.audience === "selected_clubs") {
    const allow = new Set(input.clubIds);
    targetClubs = clubs.filter((c) => allow.has(c.id));
  }

  const byUser = new Map<string, ResolvedRecipient>();

  const addUser = async (userId: string) => {
    if (!userId || byUser.has(userId)) return;
    const { data } = await supabaseAdmin
      .from(TABLES.USERS)
      .select("id, email, full_name")
      .eq("id", userId)
      .maybeSingle();
    if (!data) return;
    byUser.set(userId, {
      userId,
      email: data.email || "",
      displayName: data.full_name || data.email || "Member",
    });
  };

  if (
    input.audience === "presidents_only" ||
    input.audience === "all_clubs" ||
    input.audience === "selected_clubs"
  ) {
    for (const club of targetClubs) {
      if (club.ownerUid) await addUser(club.ownerUid);
      const { data: presidents } = await supabaseAdmin
        .from(TABLES.ORG_MEMBERSHIPS)
        .select("user_id")
        .eq("org_id", club.id)
        .eq("role", "president");
      for (const p of presidents ?? []) {
        if (p.user_id) await addUser(p.user_id);
      }
    }
  }

  if (input.audience === "all_members" || input.audience === "all_clubs") {
    const clubIds = targetClubs.map((c) => c.id);
    if (clubIds.length) {
      const { data: teams } = await supabaseAdmin
        .from(TABLES.TEAMS)
        .select("id")
        .in("org_id", clubIds)
        .eq("context_type", "club_committee");
      const teamIds = (teams ?? []).map((t) => t.id);
      if (teamIds.length) {
        const { data: members } = await supabaseAdmin
          .from(TABLES.TEAM_MEMBERS)
          .select("user_id")
          .in("team_id", teamIds);
        for (const m of members ?? []) {
          if (m.user_id) await addUser(m.user_id);
        }
      }
      // Also org memberships
      const { data: memberships } = await supabaseAdmin
        .from(TABLES.ORG_MEMBERSHIPS)
        .select("user_id")
        .in("org_id", clubIds);
      for (const m of memberships ?? []) {
        if (m.user_id) await addUser(m.user_id);
      }
    }
  }

  return [...byUser.values()].filter((r) => r.email || r.userId);
}

/**
 * Keyset page of department announcements (newest first). Cap 25–50 per ENGINEERING_RULES D4.
 */
export async function listDepartmentAnnouncementsPage(
  departmentId: string,
  opts?: { cursor?: string | null; limit?: number },
): Promise<{
  rows: {
    id: string;
    title: string | null;
    body: string | null;
    audience: string | null;
    channels: unknown;
    club_ids: unknown;
    created_at: string | null;
    created_by: string | null;
  }[];
  nextCursor: string | null;
}> {
  const limit = clampKeysetLimit(opts?.limit);
  const cursor = decodeKeysetCursor(opts?.cursor);

  let q = supabaseAdmin
    .from(TABLES.ORG_ANNOUNCEMENTS)
    .select("id, title, body, audience, channels, club_ids, created_at, created_by")
    .eq("department_id", departmentId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    q = q.or(`created_at.lt.${cursor.at},and(created_at.eq.${cursor.at},id.lt.${cursor.id})`);
  }

  const { data, error } = await q;
  if (error) throw error;
  const raw = data ?? [];
  const page = raw.slice(0, limit);
  let nextCursor: string | null = null;
  if (raw.length > limit && page.length) {
    const last = page[page.length - 1]!;
    nextCursor = encodeKeysetCursor({ at: String(last.created_at), id: String(last.id) });
  }
  return { rows: page, nextCursor };
}

export async function listDepartmentAnnouncements(departmentId: string) {
  const { rows } = await listDepartmentAnnouncementsPage(departmentId, { limit: 50 });
  return rows;
}

export async function getAnnouncementWithDeliveries(announcementId: string) {
  const { data: ann } = await supabaseAdmin
    .from(TABLES.ORG_ANNOUNCEMENTS)
    .select("*")
    .eq("id", announcementId)
    .maybeSingle();
  if (!ann) return null;
  const { data: deliveries } = await supabaseAdmin
    .from(TABLES.ANNOUNCEMENT_DELIVERIES)
    .select("id, user_id, email, display_name, channel, status, error, sent_at, created_at")
    .eq("announcement_id", announcementId)
    .order("created_at", { ascending: false })
    .limit(500);
  return { announcement: ann, deliveries: deliveries ?? [] };
}

export type { AnnouncementChannel };
