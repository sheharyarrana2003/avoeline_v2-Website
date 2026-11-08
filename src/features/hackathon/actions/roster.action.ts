"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { assertEventActor } from "@/src/features/events/ownership";
import { staffCanAct } from "@/src/features/hackathon/staffEventAccess";
import { mapToTeam } from "../hackathon.service";
import { hackathonTrackManagePath, hackathonDashPath } from "../kinds";
import { patchHackathonTeam } from "../teamWrite";
import type { FeeStatus, HackathonTeam } from "../types";

const FEE_STATUSES: FeeStatus[] = ["not_required", "fee_pending", "fee_paid"];

type Loaded =
  | { ok: false; backTo: string; error: string }
  | { ok: true; backTo: string; organizerId: string; eventId: string; team: HackathonTeam };

async function loadOwnedTeam(eventId: string, teamId: string): Promise<Loaded> {
  const event = await assertEventActor(eventId, "competitions");
  if (!event) redirect("/");

  const backTo = hackathonDashPath(event.organizerId, event.id, "competitions");

  const id = String(teamId ?? "").trim();
  if (!id) return { ok: false, backTo, error: "Missing team." };

  const { data, error } = await supabaseAdmin
    .from(TABLES.HACKATHON_TEAMS)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { ok: false, backTo, error: "That team no longer exists." };

  const team = mapToTeam(data, data.id);
  if (team.eventId !== event.id)
    return { ok: false, backTo, error: "That team is not on this event." };
  if (!(await staffCanAct(eventId, "competitions", team.trackId))) {
    return { ok: false, backTo, error: "You cannot manage that team." };
  }
  const trackBack = hackathonTrackManagePath(event.organizerId, event.id, team.trackId);
  return { ok: true, backTo: trackBack, organizerId: event.organizerId, eventId: event.id, team };
}

function done(backTo: string, eventId: string, error?: string): never {
  revalidatePath(backTo);
  revalidatePath(`/events/${eventId}/tracks`);
  redirect(error ? `${backTo}?e=${encodeURIComponent(error)}` : backTo);
}

export async function setTeamUnlocked(eventId: string, formData: FormData): Promise<void> {
  let backTo = "/";
  try {
    const loaded = await loadOwnedTeam(eventId, String(formData.get("teamId") ?? ""));
    backTo = loaded.backTo;
    if (!loaded.ok) done(loaded.backTo, eventId, loaded.error);

    await patchHackathonTeam(loaded.team.id, {
      unlockedByOrganizer: String(formData.get("unlocked") ?? "") === "true",
      updatedAt: new Date(),
    });

    revalidatePath(`/events/${loaded.eventId}/ticket/[registrationId]/team`, "page");
    done(loaded.backTo, eventId);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    console.error("[setTeamUnlocked]", err);
    redirect(`${backTo}?e=${encodeURIComponent("Could not change that.")}`);
  }
}

export async function setFeeStatus(eventId: string, formData: FormData): Promise<void> {
  let backTo = "/";
  try {
    const loaded = await loadOwnedTeam(eventId, String(formData.get("teamId") ?? ""));
    backTo = loaded.backTo;
    if (!loaded.ok) done(loaded.backTo, eventId, loaded.error);

    const raw = String(formData.get("feeStatus") ?? "");
    if (!FEE_STATUSES.includes(raw as FeeStatus))
      done(loaded.backTo, eventId, "That is not a fee status.");

    await patchHackathonTeam(loaded.team.id, { feeStatus: raw, updatedAt: new Date() });

    revalidatePath(`/events/${loaded.eventId}/ticket/[registrationId]/team`, "page");
    done(loaded.backTo, eventId);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    console.error("[setFeeStatus]", err);
    redirect(`${backTo}?e=${encodeURIComponent("Could not change that.")}`);
  }
}

export async function removeMember(eventId: string, formData: FormData): Promise<void> {
  let backTo = "/";
  try {
    const loaded = await loadOwnedTeam(eventId, String(formData.get("teamId") ?? ""));
    backTo = loaded.backTo;
    if (!loaded.ok) done(loaded.backTo, eventId, loaded.error);

    const registrationId = String(formData.get("registrationId") ?? "").trim();
    const { team } = loaded;
    if (!team.members.some((m) => m.registrationId === registrationId)) {
      done(loaded.backTo, eventId, "That person is not in this team.");
    }

    const members = team.members.filter((m) => m.registrationId !== registrationId);

    if (members.length === 0) {
      const { error } = await supabaseAdmin.from(TABLES.HACKATHON_TEAMS).delete().eq("id", team.id);
      if (error) throw error;
    } else {
      if (!members.some((m) => m.isOwner)) members[0] = { ...members[0], isOwner: true };
      await patchHackathonTeam(team.id, {
        members,
        memberRegistrationIds: members.map((m) => m.registrationId),
        updatedAt: new Date(),
      });
    }

    revalidatePath(`/events/${loaded.eventId}/ticket/[registrationId]/team`, "page");
    done(loaded.backTo, eventId);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    console.error("[removeMember]", err);
    redirect(`${backTo}?e=${encodeURIComponent("Could not remove that member.")}`);
  }
}

export async function removeTeam(eventId: string, formData: FormData): Promise<void> {
  let backTo = "/";
  try {
    const loaded = await loadOwnedTeam(eventId, String(formData.get("teamId") ?? ""));
    backTo = loaded.backTo;
    if (!loaded.ok) done(loaded.backTo, eventId, loaded.error);

    const { error } = await supabaseAdmin
      .from(TABLES.HACKATHON_TEAMS)
      .delete()
      .eq("id", loaded.team.id);
    if (error) throw error;

    const { scheduleSheetRefresh } =
      await import("@/src/features/connections/server/sheetSync.service");
    scheduleSheetRefresh(eventId, ["hackathon_teams"]);

    done(loaded.backTo, eventId);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    console.error("[removeTeam]", err);
    redirect(`${backTo}?e=${encodeURIComponent("Could not remove that team.")}`);
  }
}
