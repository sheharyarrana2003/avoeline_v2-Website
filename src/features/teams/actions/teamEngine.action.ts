"use server";

import { revalidatePath } from "next/cache";
import { AuthService } from "@/src/features/auth/authService";
import { ActionResult } from "@/src/lib/action";
import { TeamEngineService } from "../teamEngine.service";
import type { TeamContextType, TeamMemberRole, OrgType } from "../teamEngine.types";

export type TeamActionResult<T = void> =
    | { ok: true; success: true; error?: undefined; data: T }
    | { ok: false; success: false; error: string; data?: undefined };

const teamOk = <T>(data: T): TeamActionResult<T> => ({ ok: true, success: true, data });
const teamFail = (error: string): TeamActionResult<never> => ({ ok: false, success: false, error });

export async function createTeamAction(formData: FormData): Promise<TeamActionResult<{ teamId: string; joinCode: string }>> {
    try {
        const user = await AuthService.getCurrentUser().catch(() => null);
        if (!user?.userId) return teamFail("You must be signed in to create a team.");

        const name = String(formData.get("name") ?? "").trim();
        const contextType = String(formData.get("contextType") ?? "").trim() as TeamContextType;
        const parentRef = String(formData.get("parentRef") ?? "").trim();
        const eventId = String(formData.get("eventId") ?? "").trim() || undefined;
        const trackId = String(formData.get("trackId") ?? "").trim() || undefined;
        const orgId = String(formData.get("orgId") ?? "").trim() || undefined;

        if (!name) return teamFail("Team name is required.");
        if (!contextType || !["hackathon_track", "club_committee", "event_staff"].includes(contextType)) {
            return teamFail("Valid context type is required.");
        }

        // Map parentRef to the respective field if not explicitly supplied
        let resolvedTrackId = trackId;
        let resolvedOrgId = orgId;
        let resolvedEventId = eventId;

        if (contextType === "hackathon_track" && !resolvedTrackId) {
            resolvedTrackId = parentRef;
        } else if (contextType === "club_committee" && !resolvedOrgId) {
            resolvedOrgId = parentRef;
        } else if (contextType === "event_staff" && !resolvedEventId) {
            resolvedEventId = parentRef;
        }

        const team = await TeamEngineService.createTeam({
            name,
            contextType,
            eventId: resolvedEventId,
            trackId: resolvedTrackId,
            orgId: resolvedOrgId,
            creatorUserId: user.userId,
        });

        // Revalidate appropriate paths
        if (resolvedEventId) {
            revalidatePath(`/organizer/${user.userId}/events/${resolvedEventId}`);
        }
        if (resolvedOrgId) {
            revalidatePath(`/admin/orgs/${resolvedOrgId}`);
            revalidatePath(`/clubs/${resolvedOrgId}`);
        }
        revalidatePath("/admin/orgs");

        return teamOk({ teamId: team.id, joinCode: team.joinCode });
    } catch (err) {
        console.error("[createTeamAction]", err);
        return teamFail("Failed to create team. Please try again.");
    }
}

export async function joinTeamByCodeAction(formData: FormData): Promise<TeamActionResult<{ teamId: string; teamName: string; contextType: string }>> {
    try {
        const user = await AuthService.getCurrentUser().catch(() => null);
        if (!user?.userId) return teamFail("You must be signed in to join a team.");

        const joinCode = String(formData.get("joinCode") ?? "").trim().toUpperCase();
        if (!joinCode) return teamFail("Please enter a join code.");

        const result = await TeamEngineService.joinTeamByCode(joinCode, user.userId);
        if (!result.success || !result.team) {
            return teamFail(result.error || "Could not join team.");
        }

        if (result.team.eventId) {
            revalidatePath(`/events/${result.team.eventId}`);
        }
        revalidatePath("/teams/join");

        return teamOk({
            teamId: result.team.id,
            teamName: result.team.name,
            contextType: result.team.contextType,
        });
    } catch (err) {
        console.error("[joinTeamByCodeAction]", err);
        return teamFail("Failed to join team. Please check the code and try again.");
    }
}

export async function updateMemberRoleAction(formData: FormData): Promise<ActionResult> {
    try {
        const user = await AuthService.getCurrentUser().catch(() => null);
        if (!user?.userId) return { success: false, error: "Authentication required." };

        const teamId = String(formData.get("teamId") ?? "").trim();
        const memberId = String(formData.get("memberId") ?? "").trim();
        const newRole = String(formData.get("role") ?? "").trim() as TeamMemberRole;

        if (!teamId || !memberId || !["lead", "member"].includes(newRole)) {
            return { success: false, error: "Invalid parameters." };
        }

        const result = await TeamEngineService.updateMemberRole({
            teamId,
            memberId,
            newRole,
            actorUserId: user.userId,
        });

        if (!result.success) return { success: false, error: result.error || "Failed to update role." };
        return { success: true };
    } catch (err) {
        console.error("[updateMemberRoleAction]", err);
        return { success: false, error: "Failed to update role." };
    }
}

export async function removeTeamMemberAction(formData: FormData): Promise<ActionResult> {
    try {
        const user = await AuthService.getCurrentUser().catch(() => null);
        if (!user?.userId) return { success: false, error: "Authentication required." };

        const teamId = String(formData.get("teamId") ?? "").trim();
        const memberId = String(formData.get("memberId") ?? "").trim();

        if (!teamId || !memberId) return { success: false, error: "Invalid parameters." };

        const result = await TeamEngineService.removeTeamMember({
            teamId,
            memberId,
            actorUserId: user.userId,
        });

        if (!result.success) return { success: false, error: result.error || "Failed to remove member." };
        return { success: true };
    } catch (err) {
        console.error("[removeTeamMemberAction]", err);
        return { success: false, error: "Failed to remove member." };
    }
}

export async function createOrgAction(formData: FormData): Promise<TeamActionResult<{ orgId: string }>> {
    try {
        const user = await AuthService.getCurrentUser().catch(() => null);
        if (!user?.userId) return teamFail("You must be signed in to create an organization.");

        const name = String(formData.get("name") ?? "").trim();
        const type = String(formData.get("type") ?? "").trim() as OrgType;
        const parentOrgId = String(formData.get("parentOrgId") ?? "").trim() || undefined;

        if (!name) return teamFail("Organization name is required.");
        if (!type || !["department", "club"].includes(type)) return teamFail("Valid organization type is required.");
        if (type === "club" && !parentOrgId) return teamFail("A club must be linked to a parent department.");

        const org = await TeamEngineService.createOrg({
            name,
            type,
            parentOrgId,
            ownerUid: user.userId,
        });

        revalidatePath("/admin/orgs");
        return teamOk({ orgId: org.id });
    } catch (err) {
        console.error("[createOrgAction]", err);
        return teamFail("Failed to create organization.");
    }
}
