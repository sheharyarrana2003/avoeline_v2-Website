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

export async function createTeamAction(
  formData: FormData,
): Promise<TeamActionResult<{ teamId: string; joinCode: string }>> {
  try {
    const user = await AuthService.getCurrentUser().catch(() => null);
    if (!user?.userId) return teamFail("You must be signed in to create a team.");

    const name = String(formData.get("name") ?? "").trim();
    const contextType = String(formData.get("contextType") ?? "").trim() as TeamContextType;
    const parentRef = String(formData.get("parentRef") ?? "").trim();
    const eventId = String(formData.get("eventId") ?? "").trim() || undefined;
    const trackId = String(formData.get("trackId") ?? "").trim() || undefined;
    const orgId = String(formData.get("orgId") ?? "").trim() || undefined;
    const organizerId = String(formData.get("organizerId") ?? "").trim() || user.userId;

    if (!name) return teamFail("Team name is required.");
    if (
      !contextType ||
      !["hackathon_track", "club_committee", "event_staff"].includes(contextType)
    ) {
      return teamFail("Valid context type is required.");
    }

    if (contextType === "event_staff") {
      const { hasModuleAccess } = await import("@/src/features/permissions/permissions.service");
      const basic = await hasModuleAccess(organizerId, "teams_basic");
      const advanced = await hasModuleAccess(organizerId, "teams_advanced_roles");
      if (!basic && !advanced) return teamFail("Teams is not on this plan.");
    }

    // Map parentRef to the respective field if not explicitly supplied
    let resolvedTrackId = trackId;
    let resolvedOrgId = orgId;
    let resolvedEventId = eventId;

    if (contextType === "hackathon_track" && !resolvedTrackId) {
      resolvedTrackId = parentRef;
    } else if (contextType === "club_committee" && !resolvedOrgId) {
      resolvedOrgId = parentRef;
    }
    // event_staff library teams live on organizer_id; do not treat parentRef as eventId.

    const description = String(formData.get("description") ?? "").trim() || undefined;
    const teamType =
      String(formData.get("teamType") ?? formData.get("type") ?? "").trim() || undefined;
    const leadName = String(formData.get("leadName") ?? "").trim();
    const leadEmail = String(formData.get("leadEmail") ?? "").trim();
    const leadPhone = String(formData.get("leadPhone") ?? "").trim() || undefined;
    const leadDesignation = String(formData.get("leadDesignation") ?? "").trim() || undefined;
    const leadNotes = String(formData.get("leadNotes") ?? "").trim() || undefined;
    const leadIsMe =
      String(formData.get("leadIsMe") ?? "") === "1" ||
      String(formData.get("leadIsMe") ?? "") === "true";
    const leadUserIdRaw = String(formData.get("leadUserId") ?? "").trim();

    const hasExplicitLead = Boolean(leadName || leadEmail || formData.has("leadName"));
    if (hasExplicitLead && (!leadName || !leadEmail)) {
      return teamFail("Lead name and email are required.");
    }

    let lead:
      | {
          name: string;
          email: string;
          phone?: string;
          designation?: string;
          notes?: string;
          userId?: string | null;
        }
      | undefined;
    if (hasExplicitLead) {
      lead = {
        name: leadName,
        email: leadEmail,
        phone: leadPhone,
        designation: leadDesignation,
        notes: leadNotes,
        userId: leadIsMe ? user.userId : leadUserIdRaw || null,
      };
    }

    let team;
    try {
      team = await TeamEngineService.createTeam({
        name,
        contextType,
        eventId: resolvedEventId,
        trackId: resolvedTrackId,
        orgId: resolvedOrgId,
        creatorUserId: user.userId,
        organizerId,
        description,
        teamType,
        lead: lead ?? null,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("lead")) return teamFail(msg);
      throw err;
    }

    type ExtraMember = {
      name: string;
      email?: string;
      phone?: string;
      role?: "lead" | "member";
      designation?: string;
      notes?: string;
      positionId?: string;
    };
    const extra: ExtraMember[] = [];
    const extraJson = String(formData.get("membersJson") ?? "").trim();
    if (extraJson) {
      try {
        const parsed = JSON.parse(extraJson) as unknown;
        if (Array.isArray(parsed)) {
          for (const row of parsed) {
            if (!row || typeof row !== "object") continue;
            const rec = row as Record<string, unknown>;
            const memberName = String(rec.name ?? "").trim();
            if (!memberName) continue;
            extra.push({
              name: memberName,
              email: String(rec.email ?? "").trim() || undefined,
              phone: String(rec.phone ?? "").trim() || undefined,
              role: String(rec.role ?? "") === "lead" ? "lead" : "member",
              designation: String(rec.designation ?? "").trim() || undefined,
              notes: String(rec.notes ?? "").trim() || undefined,
              positionId: String(rec.positionId ?? "").trim() || undefined,
            });
          }
        }
      } catch {
        return teamFail("Those extra members could not be read.");
      }
    }
    const names = formData.getAll("memberName").map(String);
    const emails = formData.getAll("memberEmail").map(String);
    const phones = formData.getAll("memberPhone").map(String);
    for (let i = 0; i < names.length; i++) {
      const memberName = names[i].trim();
      if (!memberName) continue;
      extra.push({ name: memberName, email: emails[i]?.trim(), phone: phones[i]?.trim() });
    }
    if (extra.length) {
      try {
        await TeamEngineService.addDirectMembers(team.id, extra);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        if (msg.includes("already on this team")) return teamFail(msg);
        throw err;
      }
    }

    // Revalidate appropriate paths
    if (resolvedEventId) {
      revalidatePath(`/organizer/${user.userId}/events/${resolvedEventId}`);
    }
    revalidatePath(`/organizer/${organizerId}/teams`);
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

export async function joinTeamByCodeAction(
  formData: FormData,
): Promise<TeamActionResult<{ teamId: string; teamName: string; contextType: string }>> {
  try {
    const user = await AuthService.getCurrentUser().catch(() => null);
    if (!user?.userId) return teamFail("You must be signed in to join a team.");

    const joinCode = String(formData.get("joinCode") ?? "")
      .trim()
      .toUpperCase();
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

    const team = await TeamEngineService.getTeam(teamId);
    if (team?.contextType === "event_staff") {
      const ownerId = team.organizerId || team.createdBy || "";
      const advanced = ownerId
        ? await (
            await import("@/src/features/permissions/permissions.service")
          ).hasModuleAccess(ownerId, "teams_advanced_roles")
        : false;
      if (!advanced)
        return { success: false, error: "Changing roles needs Advanced team roles on this plan." };
    }

    const result = await TeamEngineService.updateMemberRole({
      teamId,
      memberId,
      newRole,
      actorUserId: user.userId,
      allowOwner: true,
    });

    if (!result.success) return { success: false, error: result.error || "Failed to update role." };
    if (team?.organizerId) revalidatePath(`/organizer/${team.organizerId}/teams`);
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

    const team = await TeamEngineService.getTeam(teamId);
    if (team?.contextType === "event_staff") {
      const ownerId = team.organizerId || team.createdBy || "";
      const advanced = ownerId
        ? await (
            await import("@/src/features/permissions/permissions.service")
          ).hasModuleAccess(ownerId, "teams_advanced_roles")
        : false;
      if (!advanced)
        return {
          success: false,
          error: "Removing members needs Advanced team roles on this plan.",
        };
    }

    const result = await TeamEngineService.removeTeamMember({
      teamId,
      memberId,
      actorUserId: user.userId,
      allowOwner: true,
    });

    if (!result.success)
      return { success: false, error: result.error || "Failed to remove member." };
    if (team?.organizerId) revalidatePath(`/organizer/${team.organizerId}/teams`);
    return { success: true };
  } catch (err) {
    console.error("[removeTeamMemberAction]", err);
    return { success: false, error: "Failed to remove member." };
  }
}

export async function addDirectMemberAction(formData: FormData): Promise<ActionResult> {
  try {
    const user = await AuthService.getCurrentUser().catch(() => null);
    if (!user?.userId) return { success: false, error: "Sign in to add a member." };
    const teamId = String(formData.get("teamId") ?? "").trim();
    const name = String(formData.get("name") ?? "").trim();
    if (!teamId || !name) return { success: false, error: "Name is required." };
    const isLead = await TeamEngineService.isUserTeamLead(teamId, user.userId);
    const team = await TeamEngineService.getTeam(teamId);
    const isCreator = Boolean(team?.createdBy && team.createdBy === user.userId);
    const isOwner = Boolean(team?.organizerId && team.organizerId === user.userId);
    if (!isLead && !isCreator && !isOwner && user.role !== "platform_admin") {
      return { success: false, error: "Only a roster lead can add members this way." };
    }
    const email = String(formData.get("email") ?? "").trim();
    const roleRaw = String(formData.get("role") ?? "").trim();
    const role = roleRaw === "lead" ? "lead" : "member";
    try {
      await TeamEngineService.addDirectMembers(teamId, [
        {
          name,
          email: email || undefined,
          phone: String(formData.get("phone") ?? "").trim() || undefined,
          role,
          designation: String(formData.get("designation") ?? "").trim() || undefined,
          notes: String(formData.get("notes") ?? "").trim() || undefined,
          positionId: String(formData.get("positionId") ?? "").trim() || undefined,
        },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("already on this team")) return { success: false, error: msg };
      throw err;
    }
    const ownerId = team?.organizerId || team?.createdBy || "";
    if (ownerId) revalidatePath(`/organizer/${ownerId}/teams`);
    return { success: true };
  } catch (err) {
    console.error("[addDirectMemberAction]", err);
    return { success: false, error: "Could not add that member." };
  }
}

export async function renameTeamAction(formData: FormData): Promise<ActionResult> {
  try {
    const user = await AuthService.getCurrentUser().catch(() => null);
    if (!user?.userId) return { success: false, error: "Sign in to rename a team." };
    const teamId = String(formData.get("teamId") ?? "").trim();
    const name = String(formData.get("name") ?? "").trim();
    if (!teamId || !name) return { success: false, error: "A team name is required." };
    const team = await TeamEngineService.getTeam(teamId);
    if (!team) return { success: false, error: "That team was not found." };
    const ownerId = team.organizerId || team.createdBy || "";
    const advanced = ownerId
      ? await (
          await import("@/src/features/permissions/permissions.service")
        ).hasModuleAccess(ownerId, "teams_advanced_roles")
      : false;
    if (!advanced)
      return { success: false, error: "Renaming a team needs Advanced team roles on this plan." };
    if (ownerId !== user.userId && user.role !== "platform_admin") {
      return { success: false, error: "You cannot rename that team." };
    }
    const description = formData.has("description")
      ? String(formData.get("description") ?? "")
      : undefined;
    const teamType =
      formData.has("teamType") || formData.has("type")
        ? String(formData.get("teamType") ?? formData.get("type") ?? "")
        : undefined;
    if (description !== undefined || teamType !== undefined) {
      await TeamEngineService.updateTeamDetails(teamId, { name, description, teamType });
    } else {
      await TeamEngineService.renameTeam(teamId, name);
    }
    if (ownerId) revalidatePath(`/organizer/${ownerId}/teams`);
    return { success: true };
  } catch (err) {
    console.error("[renameTeamAction]", err);
    return { success: false, error: "Could not rename that team." };
  }
}

export async function deleteTeamAction(formData: FormData): Promise<ActionResult> {
  try {
    const user = await AuthService.getCurrentUser().catch(() => null);
    if (!user?.userId) return { success: false, error: "Sign in to delete a team." };
    const teamId = String(formData.get("teamId") ?? "").trim();
    const team = await TeamEngineService.getTeam(teamId);
    if (!team) return { success: false, error: "That team was not found." };
    const ownerId = team.organizerId || team.createdBy || "";
    const advanced = ownerId
      ? await (
          await import("@/src/features/permissions/permissions.service")
        ).hasModuleAccess(ownerId, "teams_advanced_roles")
      : false;
    if (!advanced)
      return { success: false, error: "Deleting a team needs Advanced team roles on this plan." };
    if (ownerId !== user.userId && user.role !== "platform_admin") {
      return { success: false, error: "You cannot delete that team." };
    }
    // Revokes grants for members not on another library team; never deletes Auth accounts.
    await TeamEngineService.deleteTeam(teamId, {
      revokeGrantsForOrganizerId: ownerId || undefined,
    });
    if (ownerId) revalidatePath(`/organizer/${ownerId}/teams`);
    return { success: true };
  } catch (err) {
    console.error("[deleteTeamAction]", err);
    return { success: false, error: "Could not delete that team." };
  }
}

export async function updateDirectMemberAction(formData: FormData): Promise<ActionResult> {
  try {
    const user = await AuthService.getCurrentUser().catch(() => null);
    if (!user?.userId) return { success: false, error: "Sign in to edit a member." };
    const teamId = String(formData.get("teamId") ?? "").trim();
    const memberId = String(formData.get("memberId") ?? "").trim();
    const name = String(formData.get("name") ?? "").trim();
    if (!teamId || !memberId || !name) return { success: false, error: "Name is required." };
    const team = await TeamEngineService.getTeam(teamId);
    if (!team) return { success: false, error: "That team was not found." };
    const ownerId = team.organizerId || team.createdBy || "";
    const isLead = await TeamEngineService.isUserTeamLead(teamId, user.userId);
    if (ownerId !== user.userId && !isLead && user.role !== "platform_admin") {
      return { success: false, error: "You cannot edit that member." };
    }
    const roleRaw = String(formData.get("role") ?? "").trim();
    try {
      await TeamEngineService.updateDirectMember(memberId, {
        teamId,
        name,
        email: String(formData.get("email") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        designation: formData.has("designation")
          ? String(formData.get("designation") ?? "")
          : undefined,
        notes: formData.has("notes") ? String(formData.get("notes") ?? "") : undefined,
        role: roleRaw === "lead" || roleRaw === "member" ? (roleRaw as TeamMemberRole) : undefined,
        positionId: formData.has("positionId")
          ? String(formData.get("positionId") ?? "") || null
          : undefined,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("already on this team")) return { success: false, error: msg };
      throw err;
    }
    if (ownerId) revalidatePath(`/organizer/${ownerId}/teams`);
    return { success: true };
  } catch (err) {
    console.error("[updateDirectMemberAction]", err);
    return { success: false, error: "Could not update that member." };
  }
}

export async function saveEventStaffAssignmentsAction(formData: FormData): Promise<void> {
  const { finishForm } = await import("@/src/lib/formRedirect");
  const { assertOwnedEvent } = await import("@/src/features/events/ownership");
  const eventId = String(formData.get("eventId") ?? "").trim();
  const organizerId = String(formData.get("organizerId") ?? "").trim();
  const fallback = `/organizer/${organizerId}/events/${eventId}/staff`;
  const { ok, fail } = await import("@/src/lib/action");
  const event = await assertOwnedEvent(eventId);
  if (!event) {
    finishForm(formData, fallback, fail("You cannot change staff for that event."));
    return;
  }
  const teamIds = formData.getAll("teamIds").map(String).filter(Boolean);
  const library = await TeamEngineService.listOrganizerStaffTeams(event.organizerId);
  const allowed = new Set(library.map((t) => t.id));
  const rows = await Promise.all(
    teamIds
      .filter((id) => allowed.has(id))
      .map(async (teamId) => {
        const selected = formData.getAll(`members_${teamId}`).map(String).filter(Boolean);
        const members = await TeamEngineService.getTeamMembers(teamId);
        const memberIds = !selected.length || selected.length >= members.length ? [] : selected;
        return { teamId, memberIds };
      }),
  );
  await TeamEngineService.setEventStaffAssignments(eventId, rows);
  revalidatePath(fallback);
  revalidatePath(`/organizer/${event.organizerId}/teams`);
  finishForm(formData, fallback, ok(), "Staff assignment saved.");
}

export async function createOrgAction(
  formData: FormData,
): Promise<TeamActionResult<{ orgId: string }>> {
  try {
    const user = await AuthService.getCurrentUser().catch(() => null);
    if (!user?.userId) return teamFail("You must be signed in to create an organization.");

    const name = String(formData.get("name") ?? "").trim();
    const type = String(formData.get("type") ?? "").trim() as OrgType;
    const parentOrgId = String(formData.get("parentOrgId") ?? "").trim() || undefined;

    if (!name) return teamFail("Organization name is required.");
    if (!type || !["department", "club"].includes(type))
      return teamFail("Valid organization type is required.");
    if (type === "club" && !parentOrgId)
      return teamFail("A club must be linked to a parent department.");

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
