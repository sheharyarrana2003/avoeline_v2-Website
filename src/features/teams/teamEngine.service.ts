import crypto from "crypto";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { normalizePermissionList } from "@/src/lib/permissions";
import { UserService } from "@/src/services/user.service";
import type {
  OrgDoc,
  OrgType,
  TeamContextType,
  TeamDoc,
  TeamExtra,
  TeamMemberDoc,
  TeamMemberExtra,
  TeamMemberRole,
  TeamWithMembers,
  TeamPositionDoc,
  StaffApplicant,
  RecruitmentFormDoc,
  ApplicantStatus,
  OrganizerTeamsStats,
  OrganizerAccessGrantSummary,
} from "./teamEngine.types";
import { findMemberWithEmail, normalizeTeamEmail } from "./organizerTeams.helpers";
import { mapAssignmentFromRow } from "./eventStaffAssignment.logic";

const TEAM_COLS =
  "id, name, context_type, event_id, org_id, organizer_id, join_code, created_at, created_by, extra";
const TEAM_MEMBER_COLS =
  "id, team_id, user_id, role, joined_at, position_id, display_name, email, phone, source, extra";
const ORG_COLS = "id, name, org_type, parent_org_id, owner_user_id, created_at";
const TEAM_POSITION_COLS = "id, team_id, title, permissions, extra";
const RECRUITMENT_FORM_COLS =
  "id, team_id, position_id, title, fields, is_open, public_token, extra";
const APPLICANT_COLS =
  "id, form_id, team_id, position_id, email, responses, status, applied_at, interview_at, interview_notes, extra";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function generateJoinCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(6);
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

function asJsonObject(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};
}

function mapTeam(row: Record<string, unknown>): TeamDoc {
  const extra = asJsonObject(row.extra) as TeamExtra;
  return {
    id: String(row.id),
    name: String(row.name || ""),
    contextType: row.context_type as TeamContextType,
    eventId: (row.event_id as string) || null,
    trackId: null,
    orgId: (row.org_id as string) || null,
    organizerId: (row.organizer_id as string) || (row.created_by as string) || null,
    joinCode: String(row.join_code || ""),
    createdAt: String(row.created_at || ""),
    createdBy: (row.created_by as string) || undefined,
    extra,
  };
}

function mapMember(row: Record<string, unknown>): TeamMemberDoc {
  const source = String(row.source || "manual") === "recruited" ? "recruited" : "manual";
  const extra = asJsonObject(row.extra) as TeamMemberExtra;
  return {
    id: String(row.id),
    teamId: String(row.team_id),
    userId: String(row.user_id || ""),
    role: (row.role as TeamMemberRole) || "member",
    joinedAt: String(row.joined_at || ""),
    positionId: (row.position_id as string) || null,
    displayName: String(row.display_name || ""),
    email: String(row.email || ""),
    phone: String(row.phone || ""),
    source,
    extra,
  };
}

function asApplicantStatus(value: unknown): import("./teamEngine.types").ApplicantStatus {
  const raw = String(value || "applied");
  if (raw === "interview") return "interview_scheduled";
  if (
    raw === "shortlisted" ||
    raw === "interview_scheduled" ||
    raw === "accepted" ||
    raw === "rejected" ||
    raw === "withdrawn"
  ) {
    return raw;
  }
  return "applied";
}

function mapOrg(row: Record<string, unknown>): OrgDoc {
  return {
    id: String(row.id),
    name: String(row.name || ""),
    type: row.org_type as OrgType,
    parentOrgId: (row.parent_org_id as string) || null,
    ownerUid: String(row.owner_user_id || ""),
    createdAt: String(row.created_at || ""),
  };
}

