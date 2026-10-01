import crypto from "crypto";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { UserService } from "@/src/services/user.service";
import type {
    OrgDoc,
    OrgType,
    TeamContextType,
    TeamDoc,
    TeamMemberDoc,
    TeamMemberRole,
    TeamWithMembers,
    TeamPositionDoc,
    StaffApplicant,
} from "./teamEngine.types";

export function generateJoinCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes = crypto.randomBytes(6);
    let code = "";
    for (let i = 0; i < 6; i++) {
        code += chars[bytes[i] % chars.length];
    }
    return code;
}

function mapTeam(row: Record<string, unknown>): TeamDoc {
    return {
        id: String(row.id),
        name: String(row.name || ""),
        contextType: row.context_type as TeamContextType,
        eventId: (row.event_id as string) || null,
        trackId: null,
        orgId: (row.org_id as string) || null,
        joinCode: String(row.join_code || ""),
        createdAt: String(row.created_at || ""),
        createdBy: (row.created_by as string) || undefined,
    };
}

function mapMember(row: Record<string, unknown>): TeamMemberDoc {
    return {
        id: String(row.id),
        teamId: String(row.team_id),
        userId: String(row.user_id),
        role: (row.role as TeamMemberRole) || "member",
        joinedAt: String(row.joined_at || ""),
    };
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
    }): Promise<TeamDoc> {
        let joinCode = generateJoinCode();
        for (let i = 0; i < 5; i++) {
            const { data: existing } = await supabaseAdmin.from(TABLES.TEAMS).select("id").eq("join_code", joinCode).maybeSingle();
            if (!existing) break;
            joinCode = generateJoinCode();
        }
        const { data, error } = await supabaseAdmin.from(TABLES.TEAMS).insert({
            name: params.name.trim(),
            context_type: params.contextType === "hackathon_track" ? "hackathon_track" : params.contextType,
            event_id: params.eventId || null,
            org_id: params.orgId || null,
            join_code: joinCode,
            created_by: params.creatorUserId || null,
        }).select("*").single();
        if (error) throw error;
        const team = mapTeam(data);
        if (params.creatorUserId) {
            await supabaseAdmin.from(TABLES.TEAM_MEMBERS).insert({
                team_id: team.id,
                user_id: params.creatorUserId,
                role: "lead",
            });
        }
        return team;
    },

    async getTeam(teamId: string): Promise<TeamDoc | null> {
        if (!teamId) return null;
        const { data } = await supabaseAdmin.from(TABLES.TEAMS).select("*").eq("id", teamId).maybeSingle();
        return data ? mapTeam(data) : null;
    },

    async getTeamByJoinCode(joinCode: string): Promise<TeamDoc | null> {
        const clean = String(joinCode || "").trim().toUpperCase();
        if (!clean) return null;
        const { data } = await supabaseAdmin.from(TABLES.TEAMS).select("*").eq("join_code", clean).maybeSingle();
        return data ? mapTeam(data) : null;
    },

    async getTeamMembers(teamId: string): Promise<TeamMemberDoc[]> {
        if (!teamId) return [];
        const { data } = await supabaseAdmin.from(TABLES.TEAM_MEMBERS).select("*").eq("team_id", teamId);
        const rawMembers = (data ?? []).map((d) => mapMember(d));
        const usersMap = await UserService.getUsersByIds(rawMembers.map((m) => m.userId));
        return rawMembers.map((m) => {
            const user = usersMap.get(m.userId);
            return {
                ...m,
                user: user ? { name: user.profile?.fullName || user.email || "Member", email: user.email || "" } : undefined,
            };
        });
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
        const { data, error } = await supabaseAdmin.from(TABLES.TEAM_MEMBERS).insert({
            team_id: team.id,
            user_id: userId,
            role: "member",
        }).select("*").single();
        if (error) return { success: false, error: error.message };
        return { success: true, team, member: mapMember(data) };
    },

    async updateMemberRole(params: { teamId: string; memberId: string; newRole: TeamMemberRole; actorUserId: string }) {
        const isLead = await this.isUserTeamLead(params.teamId, params.actorUserId);
        if (!isLead) return { success: false, error: "Only team leads can change member roles." };
        const { data } = await supabaseAdmin.from(TABLES.TEAM_MEMBERS).select("*").eq("id", params.memberId).maybeSingle();
        if (!data || data.team_id !== params.teamId) return { success: false, error: "Team member not found." };
        const { error } = await supabaseAdmin.from(TABLES.TEAM_MEMBERS).update({ role: params.newRole }).eq("id", params.memberId);
        if (error) return { success: false, error: error.message };
        return { success: true };
    },

    async removeTeamMember(params: { teamId: string; memberId: string; actorUserId: string }) {
        const { data } = await supabaseAdmin.from(TABLES.TEAM_MEMBERS).select("*").eq("id", params.memberId).maybeSingle();
        if (!data || data.team_id !== params.teamId) return { success: false, error: "Team member not found." };
        const isSelf = data.user_id === params.actorUserId;
        const isLead = await this.isUserTeamLead(params.teamId, params.actorUserId);
        if (!isSelf && !isLead) return { success: false, error: "You don't have permission to remove this member." };
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
        const { data: memberships } = await supabaseAdmin.from(TABLES.TEAM_MEMBERS).select("team_id").eq("user_id", userId);
        const teamIds = [...new Set((memberships ?? []).map((m) => m.team_id).filter(Boolean))];
        if (!teamIds.length) return [];
        const { data: teams } = await supabaseAdmin.from(TABLES.TEAMS).select("*").in("id", teamIds);
        return (teams ?? []).map((t) => mapTeam(t));
    },

    async getTeamsByContext(query: {
        contextType?: TeamContextType;
        eventId?: string | null;
        trackId?: string | null;
        orgId?: string | null;
    }): Promise<TeamDoc[]> {
        let q = supabaseAdmin.from(TABLES.TEAMS).select("*");
        if (query.contextType) q = q.eq("context_type", query.contextType);
        if (query.eventId) q = q.eq("event_id", query.eventId);
        if (query.orgId) q = q.eq("org_id", query.orgId);
        const { data } = await q;
        return (data ?? []).map((t) => mapTeam(t));
    },

    async createOrg(params: { name: string; type: OrgType; parentOrgId?: string | null; ownerUid: string }): Promise<OrgDoc> {
        const { data, error } = await supabaseAdmin.from(TABLES.ORGANIZATIONS).insert({
            name: params.name.trim(),
            org_type: params.type,
            parent_org_id: params.parentOrgId || null,
            owner_user_id: params.ownerUid || null,
        }).select("*").single();
        if (error) throw error;
        if (params.ownerUid) {
            await TeamEngineService.setOrgLead(data.id, params.ownerUid, params.type === "department" ? "department_admin" : "president");
        }
        return mapOrg(data);
    },

    /** The membership row is what routes a login to /department or the club dashboard. */
    async setOrgLead(orgId: string, userId: string, role: "department_admin" | "president"): Promise<void> {
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
        const { data } = await supabaseAdmin.from(TABLES.ORGANIZATIONS).select("*").eq("id", orgId).maybeSingle();
        return data ? mapOrg(data) : null;
    },

    async listOrgs(type?: OrgType): Promise<OrgDoc[]> {
        let q = supabaseAdmin.from(TABLES.ORGANIZATIONS).select("*");
        if (type) q = q.eq("org_type", type);
        const { data } = await q;
        return (data ?? []).map((d) => mapOrg(d));
    },

    async listClubsByDepartment(departmentId: string): Promise<OrgDoc[]> {
        if (!departmentId) return [];
        const { data } = await supabaseAdmin
            .from(TABLES.ORGANIZATIONS)
            .select("*")
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
        if (org) await TeamEngineService.setOrgLead(orgId, uid, org.org_type === "department" ? "department_admin" : "president");
    },

    async listPositions(teamId: string): Promise<TeamPositionDoc[]> {
        const { data } = await supabaseAdmin.from(TABLES.TEAM_POSITIONS).select("*").eq("team_id", teamId);
        return (data ?? []).map((r) => ({
            id: String(r.id),
            teamId: String(r.team_id),
            title: String(r.title || ""),
            permissions: Array.isArray(r.permissions) ? r.permissions.map(String) : [],
        }));
    },

    async createPosition(teamId: string, title: string): Promise<void> {
        const { error } = await supabaseAdmin.from(TABLES.TEAM_POSITIONS).insert({
            team_id: teamId,
            title: title.trim(),
            permissions: [],
        });
        if (error) throw error;
    },

    async ensureRecruitmentForm(teamId: string, title: string): Promise<string> {
        const { data: existing } = await supabaseAdmin
            .from(TABLES.RECRUITMENT_FORMS)
            .select("id")
            .eq("team_id", teamId)
            .maybeSingle();
        if (existing?.id) return String(existing.id);
        const { data, error } = await supabaseAdmin
            .from(TABLES.RECRUITMENT_FORMS)
            .insert({
                team_id: teamId,
                title: title.trim() || "Staff application",
                fields: [{ id: "why", label: "Why do you want this role?", type: "long_text" }],
                is_open: true,
            })
            .select("id")
            .single();
        if (error) throw error;
        return String(data.id);
    },

    async listApplicants(teamId: string): Promise<StaffApplicant[]> {
        const { data } = await supabaseAdmin.from(TABLES.APPLICANTS).select("*").eq("team_id", teamId);
        return (data ?? []).map((r) => ({
            id: String(r.id),
            formId: String(r.form_id || ""),
            teamId: String(r.team_id),
            responses: (r.responses && typeof r.responses === "object" ? r.responses : {}) as Record<string, unknown>,
            status: String(r.status || "applied"),
            appliedAt: String(r.applied_at || ""),
        }));
    },

    async addApplicant(teamId: string, formId: string, responses: Record<string, unknown>): Promise<void> {
        const { error } = await supabaseAdmin.from(TABLES.APPLICANTS).insert({
            team_id: teamId,
            form_id: formId,
            responses,
            status: "applied",
        });
        if (error) throw error;
    },

    async setApplicantStatus(applicantId: string, status: string): Promise<void> {
        const { error } = await supabaseAdmin.from(TABLES.APPLICANTS).update({ status }).eq("id", applicantId);
        if (error) throw error;
    },
};
