"use server";

import { revalidatePath } from "next/cache";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { ActionResult, fail, ok } from "@/src/lib/action";
import { assertEventActor } from "@/src/features/events/ownership";
import { joinCodeTaken, mapToTeam } from "@/src/features/hackathon/hackathon.service";
import { patchHackathonTeam } from "@/src/features/hackathon/teamWrite";
import { makeJoinCode } from "@/src/features/hackathon/types";

async function mintUniqueJoinCode(): Promise<string | null> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = makeJoinCode();
    if (!(await joinCodeTaken(candidate))) return candidate;
  }
  return null;
}

/**
 * Organizer revoke / regenerate for hackathon team join codes (docs/22 O2).
 * Revoke rotates the stored code so the old one stops matching, and marks
 * `joinCodeRevoked` so the drawer hides the secret until regenerate.
 */
export async function rotateTeamJoinCode(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult & { joinCode?: string | null }> {
  try {
    const teamId = String(formData.get("teamId") ?? "").trim();
    const mode = String(formData.get("mode") ?? "regenerate").trim();
    if (!teamId) return fail("Missing team.");
    if (mode !== "revoke" && mode !== "regenerate") return fail("Unknown join-code action.");

    const { data: row, error } = await supabaseAdmin
      .from(TABLES.HACKATHON_TEAMS)
      .select("*")
      .eq("id", teamId)
      .maybeSingle();
    if (error) throw error;
    if (!row) return fail("That team no longer exists.");

    const team = mapToTeam(row, row.id);
    const event = await assertEventActor(team.eventId, "attendees");
    if (!event) return fail("You cannot manage join codes for that event.");

    const nextCode = await mintUniqueJoinCode();
    if (!nextCode) return fail("Could not allocate a join code. Please try again.");

    const revoked = mode === "revoke";
    await patchHackathonTeam(teamId, {
      joinCode: nextCode,
      joinCodeRevoked: revoked,
      updatedAt: new Date(),
    });

    const { scheduleSheetRefresh } =
      await import("@/src/features/connections/server/sheetSync.service");
    scheduleSheetRefresh(event.id, ["hackathon_teams"]);

    revalidatePath(`/organizer/${event.organizerId}/events/${event.id}/attendees`);
    revalidatePath(`/organizer/${event.organizerId}/events/${event.id}`);
    return { ...ok(), joinCode: revoked ? null : nextCode };
  } catch (err) {
    console.error("[rotateTeamJoinCode]", err);
    return fail("Could not update that join code. Please try again.");
  }
}