export const TeamEngineService = {
  async createTeam(params: {
    name: string;
    contextType: TeamContextType;
    eventId?: string | null;
    trackId?: string | null;
    orgId?: string | null;
    creatorUserId?: string | null;
    organizerId?: string | null;
    description?: string;
    teamType?: string;
    /** Required lead — name + email. When omitted, creator is used as lead (legacy TeamCreator). */
    lead?: {
      name: string;
      email: string;
      phone?: string;
      designation?: string;
      notes?: string;
      userId?: string | null;
    } | null;
  }): Promise<TeamDoc> {
    const leadName = String(params.lead?.name ?? "").trim();
    const leadEmail = normalizeTeamEmail(params.lead?.email);
    if (params.lead) {
      if (!leadName || !leadEmail) {
        throw new Error("A team lead needs a name and email.");
      }
    } else if (!params.creatorUserId) {
      throw new Error("A team lead is required.");
    }

    let joinCode = generateJoinCode();
    for (let i = 0; i < 5; i++) {
      const { data: existing } = await supabaseAdmin
        .from(TABLES.TEAMS)
        .select("id")
        .eq("join_code", joinCode)
        .maybeSingle();
      if (!existing) break;
      joinCode = generateJoinCode();
    }

    const teamExtra: TeamExtra = {};
    const description = String(params.description ?? "").trim();
    const teamType = String(params.teamType ?? "").trim();
    if (description) teamExtra.description = description;
    if (teamType) teamExtra.teamType = teamType;

    const { data, error } = await supabaseAdmin
      .from(TABLES.TEAMS)
      .insert({
        name: params.name.trim(),
        context_type:
          params.contextType === "hackathon_track" ? "hackathon_track" : params.contextType,
        event_id: params.eventId || null,
        org_id: params.orgId || null,
        organizer_id: params.organizerId || params.creatorUserId || null,
        join_code: joinCode,
        created_by: params.creatorUserId || null,
        extra: Object.keys(teamExtra).length ? teamExtra : {},
      })
      .select(TEAM_COLS)
      .single();
    if (error) throw error;
    const team = mapTeam(data);

    if (params.lead && leadName && leadEmail) {
      const memberExtra: TeamMemberExtra = {};
      const designation = String(params.lead.designation ?? "").trim();
      const notes = String(params.lead.notes ?? "").trim();
      if (designation) memberExtra.designation = designation;
      if (notes) memberExtra.notes = notes;
      const { error: leadErr } = await supabaseAdmin.from(TABLES.TEAM_MEMBERS).insert({
        team_id: team.id,
        user_id: params.lead.userId || null,
        role: "lead",
        display_name: leadName,
        email: leadEmail,
        phone: String(params.lead.phone ?? "").trim() || null,
        source: "manual",
        extra: Object.keys(memberExtra).length ? memberExtra : {},
      });
      if (leadErr) throw leadErr;
    } else if (params.creatorUserId) {
      await supabaseAdmin.from(TABLES.TEAM_MEMBERS).insert({
        team_id: team.id,
        user_id: params.creatorUserId,
        role: "lead",
      });
    }
    return team;
  },

  async assertNoDuplicateEmail(
    teamId: string,
    email: string,
    excludeMemberId?: string,
  ): Promise<void> {
    const needle = normalizeTeamEmail(email);
    if (!needle) return;
    const members = await this.getTeamMembers(teamId);
    const hit = findMemberWithEmail(members, needle, excludeMemberId);
    if (hit) {
      throw new Error("That email is already on this team.");
    }
  },

  async addDirectMembers(
    teamId: string,
    members: {
      name: string;
      email?: string;
      phone?: string;
      role?: TeamMemberRole;
      positionId?: string | null;
      designation?: string;
      notes?: string;
      userId?: string | null;
    }[],
  ): Promise<void> {
    const existing = await this.getTeamMembers(teamId);
    const rows: Record<string, unknown>[] = [];
    const seenInBatch = new Set<string>();

    for (const m of members) {
      const displayName = m.name.trim();
      if (!displayName) continue;
      const email = normalizeTeamEmail(m.email);
      if (email) {
        if (seenInBatch.has(email) || findMemberWithEmail(existing, email)) {
          throw new Error("That email is already on this team.");
        }
        seenInBatch.add(email);
      }
      const memberExtra: TeamMemberExtra = {};
      const designation = String(m.designation ?? "").trim();
      const notes = String(m.notes ?? "").trim();
      if (designation) memberExtra.designation = designation;
      if (notes) memberExtra.notes = notes;
      rows.push({
        team_id: teamId,
        user_id: m.userId || null,
        role: m.role === "lead" ? "lead" : "member",
        display_name: displayName,
        email: email || null,
        phone: (m.phone || "").trim() || null,
        position_id: m.positionId || null,
        source: "manual",
        extra: Object.keys(memberExtra).length ? memberExtra : {},
      });
    }
    if (!rows.length) return;

    // One-lead invariant when inserting a lead row.
    if (rows.some((r) => r.role === "lead")) {
      await supabaseAdmin
        .from(TABLES.TEAM_MEMBERS)
        .update({ role: "member" })
        .eq("team_id", teamId)
        .eq("role", "lead");
    }

    const { error } = await supabaseAdmin.from(TABLES.TEAM_MEMBERS).insert(rows);
    if (error) {
      if (error.code === "23505") throw new Error("That email is already on this team.");
      throw error;
    }
  },

  async getTeam(teamId: string): Promise<TeamDoc | null> {
    if (!teamId) return null;
    const { data } = await supabaseAdmin
      .from(TABLES.TEAMS)
      .select(TEAM_COLS)
      .eq("id", teamId)
      .maybeSingle();
    return data ? mapTeam(data) : null;
  },

  async getTeamByJoinCode(joinCode: string): Promise<TeamDoc | null> {
    const clean = String(joinCode || "")
      .trim()
      .toUpperCase();
    if (!clean) return null;
    const { data } = await supabaseAdmin
      .from(TABLES.TEAMS)
      .select(TEAM_COLS)
      .eq("join_code", clean)
      .maybeSingle();
    return data ? mapTeam(data) : null;
  },

  async getTeamMembers(teamId: string): Promise<TeamMemberDoc[]> {
    if (!teamId) return [];
    const byTeam = await this.getTeamMembersForTeams([teamId]);
    return byTeam.get(teamId) ?? [];
  },

  /** One `.in("team_id")` + one user batch for many teams. */
  async getTeamMembersForTeams(teamIds: string[]): Promise<Map<string, TeamMemberDoc[]>> {
    const unique = [...new Set(teamIds.filter(Boolean))];
    const out = new Map<string, TeamMemberDoc[]>();
    for (const id of unique) out.set(id, []);
    if (!unique.length) return out;
    const { data } = await supabaseAdmin
      .from(TABLES.TEAM_MEMBERS)
      .select(TEAM_MEMBER_COLS)
      .in("team_id", unique);
    const rawMembers = (data ?? []).map((d) => mapMember(d as Record<string, unknown>));
    const userIds = rawMembers.map((m) => m.userId).filter(Boolean);
    const usersMap = await UserService.getUsersByIds(userIds);
    for (const m of rawMembers) {
      const user = usersMap.get(m.userId);
      const name = m.displayName || user?.profile?.fullName || user?.email || "Member";
      const email = m.email || user?.email || "";
      const enriched = { ...m, user: { name, email } };
      const list = out.get(m.teamId) ?? [];
      list.push(enriched);
      out.set(m.teamId, list);
    }
    return out;
  },

  async getTeamsWithMembers(teams: TeamDoc[]): Promise<TeamWithMembers[]> {
    const membersByTeam = await this.getTeamMembersForTeams(teams.map((t) => t.id));
    return teams.map((team) => ({
      ...team,
      members: membersByTeam.get(team.id) ?? [],
    }));
  },

  async getTeamWithMembers(teamId: string): Promise<TeamWithMembers | null> {
    const team = await this.getTeam(teamId);
    if (!team) return null;
    const members = await this.getTeamMembers(teamId);
    return { ...team, members };
  },

  async joinTeamByCode(joinCode: string, userId: string) {
    if (!joinCode?.trim()) return { success: false, error: "Please provide a join code." };
    if (!userId?.trim()) return { success: false, error: "You must be signed in to join a team." };
    const team = await this.getTeamByJoinCode(joinCode);
    if (!team) return { success: false, error: "Invalid join code. No team found with that code." };
    const { data: existing } = await supabaseAdmin
      .from(TABLES.TEAM_MEMBERS)
      .select("id")
      .eq("team_id", team.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (existing) return { success: false, error: "You are already a member of this team.", team };
    const { data, error } = await supabaseAdmin
      .from(TABLES.TEAM_MEMBERS)
      .insert({
        team_id: team.id,
        user_id: userId,
        role: "member",
      })
      .select(TEAM_MEMBER_COLS)
      .single();
    if (error) return { success: false, error: error.message };
    return { success: true, team, member: mapMember(data) };
  },

  async updateMemberRole(params: {
    teamId: string;
    memberId: string;
    newRole: TeamMemberRole;
    actorUserId: string;
    /** Organizer owner may promote without being a roster lead. */
    allowOwner?: boolean;
  }) {
    const team = await this.getTeam(params.teamId);
    const isLead = await this.isUserTeamLead(params.teamId, params.actorUserId);
    const isCreator = Boolean(team?.createdBy && team.createdBy === params.actorUserId);
    const isOwner = Boolean(
      params.allowOwner &&
      ((team?.organizerId && team.organizerId === params.actorUserId) || isCreator),
    );
    if (!isLead && !isCreator && !isOwner) {
      return { success: false, error: "Only team leads can change member roles." };
    }
    const { data } = await supabaseAdmin
      .from(TABLES.TEAM_MEMBERS)
      .select(TEAM_MEMBER_COLS)
      .eq("id", params.memberId)
      .maybeSingle();
    if (!data || data.team_id !== params.teamId)
      return { success: false, error: "Team member not found." };
    // One-lead invariant: promoting demotes every other lead on this team.
    if (params.newRole === "lead") {
      await supabaseAdmin
        .from(TABLES.TEAM_MEMBERS)
        .update({ role: "member" })
        .eq("team_id", params.teamId)
        .neq("id", params.memberId)
        .eq("role", "lead");
    }
    const { error } = await supabaseAdmin
      .from(TABLES.TEAM_MEMBERS)
      .update({ role: params.newRole })
      .eq("id", params.memberId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  async removeTeamMember(params: {
    teamId: string;
    memberId: string;
    actorUserId: string;
    allowOwner?: boolean;
  }) {
    const { data } = await supabaseAdmin
      .from(TABLES.TEAM_MEMBERS)
      .select(TEAM_MEMBER_COLS)
      .eq("id", params.memberId)
      .maybeSingle();
    if (!data || data.team_id !== params.teamId)
      return { success: false, error: "Team member not found." };
    const team = await this.getTeam(params.teamId);
    const isSelf = data.user_id === params.actorUserId;
    const isLead = await this.isUserTeamLead(params.teamId, params.actorUserId);
    const isOwner = Boolean(
      params.allowOwner &&
      (team?.organizerId === params.actorUserId || team?.createdBy === params.actorUserId),
    );
    if (!isSelf && !isLead && !isOwner) {
      return { success: false, error: "You don't have permission to remove this member." };
    }
    await supabaseAdmin.from(TABLES.TEAM_MEMBERS).delete().eq("id", params.memberId);
    return { success: true };
  },

  async isUserTeamLead(teamId: string, userId: string): Promise<boolean> {
    if (!teamId || !userId) return false;
    const { data } = await supabaseAdmin
      .from(TABLES.TEAM_MEMBERS)
      .select("id")
      .eq("team_id", teamId)
      .eq("user_id", userId)
      .eq("role", "lead")
      .maybeSingle();
    return !!data;
  },

  async isUserInTeam(teamId: string, userId: string): Promise<boolean> {
    if (!teamId || !userId) return false;
    const { data } = await supabaseAdmin
      .from(TABLES.TEAM_MEMBERS)
      .select("id")
      .eq("team_id", teamId)
      .eq("user_id", userId)
      .maybeSingle();
    return !!data;
  },

  async getUserTeams(userId: string): Promise<TeamDoc[]> {
    if (!userId) return [];
    const { data: memberships } = await supabaseAdmin
      .from(TABLES.TEAM_MEMBERS)
      .select("team_id")
      .eq("user_id", userId);
    const teamIds = [...new Set((memberships ?? []).map((m) => m.team_id).filter(Boolean))];
    if (!teamIds.length) return [];
    const { data: teams } = await supabaseAdmin
      .from(TABLES.TEAMS)
      .select(TEAM_COLS)
      .in("id", teamIds);
    return (teams ?? []).map((t) => mapTeam(t));
  },

  async getTeamsByContext(query: {
    contextType?: TeamContextType;
    eventId?: string | null;
    trackId?: string | null;
    orgId?: string | null;
  }): Promise<TeamDoc[]> {
    let q = supabaseAdmin.from(TABLES.TEAMS).select(TEAM_COLS);
    if (query.contextType) q = q.eq("context_type", query.contextType);
    if (query.eventId) q = q.eq("event_id", query.eventId);
    if (query.orgId) q = q.eq("org_id", query.orgId);
    const { data } = await q;
    return (data ?? []).map((t) => mapTeam(t));
  },

  async listOrganizerStaffTeams(organizerId: string): Promise<TeamDoc[]> {
    if (!organizerId) return [];
    const [{ data: owned }, { data: created }, { data: fromEvents }] = await Promise.all([
      supabaseAdmin
        .from(TABLES.TEAMS)
        .select(TEAM_COLS)
        .eq("context_type", "event_staff")
        .eq("organizer_id", organizerId),
      supabaseAdmin
        .from(TABLES.TEAMS)
        .select(TEAM_COLS)
        .eq("context_type", "event_staff")
        .eq("created_by", organizerId),
      supabaseAdmin.from(TABLES.EVENTS).select("id").eq("organizer_id", organizerId),
    ]);
    const eventIds = (fromEvents ?? []).map((e) => String(e.id));
    const { data: onEvents } = eventIds.length
      ? await supabaseAdmin
          .from(TABLES.TEAMS)
          .select(TEAM_COLS)
          .eq("context_type", "event_staff")
          .in("event_id", eventIds)
      : { data: [] as Record<string, unknown>[] };
    const byId = new Map<string, TeamDoc>();
    for (const row of [...(owned ?? []), ...(created ?? []), ...(onEvents ?? [])]) {
      const team = mapTeam(row as Record<string, unknown>);
      byId.set(team.id, team);
    }
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  },

  /** Stats RPC for organizer Teams home (service_role only). */
  async getOrganizerTeamsStats(organizerId: string): Promise<OrganizerTeamsStats> {
    const empty: OrganizerTeamsStats = {
      teamsCount: 0,
      membersCount: 0,
      leadsWithAccess: 0,
      openForms: 0,
      newApplicants7d: 0,
      inInterview: 0,
      pendingInvites: 0,
    };
    if (!organizerId) return empty;
    const { data, error } = await supabaseAdmin.rpc("organizer_teams_stats", {
      p_organizer_id: organizerId,
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row || typeof row !== "object") return empty;
    const r = row as Record<string, unknown>;
    return {
      teamsCount: Number(r.teams_count ?? 0),
      membersCount: Number(r.members_count ?? 0),
      leadsWithAccess: Number(r.leads_with_access ?? 0),
      openForms: Number(r.open_forms ?? 0),
      newApplicants7d: Number(r.new_applicants_7d ?? 0),
      inInterview: Number(r.in_interview ?? 0),
      pendingInvites: Number(r.pending_invites ?? 0),
    };
  },

  /** Assignment counts keyed by library team id (how many events use each team). */
  async countEventAssignmentsForTeams(teamIds: string[]): Promise<Map<string, number>> {
    const unique = [...new Set(teamIds.filter(Boolean))];
    const out = new Map<string, number>();
    for (const id of unique) out.set(id, 0);
    if (!unique.length) return out;
    const { data, error } = await supabaseAdmin
      .from(TABLES.EVENT_STAFF_ASSIGNMENTS)
      .select("team_id")
      .in("team_id", unique);
    if (error) throw error;
    for (const row of data ?? []) {
      const tid = String(row.team_id);
      out.set(tid, (out.get(tid) ?? 0) + 1);
    }
    return out;
  },

  /** Organizer-scoped access grants (organizer + owned event scopes). */
  async listOrganizerAccessGrants(organizerId: string): Promise<OrganizerAccessGrantSummary[]> {
    if (!organizerId) return [];
    const { data: events } = await supabaseAdmin
      .from(TABLES.EVENTS)
      .select("id")
      .eq("organizer_id", organizerId);
    const eventIds = (events ?? []).map((e) => String(e.id));

    const selectCols =
      "id, grantee_user_id, scope_type, scope_id, permissions, granted_by, expires_at, revoked_at, created_at, invite_token_hash, invite_sent_at";

    const [orgScoped, eventScoped] = await Promise.all([
      supabaseAdmin
        .from(TABLES.ACCESS_GRANTS)
        .select(selectCols)
        .eq("scope_type", "organizer")
        .eq("scope_id", organizerId)
        .order("created_at", { ascending: false }),
      eventIds.length
        ? supabaseAdmin
            .from(TABLES.ACCESS_GRANTS)
            .select(selectCols)
            .eq("scope_type", "event")
            .in("scope_id", eventIds)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] as Record<string, unknown>[], error: null }),
    ]);
    if (orgScoped.error) throw orgScoped.error;
    if (eventScoped.error) throw eventScoped.error;

    const mapGrant = (r: Record<string, unknown>): OrganizerAccessGrantSummary => ({
      id: String(r.id),
      granteeUserId: String(r.grantee_user_id),
      scopeType: r.scope_type as OrganizerAccessGrantSummary["scopeType"],
      scopeId: String(r.scope_id),
      permissions: normalizePermissionList(
        Array.isArray(r.permissions) ? r.permissions.map(String) : [],
      ),
      grantedBy: (r.granted_by as string) || null,
      expiresAt: (r.expires_at as string) || null,
      revokedAt: (r.revoked_at as string) || null,
      createdAt: String(r.created_at || ""),
      inviteTokenHash: (r.invite_token_hash as string) || null,
      inviteSentAt: (r.invite_sent_at as string) || null,
    });

    const byId = new Map<string, OrganizerAccessGrantSummary>();
    for (const row of [...(orgScoped.data ?? []), ...(eventScoped.data ?? [])]) {
      const g = mapGrant(row as Record<string, unknown>);
      byId.set(g.id, g);
    }
    const grants = [...byId.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (!grants.length) return grants;

    const userIds = [...new Set(grants.map((g) => g.granteeUserId))];
    const { data: users } = await supabaseAdmin
      .from(TABLES.USERS)
      .select("id, email, full_name, last_active_at, last_login_at")
      .in("id", userIds);
    const userMap = new Map(
      (users ?? []).map((u) => [
        String(u.id),
        {
          email: String(u.email || ""),
          name: String(u.full_name || ""),
          lastActiveAt: (u.last_active_at as string) || (u.last_login_at as string) || null,
        },
      ]),
    );

    const eventTitleById = new Map<string, string>();
    if (eventIds.length) {
      const { data: evRows } = await supabaseAdmin
        .from(TABLES.EVENTS)
        .select("id, title")
        .in("id", eventIds);
      for (const e of evRows ?? []) eventTitleById.set(String(e.id), String(e.title || ""));
    }

    // Best-effort team name: first library team where grantee is a member.
    const { data: memberships } = await supabaseAdmin
      .from(TABLES.TEAM_MEMBERS)
      .select("user_id, team_id")
      .in("user_id", userIds);
    const teamIds = [...new Set((memberships ?? []).map((m) => String(m.team_id)))];
    const teamNameById = new Map<string, string>();
    if (teamIds.length) {
      const { data: teamRows } = await supabaseAdmin
        .from(TABLES.TEAMS)
        .select("id, name")
        .in("id", teamIds);
      for (const t of teamRows ?? []) teamNameById.set(String(t.id), String(t.name || ""));
    }
    const teamByUser = new Map<string, string>();
    for (const m of memberships ?? []) {
      const uid = String(m.user_id);
      if (teamByUser.has(uid)) continue;
      const name = teamNameById.get(String(m.team_id));
      if (name) teamByUser.set(uid, name);
    }

    return grants.map((g) => {
      const u = userMap.get(g.granteeUserId);
      return {
        ...g,
        granteeEmail: u?.email ?? null,
        granteeName: u?.name || null,
        lastActiveAt: u?.lastActiveAt ?? null,
        teamName: teamByUser.get(g.granteeUserId) ?? null,
        eventTitle: g.scopeType === "event" ? (eventTitleById.get(g.scopeId) ?? null) : null,
      };
    });
  },

  /** True when the team belongs to this organizer's staff library. */
  async organizerOwnsStaffTeam(organizerId: string, teamId: string): Promise<boolean> {
    if (!organizerId || !teamId) return false;
    const teams = await this.listOrganizerStaffTeams(organizerId);
    return teams.some((t) => t.id === teamId);
  },

  /** Flat list of recruitment forms for an organizer's staff library teams. */
  async listOrganizerRecruitmentForms(organizerId: string): Promise<RecruitmentFormDoc[]> {
    const teams = await this.listOrganizerStaffTeams(organizerId);
    if (!teams.length) return [];
    const byTeam = await this.listRecruitmentFormsForTeams(teams.map((t) => t.id));
    return teams.flatMap((t) => byTeam.get(t.id) ?? []);
  },

  /** Flat list of applicants across an organizer's staff library teams. */
  async listOrganizerApplicants(organizerId: string): Promise<StaffApplicant[]> {
    const teams = await this.listOrganizerStaffTeams(organizerId);
    if (!teams.length) return [];
    const byTeam = await this.listApplicantsForTeams(teams.map((t) => t.id));
    return teams.flatMap((t) => byTeam.get(t.id) ?? []);
  },

  async listStaffTeamIdsForEvent(eventId: string): Promise<string[]> {
    const assigned = await this.listEventStaffAssignments(eventId);
    if (assigned.length) return assigned.map((a) => a.teamId);
    const { data: scoped } = await supabaseAdmin
      .from(TABLES.TEAMS)
      .select("id")
      .eq("context_type", "event_staff")
      .eq("event_id", eventId);
    return (scoped ?? []).map((r) => String(r.id));
  },

  async listEventStaffAssignments(
    eventId: string,
  ): Promise<{ teamId: string; memberIds: string[]; leadMemberId: string | null }[]> {
    const { data } = await supabaseAdmin
      .from(TABLES.EVENT_STAFF_ASSIGNMENTS)
      .select("team_id, member_ids, lead_member_id")
      .eq("event_id", eventId);
    return (data ?? []).map((r) => mapAssignmentFromRow(r));
  },

  async setEventStaffAssignments(
    eventId: string,
    rows: { teamId: string; memberIds: string[]; leadMemberId?: string | null }[],
  ): Promise<void> {
    await supabaseAdmin.from(TABLES.EVENT_STAFF_ASSIGNMENTS).delete().eq("event_id", eventId);
    if (!rows.length) return;
    const { error } = await supabaseAdmin.from(TABLES.EVENT_STAFF_ASSIGNMENTS).insert(
      rows.map((r) => ({
        event_id: eventId,
        team_id: r.teamId,
        member_ids: r.memberIds,
        lead_member_id: r.leadMemberId || null,
      })),
    );
    if (error) throw error;
  },

  async removeEventStaffAssignment(eventId: string, teamId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from(TABLES.EVENT_STAFF_ASSIGNMENTS)
      .delete()
      .eq("event_id", eventId)
      .eq("team_id", teamId);
    if (error) throw error;
  },

  async renameTeam(teamId: string, name: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from(TABLES.TEAMS)
      .update({ name: name.trim() })
      .eq("id", teamId);
    if (error) throw error;
  },

  async updateTeamDetails(
    teamId: string,
    patch: { name?: string; description?: string; teamType?: string },
  ): Promise<void> {
    const { data: existing } = await supabaseAdmin
      .from(TABLES.TEAMS)
      .select("extra")
      .eq("id", teamId)
      .maybeSingle();
    const extra = { ...asJsonObject(existing?.extra) } as TeamExtra;
    if (patch.description !== undefined) {
      const d = patch.description.trim();
      if (d) extra.description = d;
      else delete extra.description;
    }
    if (patch.teamType !== undefined) {
      const t = patch.teamType.trim();
      if (t) extra.teamType = t;
      else delete extra.teamType;
    }
    const row: Record<string, unknown> = { extra };
    if (patch.name != null) row.name = patch.name.trim();
    const { error } = await supabaseAdmin.from(TABLES.TEAMS).update(row).eq("id", teamId);
    if (error) throw error;
  },

  /**
   * Deletes the team roster + team row. Revokes organizer/event grants for members
   * who are not on another staff team for the same organizer. Never deletes Auth users.
   */
  async deleteTeam(
    teamId: string,
    opts?: { revokeGrantsForOrganizerId?: string },
  ): Promise<{
    revokedGrantIds: string[];
  }> {
    const members = await this.getTeamMembers(teamId);
    const revokedGrantIds: string[] = [];

    if (opts?.revokeGrantsForOrganizerId) {
      const organizerId = opts.revokeGrantsForOrganizerId;
      const grants = await this.listOrganizerAccessGrants(organizerId);
      const otherTeams = (await this.listOrganizerStaffTeams(organizerId)).filter(
        (t) => t.id !== teamId,
      );
      const otherMembers = await this.getTeamMembersForTeams(otherTeams.map((t) => t.id));
      const otherUserIds = new Set<string>();
      for (const list of otherMembers.values()) {
        for (const m of list) {
          if (m.userId) otherUserIds.add(m.userId);
        }
      }
      const now = new Date().toISOString();
      for (const m of members) {
        if (!m.userId || otherUserIds.has(m.userId)) continue;
        for (const g of grants) {
          if (g.granteeUserId !== m.userId || g.revokedAt) continue;
          const { error } = await supabaseAdmin
            .from(TABLES.ACCESS_GRANTS)
            .update({ revoked_at: now })
            .eq("id", g.id)
            .is("revoked_at", null);
          if (!error) revokedGrantIds.push(g.id);
        }
      }
    }

    // applicants.team_id is NO ACTION — clear before team delete.
    await supabaseAdmin.from(TABLES.APPLICANTS).delete().eq("team_id", teamId);
    await supabaseAdmin.from(TABLES.TEAM_MEMBERS).delete().eq("team_id", teamId);
    const { error } = await supabaseAdmin.from(TABLES.TEAMS).delete().eq("id", teamId);
    if (error) throw error;
    return { revokedGrantIds };
  },

  async updateDirectMember(
    memberId: string,
    patch: {
      name?: string;
      email?: string;
      phone?: string;
      designation?: string;
      notes?: string;
      role?: TeamMemberRole;
      positionId?: string | null;
      teamId?: string;
    },
  ): Promise<void> {
    const { data: existing } = await supabaseAdmin
      .from(TABLES.TEAM_MEMBERS)
      .select(TEAM_MEMBER_COLS)
      .eq("id", memberId)
      .maybeSingle();
    if (!existing) throw new Error("Team member not found.");
    const teamId = patch.teamId || String(existing.team_id);

    if (patch.email != null) {
      const email = normalizeTeamEmail(patch.email);
      if (email) await this.assertNoDuplicateEmail(teamId, email, memberId);
    }

    if (patch.role === "lead") {
      await supabaseAdmin
        .from(TABLES.TEAM_MEMBERS)
        .update({ role: "member" })
        .eq("team_id", teamId)
        .neq("id", memberId)
        .eq("role", "lead");
    }

    const extra = { ...asJsonObject(existing.extra) } as TeamMemberExtra;
    if (patch.designation !== undefined) {
      const d = patch.designation.trim();
      if (d) extra.designation = d;
      else delete extra.designation;
    }
    if (patch.notes !== undefined) {
      const n = patch.notes.trim();
      if (n) extra.notes = n;
      else delete extra.notes;
    }

    const row: Record<string, unknown> = { extra };
    if (patch.name != null) row.display_name = patch.name.trim();
    if (patch.email != null) row.email = normalizeTeamEmail(patch.email) || null;
    if (patch.phone != null) row.phone = patch.phone.trim() || null;
    if (patch.role != null) row.role = patch.role;
    if (patch.positionId !== undefined) row.position_id = patch.positionId || null;

    const { error } = await supabaseAdmin.from(TABLES.TEAM_MEMBERS).update(row).eq("id", memberId);
    if (error) {
      if (error.code === "23505") throw new Error("That email is already on this team.");
      throw error;
    }
  },

  async createOrg(params: {
    name: string;
    type: OrgType;
    parentOrgId?: string | null;
    ownerUid: string;
  }): Promise<OrgDoc> {
    const { data, error } = await supabaseAdmin
      .from(TABLES.ORGANIZATIONS)
      .insert({
        name: params.name.trim(),
        org_type: params.type,
        parent_org_id: params.parentOrgId || null,
        owner_user_id: params.ownerUid || null,
      })
      .select(ORG_COLS)
      .single();
    if (error) throw error;
    if (params.ownerUid) {
      await TeamEngineService.setOrgLead(
        data.id,
        params.ownerUid,
        params.type === "department" ? "department_admin" : "president",
      );
    }
    return mapOrg(data);
  },

  /** The membership row is what routes a login to /department or the club dashboard. */
  async setOrgLead(
    orgId: string,
    userId: string,
    role: "department_admin" | "president",
  ): Promise<void> {
    if (!orgId || !userId) return;
    await supabaseAdmin
      .from(TABLES.ORG_MEMBERSHIPS)
      .update({ role: "member" })
      .eq("org_id", orgId)
      .eq("role", role)
      .neq("user_id", userId);
    const { error } = await supabaseAdmin
      .from(TABLES.ORG_MEMBERSHIPS)
      .upsert({ org_id: orgId, user_id: userId, role }, { onConflict: "org_id,user_id" });
    if (error) throw error;
  },

  async getOrg(orgId: string): Promise<OrgDoc | null> {
    if (!orgId) return null;
    const { data } = await supabaseAdmin
      .from(TABLES.ORGANIZATIONS)
      .select(ORG_COLS)
      .eq("id", orgId)
      .maybeSingle();
    return data ? mapOrg(data) : null;
  },

  async listOrgs(type?: OrgType): Promise<OrgDoc[]> {
    let q = supabaseAdmin.from(TABLES.ORGANIZATIONS).select(ORG_COLS);
    if (type) q = q.eq("org_type", type);
    const { data } = await q;
    return (data ?? []).map((d) => mapOrg(d));
  },

  async listClubsByDepartment(departmentId: string): Promise<OrgDoc[]> {
    if (!departmentId) return [];
    const { data } = await supabaseAdmin
      .from(TABLES.ORGANIZATIONS)
      .select(ORG_COLS)
      .eq("org_type", "club")
      .eq("parent_org_id", departmentId);
    return (data ?? []).map((d) => mapOrg(d));
  },

  async updateOrgOwner(orgId: string, newOwnerUid: string): Promise<void> {
    if (!orgId || !newOwnerUid) return;
    const uid = newOwnerUid.trim();
    const { data: org } = await supabaseAdmin
      .from(TABLES.ORGANIZATIONS)
      .update({ owner_user_id: uid, updated_at: new Date().toISOString() })
      .eq("id", orgId)
      .select("org_type")
      .maybeSingle();
    if (org)
      await TeamEngineService.setOrgLead(
        orgId,
        uid,
        org.org_type === "department" ? "department_admin" : "president",
      );
  },

  mapPosition(r: Record<string, unknown>): TeamPositionDoc {
    const extra = r.extra && typeof r.extra === "object" ? (r.extra as { trackIds?: unknown }) : {};
    // Normalize legacy page_* keys so staff ACL checkboxes match TAB_PERMISSION catalog.
    return {
      id: String(r.id),
      teamId: String(r.team_id),
      title: String(r.title || ""),
      permissions: normalizePermissionList(
        Array.isArray(r.permissions) ? r.permissions.map(String) : [],
      ),
      trackIds: Array.isArray(extra.trackIds) ? extra.trackIds.map(String) : [],
    };
  },

  async listPositions(teamId: string): Promise<TeamPositionDoc[]> {
    const { data } = await supabaseAdmin
      .from(TABLES.TEAM_POSITIONS)
      .select(TEAM_POSITION_COLS)
      .eq("team_id", teamId);
    return (data ?? []).map((r) => this.mapPosition(r as Record<string, unknown>));
  },

  async listPositionsForTeams(teamIds: string[]): Promise<Map<string, TeamPositionDoc[]>> {
    const unique = [...new Set(teamIds.filter(Boolean))];
    const out = new Map<string, TeamPositionDoc[]>();
    for (const id of unique) out.set(id, []);
    if (!unique.length) return out;
    const { data } = await supabaseAdmin
      .from(TABLES.TEAM_POSITIONS)
      .select(TEAM_POSITION_COLS)
      .in("team_id", unique);
    for (const r of data ?? []) {
      const pos = this.mapPosition(r as Record<string, unknown>);
      const list = out.get(pos.teamId) ?? [];
      list.push(pos);
      out.set(pos.teamId, list);
    }
    return out;
  },

  async createPosition(
    teamId: string,
    title: string,
    permissions: string[] = [],
    trackIds: string[] = [],
  ): Promise<void> {
    const { error } = await supabaseAdmin.from(TABLES.TEAM_POSITIONS).insert({
      team_id: teamId,
      title: title.trim(),
      permissions: normalizePermissionList(permissions),
      extra: { trackIds },
    });
    if (error) {
      if (error.code === "23505")
        throw new Error("A position with this title already exists on this team.");
      throw error;
    }
  },

  async updatePosition(
    positionId: string,
    patch: { permissions?: string[]; trackIds?: string[]; title?: string },
  ): Promise<void> {
    const { data } = await supabaseAdmin
      .from(TABLES.TEAM_POSITIONS)
      .select("extra")
      .eq("id", positionId)
      .maybeSingle();
    const extra =
      data?.extra && typeof data.extra === "object" ? { ...(data.extra as object) } : {};
    if (patch.trackIds !== undefined) (extra as { trackIds: string[] }).trackIds = patch.trackIds;
    const row: Record<string, unknown> = { extra };
    if (patch.permissions) row.permissions = normalizePermissionList(patch.permissions);
    if (patch.title) row.title = patch.title.trim();
    const { error } = await supabaseAdmin
      .from(TABLES.TEAM_POSITIONS)
      .update(row)
      .eq("id", positionId);
    if (error) throw error;
  },

  parseFormFields(raw: unknown): RecruitmentFormDoc["fields"] {
    if (!Array.isArray(raw)) return [];
    return raw.map((item, index) => {
      const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
      const label = String(row.label || `Field ${index + 1}`);
      const key = String(row.key || row.id || `field_${index}`);
      return {
        key,
        label,
        type: String(row.type || "text"),
        options: Array.isArray(row.options) ? row.options.map(String) : undefined,
        required: Boolean(row.required),
      };
    });
  },

  mapRecruitmentForm(r: Record<string, unknown>): RecruitmentFormDoc {
    const extra = asRecord(r.extra);
    const capRaw = extra.cap;
    const cap =
      typeof capRaw === "number"
        ? capRaw
        : typeof capRaw === "string" && capRaw.trim()
          ? Number(capRaw)
          : null;
    return {
      id: String(r.id),
      teamId: String(r.team_id),
      positionId: (r.position_id as string) || null,
      title: String(r.title || "Staff application"),
      intro: String(extra.intro || ""),
      closesAt: (extra.closesAt as string) || (extra.closes_at as string) || null,
      cap: Number.isFinite(cap) && (cap as number) > 0 ? (cap as number) : null,
      fields: this.parseFormFields(r.fields),
      isOpen: r.is_open !== false,
      publicToken: String(r.public_token || ""),
    };
  },

  async getRecruitmentFormByToken(token: string): Promise<RecruitmentFormDoc | null> {
    const t = String(token || "").trim();
    if (!t) return null;
    const { data } = await supabaseAdmin
      .from(TABLES.RECRUITMENT_FORMS)
      .select(RECRUITMENT_FORM_COLS)
      .eq("public_token", t)
      .maybeSingle();
    return data ? this.mapRecruitmentForm(data as Record<string, unknown>) : null;
  },

  newPublicToken(): string {
    return crypto.randomBytes(24).toString("hex");
  },

  async listRecruitmentForms(teamId: string): Promise<RecruitmentFormDoc[]> {
    const byTeam = await this.listRecruitmentFormsForTeams([teamId]);
    return byTeam.get(teamId) ?? [];
  },

  async listRecruitmentFormsForTeams(
    teamIds: string[],
  ): Promise<Map<string, RecruitmentFormDoc[]>> {
    const unique = [...new Set(teamIds.filter(Boolean))];
    const out = new Map<string, RecruitmentFormDoc[]>();
    for (const id of unique) out.set(id, []);
    if (!unique.length) return out;
    const { data } = await supabaseAdmin
      .from(TABLES.RECRUITMENT_FORMS)
      .select(RECRUITMENT_FORM_COLS)
      .in("team_id", unique);
    for (const r of data ?? []) {
      const form = this.mapRecruitmentForm(r as Record<string, unknown>);
      const list = out.get(form.teamId) ?? [];
      list.push(form);
      out.set(form.teamId, list);
    }
    return out;
  },

  async getRecruitmentForm(formId: string): Promise<RecruitmentFormDoc | null> {
    if (!formId) return null;
    const { data } = await supabaseAdmin
      .from(TABLES.RECRUITMENT_FORMS)
      .select(RECRUITMENT_FORM_COLS)
      .eq("id", formId)
      .maybeSingle();
    return data ? this.mapRecruitmentForm(data as Record<string, unknown>) : null;
  },

  async ensureRecruitmentForm(
    teamId: string,
    title: string,
    positionId?: string | null,
  ): Promise<string> {
    let query = supabaseAdmin.from(TABLES.RECRUITMENT_FORMS).select("id").eq("team_id", teamId);
    query = positionId ? query.eq("position_id", positionId) : query.is("position_id", null);
    const { data: existingRows } = await query.limit(1);
    const existing = existingRows?.[0];
    if (existing?.id) return String(existing.id);
    const { data, error } = await supabaseAdmin
      .from(TABLES.RECRUITMENT_FORMS)
      .insert({
        team_id: teamId,
        position_id: positionId || null,
        title: title.trim() || "Staff application",
        fields: [
          { key: "why", label: "Why do you want this role?", type: "long_text", required: true },
        ],
        is_open: true,
        public_token: this.newPublicToken(),
      })
      .select("id")
      .single();
    if (error) throw error;
    return String(data.id);
  },

  async saveRecruitmentForm(
    formId: string,
    input: {
      title?: string;
      fields?: RecruitmentFormDoc["fields"];
      isOpen?: boolean;
      intro?: string;
      closesAt?: string | null;
      cap?: number | null;
      positionId?: string | null;
    },
  ): Promise<void> {
    const { data: existing } = await supabaseAdmin
      .from(TABLES.RECRUITMENT_FORMS)
      .select("extra")
      .eq("id", formId)
      .maybeSingle();
    const prev = asRecord(existing?.extra);
    const nextExtra = { ...prev };
    if (input.intro !== undefined) nextExtra.intro = input.intro;
    if (input.closesAt !== undefined) nextExtra.closesAt = input.closesAt || null;
    if (input.cap !== undefined) nextExtra.cap = input.cap;
    const patch: Record<string, unknown> = { extra: nextExtra };
    if (input.title !== undefined) patch.title = input.title.trim() || "Staff application";
    if (input.fields !== undefined) patch.fields = input.fields;
    if (input.isOpen !== undefined) patch.is_open = input.isOpen;
    if (input.positionId !== undefined) patch.position_id = input.positionId;
    const { error } = await supabaseAdmin
      .from(TABLES.RECRUITMENT_FORMS)
      .update(patch)
      .eq("id", formId);
    if (error) throw error;
  },

  async createRecruitmentForm(input: {
    teamId: string;
    positionId?: string | null;
    title: string;
    fields: RecruitmentFormDoc["fields"];
    isOpen?: boolean;
    intro?: string;
    closesAt?: string | null;
    cap?: number | null;
  }): Promise<string> {
    const { data, error } = await supabaseAdmin
      .from(TABLES.RECRUITMENT_FORMS)
      .insert({
        team_id: input.teamId,
        position_id: input.positionId || null,
        title: input.title.trim() || "Staff application",
        fields: input.fields.length
          ? input.fields
          : [
              {
                key: "why",
                label: "Why do you want this role?",
                type: "long_text",
                required: true,
              },
            ],
        is_open: input.isOpen !== false,
        public_token: this.newPublicToken(),
        extra: {
          intro: input.intro || "",
          closesAt: input.closesAt || null,
          cap: input.cap ?? null,
        },
      })
      .select("id")
      .single();
    if (error) throw error;
    return String(data.id);
  },

  async duplicateRecruitmentForm(formId: string): Promise<string> {
    const form = await this.getRecruitmentForm(formId);
    if (!form) throw new Error("Form not found.");
    return this.createRecruitmentForm({
      teamId: form.teamId,
      positionId: form.positionId,
      title: `${form.title} (copy)`,
      fields: form.fields,
      isOpen: false,
      intro: form.intro,
      closesAt: form.closesAt,
      cap: form.cap,
    });
  },

  async deleteRecruitmentForm(formId: string): Promise<void> {
    const { error } = await supabaseAdmin.from(TABLES.RECRUITMENT_FORMS).delete().eq("id", formId);
    if (error) throw error;
  },

  async setRecruitmentFormOpen(formId: string, isOpen: boolean): Promise<void> {
    const { error } = await supabaseAdmin
      .from(TABLES.RECRUITMENT_FORMS)
      .update({ is_open: isOpen })
      .eq("id", formId);
    if (error) throw error;
  },

  mapApplicant(r: Record<string, unknown>): StaffApplicant {
    const responses = (r.responses && typeof r.responses === "object" ? r.responses : {}) as Record<
      string,
      unknown
    >;
    const extra = asRecord(r.extra);
    const timelineRaw = Array.isArray(extra.timeline) ? extra.timeline : [];
    const timeline = timelineRaw
      .map((entry) => {
        const row = asRecord(entry);
        const at = String(row.at || "");
        const kind = String(row.kind || "");
        if (!at || !kind) return null;
        return { at, kind, note: row.note ? String(row.note) : undefined };
      })
      .filter(Boolean) as StaffApplicant["timeline"];
    return {
      id: String(r.id),
      formId: String(r.form_id || ""),
      teamId: String(r.team_id),
      positionId: (r.position_id as string) || null,
      email: String(r.email || responses.email || ""),
      responses,
      status: asApplicantStatus(r.status),
      appliedAt: String(r.applied_at || ""),
      interviewAt: (r.interview_at as string) || null,
      interviewNotes: String(r.interview_notes || ""),
      privateNotes: String(extra.privateNotes || ""),
      timeline,
      interviewLink: (extra.interviewLink as string) || null,
      interviewLocation: (extra.interviewLocation as string) || null,
      interviewTz: (extra.interviewTz as string) || null,
    };
  },

  async getApplicant(applicantId: string): Promise<StaffApplicant | null> {
    const { data, error } = await supabaseAdmin
      .from(TABLES.APPLICANTS)
      .select(APPLICANT_COLS)
      .eq("id", applicantId)
      .maybeSingle();
    if (error || !data) return null;
    return this.mapApplicant(data as Record<string, unknown>);
  },

  async listApplicants(teamId: string): Promise<StaffApplicant[]> {
    const byTeam = await this.listApplicantsForTeams([teamId]);
    return byTeam.get(teamId) ?? [];
  },

  async listApplicantsForTeams(teamIds: string[]): Promise<Map<string, StaffApplicant[]>> {
    const unique = [...new Set(teamIds.filter(Boolean))];
    const out = new Map<string, StaffApplicant[]>();
    for (const id of unique) out.set(id, []);
    if (!unique.length) return out;
    const { data } = await supabaseAdmin
      .from(TABLES.APPLICANTS)
      .select(APPLICANT_COLS)
      .in("team_id", unique)
      .order("applied_at", { ascending: true });
    for (const r of data ?? []) {
      const app = this.mapApplicant(r as Record<string, unknown>);
      const list = out.get(app.teamId) ?? [];
      list.push(app);
      out.set(app.teamId, list);
    }
    return out;
  },

  async addApplicant(params: {
    teamId: string;
    formId: string;
    email: string;
    name: string;
    positionId?: string | null;
    responses?: Record<string, unknown>;
  }): Promise<void> {
    const email = params.email.trim().toLowerCase();
    if (!email) throw new Error("Email is required.");
    const form = await this.getRecruitmentForm(params.formId);
    if (!form || !form.isOpen) throw new Error("This application form is not open.");
    if (form.closesAt && new Date(form.closesAt).getTime() < Date.now()) {
      throw new Error("This application form has closed.");
    }
    if (form.cap && form.cap > 0) {
      const { count } = await supabaseAdmin
        .from(TABLES.APPLICANTS)
        .select("id", { count: "exact", head: true })
        .eq("form_id", params.formId)
        .neq("status", "withdrawn");
      if ((count ?? 0) >= form.cap) throw new Error("This form has reached its applicant cap.");
    }
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin.from(TABLES.APPLICANTS).insert({
      team_id: params.teamId,
      form_id: params.formId,
      email,
      position_id: params.positionId || null,
      responses: { name: params.name, ...params.responses },
      status: "applied",
      extra: {
        privateNotes: "",
        timeline: [{ at: now, kind: "applied", note: "Application received" }],
      },
    });
    if (error) {
      if (error.code === "23505")
        throw new Error("This email already has an application for this form.");
      throw error;
    }
  },

  async updateApplicantNotes(applicantId: string, privateNotes: string): Promise<void> {
    const { data: row, error: readError } = await supabaseAdmin
      .from(TABLES.APPLICANTS)
      .select("extra")
      .eq("id", applicantId)
      .maybeSingle();
    if (readError || !row) throw new Error("Applicant not found.");
    const extra = { ...asRecord(row.extra), privateNotes: privateNotes.trim() };
    const { error } = await supabaseAdmin
      .from(TABLES.APPLICANTS)
      .update({ extra })
      .eq("id", applicantId);
    if (error) throw error;
  },

  async appendApplicantTimeline(
    applicantId: string,
    entry: { kind: string; note?: string },
  ): Promise<void> {
    const { data: row, error: readError } = await supabaseAdmin
      .from(TABLES.APPLICANTS)
      .select("extra")
      .eq("id", applicantId)
      .maybeSingle();
    if (readError || !row) throw new Error("Applicant not found.");
    const extra = asRecord(row.extra);
    const timeline = Array.isArray(extra.timeline) ? [...extra.timeline] : [];
    timeline.push({
      at: new Date().toISOString(),
      kind: entry.kind,
      note: entry.note || undefined,
    });
    const { error } = await supabaseAdmin
      .from(TABLES.APPLICANTS)
      .update({ extra: { ...extra, timeline } })
      .eq("id", applicantId);
    if (error) throw error;
  },

  async setApplicantStatus(params: {
    applicantId: string;
    status: ApplicantStatus;
    interviewAt?: string | null;
    interviewNotes?: string;
    interviewLink?: string | null;
    interviewLocation?: string | null;
    interviewTz?: string | null;
  }): Promise<{ memberCreated: boolean; needsJoin: boolean }> {
    const { data: applicant, error: readError } = await supabaseAdmin
      .from(TABLES.APPLICANTS)
      .select(APPLICANT_COLS)
      .eq("id", params.applicantId)
      .maybeSingle();
    if (readError || !applicant) throw new Error("Applicant not found.");
    if (params.status === "interview_scheduled" && !params.interviewAt) {
      throw new Error("Choose an interview date and time.");
    }
    const prevExtra = asRecord(applicant.extra);
    const timeline = Array.isArray(prevExtra.timeline) ? [...prevExtra.timeline] : [];
    timeline.push({
      at: new Date().toISOString(),
      kind: params.status,
      note: params.interviewNotes?.trim() || undefined,
    });
    const patch: Record<string, unknown> = {
      status: params.status,
      extra: {
        ...prevExtra,
        timeline,
        ...(params.status === "interview_scheduled"
          ? {
              interviewLink: params.interviewLink || null,
              interviewLocation: params.interviewLocation || null,
              interviewTz: params.interviewTz || null,
            }
          : {}),
      },
    };
    if (params.status === "interview_scheduled") {
      patch.interview_at = params.interviewAt;
      patch.interview_notes = params.interviewNotes?.trim() || "";
    }
    const { error } = await supabaseAdmin
      .from(TABLES.APPLICANTS)
      .update(patch)
      .eq("id", params.applicantId);
    if (error) throw error;
    if (params.status !== "accepted") return { memberCreated: false, needsJoin: false };

    const email = String(applicant.email || "")
      .trim()
      .toLowerCase();
    if (!email) return { memberCreated: false, needsJoin: true };
    const { data: user } = await supabaseAdmin
      .from(TABLES.USERS)
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (!user?.id) return { memberCreated: false, needsJoin: true };
    const { data: existing } = await supabaseAdmin
      .from(TABLES.TEAM_MEMBERS)
      .select("id")
      .eq("team_id", applicant.team_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (existing) {
      await supabaseAdmin
        .from(TABLES.TEAM_MEMBERS)
        .update({ position_id: applicant.position_id || null })
        .eq("id", existing.id);
      return { memberCreated: true, needsJoin: false };
    }
    const responses = (
      applicant.responses && typeof applicant.responses === "object" ? applicant.responses : {}
    ) as Record<string, unknown>;
    const { error: memberError } = await supabaseAdmin.from(TABLES.TEAM_MEMBERS).insert({
      team_id: applicant.team_id,
      user_id: user.id,
      role: "member",
      position_id: applicant.position_id || null,
      source: "recruited",
      display_name: String(responses.name || ""),
      email,
    });
    if (memberError) throw memberError;
    return { memberCreated: true, needsJoin: false };
  },

  async onboardApplicantWithoutUser(params: {
    applicantId: string;
    role?: TeamMemberRole;
    positionId?: string | null;
  }): Promise<{ memberId: string; email: string; displayName: string }> {
    const { data: applicant, error } = await supabaseAdmin
      .from(TABLES.APPLICANTS)
      .select(APPLICANT_COLS)
      .eq("id", params.applicantId)
      .maybeSingle();
    if (error || !applicant) throw new Error("Applicant not found.");
    const email = String(applicant.email || "")
      .trim()
      .toLowerCase();
    if (!email) throw new Error("Applicant email is required.");
    const responses = (
      applicant.responses && typeof applicant.responses === "object" ? applicant.responses : {}
    ) as Record<string, unknown>;
    const displayName = String(responses.name || email);
    const { data: member, error: memberError } = await supabaseAdmin
      .from(TABLES.TEAM_MEMBERS)
      .insert({
        team_id: applicant.team_id,
        user_id: null,
        role: params.role || "member",
        position_id: params.positionId ?? applicant.position_id ?? null,
        source: "recruited",
        display_name: displayName,
        email,
      })
      .select("id")
      .single();
    if (memberError) throw memberError;
    await supabaseAdmin
      .from(TABLES.APPLICANTS)
      .update({ status: "accepted" })
      .eq("id", params.applicantId);
    return { memberId: String(member.id), email, displayName };
  },
};
