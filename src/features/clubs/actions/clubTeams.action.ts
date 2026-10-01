"use server";

import { revalidatePath } from "next/cache";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { fail, ok, type ActionResult } from "@/src/lib/action";
import { finishForm } from "@/src/lib/formRedirect";
import { AuthService } from "@/src/features/auth/authService";
import { listClubModules } from "@/src/features/department/department.service";
import { TeamEngineService } from "@/src/features/teams/teamEngine.service";
import { isClubPresident, resolveClub } from "../club.service";

async function assertClubTeams(clubId: string) {
  const user = await AuthService.getCurrentUser();
  if (!user) return { ok: false as const, error: fail("Please sign in.") };
  const club = await resolveClub(clubId);
  if (!isClubPresident(user, club)) return { ok: false as const, error: fail("Only this club's president can manage teams.") };
  const modules = await listClubModules(clubId);
  if (!modules.includes("teams_basic") && !modules.includes("teams_advanced_roles")) {
    return { ok: false as const, error: fail("Your department has not granted Teams to this club.") };
  }
  return { ok: true as const, user, club, advanced: modules.includes("teams_advanced_roles") };
}

function backTo(clubId: string) {
  return `/clubs/${clubId}/teams`;
}

export async function createClubTeam(formData: FormData): Promise<void> {
  const clubId = String(formData.get("clubId") ?? "");
  finishForm(formData, backTo(clubId), await createClubTeamImpl(formData), "Team created.");
}

async function createClubTeamImpl(formData: FormData): Promise<ActionResult> {
  const clubId = String(formData.get("clubId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  if (!clubId || !name) return fail("Team name is required.");
  const gate = await assertClubTeams(clubId);
  if (!gate.ok) return gate.error;

  const team = await TeamEngineService.createTeam({
    name,
    contextType: "club_committee",
    orgId: clubId,
    creatorUserId: gate.user.userId,
  });
  await supabaseAdmin.from(TABLES.CLUB_ROSTER).insert({
    team_id: team.id,
    user_id: gate.user.userId,
    full_name: gate.user.name || gate.user.email || "President",
    email: gate.user.email,
    designation: "Team lead",
    is_lead: true,
  });
  revalidatePath(backTo(clubId));
  revalidatePath(`/clubs/${clubId}`);
  return ok();
}

export async function addClubTeamMember(formData: FormData): Promise<void> {
  const clubId = String(formData.get("clubId") ?? "");
  finishForm(formData, backTo(clubId), await addClubTeamMemberImpl(formData), "Member added.");
}

async function addClubTeamMemberImpl(formData: FormData): Promise<ActionResult> {
  const clubId = String(formData.get("clubId") ?? "").trim();
  const teamId = String(formData.get("teamId") ?? "").trim();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const memberCode = String(formData.get("memberCode") ?? "").trim();
  const designation = String(formData.get("designation") ?? "").trim();
  const asLead = String(formData.get("isLead") ?? "") === "on";
  if (!fullName || !teamId) return fail("Name and team are required.");
  const gate = await assertClubTeams(clubId);
  if (!gate.ok) return gate.error;

  const team = await TeamEngineService.getTeam(teamId);
  if (!team || team.orgId !== clubId) return fail("That team is not in this club.");

  let userId: string | null = null;
  if (email) {
    const { data: existing } = await supabaseAdmin.from(TABLES.USERS).select("id").eq("email", email).maybeSingle();
    userId = existing?.id ?? null;
    if (userId) {
      const { data: already } = await supabaseAdmin
        .from(TABLES.TEAM_MEMBERS)
        .select("id")
        .eq("team_id", teamId)
        .eq("user_id", userId)
        .maybeSingle();
      if (!already) {
        await supabaseAdmin.from(TABLES.TEAM_MEMBERS).insert({
          team_id: teamId,
          user_id: userId,
          role: asLead ? "lead" : "member",
        });
      }
    }
  }

  await supabaseAdmin.from(TABLES.CLUB_ROSTER).insert({
    team_id: teamId,
    user_id: userId,
    full_name: fullName,
    email: email || null,
    phone: phone || null,
    member_code: memberCode || null,
    designation: designation || null,
    is_lead: asLead,
  });
  revalidatePath(backTo(clubId));
  return ok();
}

export async function updateClubTeamMember(formData: FormData): Promise<void> {
  const clubId = String(formData.get("clubId") ?? "");
  finishForm(formData, backTo(clubId), await updateClubTeamMemberImpl(formData), "Member updated.");
}

async function updateClubTeamMemberImpl(formData: FormData): Promise<ActionResult> {
  const clubId = String(formData.get("clubId") ?? "").trim();
  const personId = String(formData.get("personId") ?? "").trim();
  const designation = String(formData.get("designation") ?? "").trim();
  const makeLead = String(formData.get("action") ?? "") === "lead";
  const remove = String(formData.get("action") ?? "") === "remove";
  const gate = await assertClubTeams(clubId);
  if (!gate.ok) return gate.error;
  if (!gate.advanced && (makeLead || remove)) return fail("Promoting or removing members needs advanced team roles.");

  const { data: person } = await supabaseAdmin.from(TABLES.CLUB_ROSTER).select("*").eq("id", personId).maybeSingle();
  if (!person) return fail("Member not found.");
  const team = await TeamEngineService.getTeam(String(person.team_id));
  if (!team || team.orgId !== clubId) return fail("That member is not in this club.");

  if (remove) {
    await supabaseAdmin.from(TABLES.CLUB_ROSTER).delete().eq("id", personId);
    if (person.user_id) {
      await supabaseAdmin.from(TABLES.TEAM_MEMBERS).delete().eq("team_id", person.team_id).eq("user_id", person.user_id);
    }
  } else if (makeLead) {
    await supabaseAdmin.from(TABLES.CLUB_ROSTER).update({ is_lead: true, designation: designation || person.designation }).eq("id", personId);
  } else {
    await supabaseAdmin.from(TABLES.CLUB_ROSTER).update({ designation: designation || null }).eq("id", personId);
  }
  revalidatePath(backTo(clubId));
  return ok();
}
