"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { randomUUID } from "crypto";
import { TABLES } from "@/data/collections";
import { supabaseAdmin, CERTIFICATES_BUCKET } from "@/data/supabase";
import { toIsoDate } from "@/src/lib/datetime";
import { type ActionResult, fail, ok } from "@/src/lib/action";
import { assertEventActor } from "@/src/features/events/ownership";
import { getStaffEventGrant, staffCanAct } from "@/src/features/hackathon/staffEventAccess";
import { uploadMedia } from "@/src/features/media/uploadMedia.action";
import { getEventOrganizations } from "@/src/features/organizations/organizations.service";
import { getTrack, listTeams } from "../hackathon.service";
import { hackathonDashPath, organizerHackathonCachePaths } from "../kinds";
import { pickExtra } from "../teamWrite";
import {
  assertUtcIsoPayload,
  competitionDatesFromForm,
  validateCompetitionDateOrder,
} from "../competitionDates";
import { sanitizeDescriptionHtml } from "@/src/lib/sanitizeHtml";
import { EventService } from "@/src/services/event.service";

const MAX_RULES_BYTES = 15 * 1024 * 1024;
const MAX_TEAM_CEILING = 20;

function replaceTrackPrizes(trackId: string, formData: FormData) {
  const positions = formData.getAll("prizePosition").map((v) => String(v).trim());
  const amounts = formData.getAll("prizeAmount").map((v) => String(v).trim());
  const descriptions = formData.getAll("prizeDescription").map((v) => String(v).trim());
  const rows = positions
    .map((position_label, i) => ({
      track_id: trackId,
      position_label,
      amount: amounts[i] || null,
      description: descriptions[i] || null,
      order_index: i,
    }))
    .filter((r) => r.position_label);
  return supabaseAdmin
    .from(TABLES.HACKATHON_TRACK_PRIZES)
    .delete()
    .eq("track_id", trackId)
    .then(async ({ error }) => {
      if (error) throw error;
      if (!rows.length) return;
      const { error: ins } = await supabaseAdmin.from(TABLES.HACKATHON_TRACK_PRIZES).insert(rows);
      if (ins) throw ins;
    });
}

function num(formData: FormData, key: string, fallback: number): number {
  const raw = String(formData.get(key) ?? "").trim();
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export async function saveTrack(
  eventId: string,
  prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const event = await assertEventActor(eventId, "competitions");
    if (!event) return fail("You cannot change tracks for that event.");

    const trackId = String(formData.get("trackId") ?? "").trim();
    const name = String(formData.get("name") ?? "").trim();
    if (!name) return fail("Give the track a name.");
    if (name.length > 120) return fail("That track name is too long.");

    const minTeamSize = Math.max(1, Math.round(num(formData, "minTeamSize", 1)));
    const maxTeamSize = Math.max(1, Math.round(num(formData, "maxTeamSize", 4)));
    if (maxTeamSize < minTeamSize) {
      return fail("The maximum team size cannot be smaller than the minimum.");
    }
    if (maxTeamSize > MAX_TEAM_CEILING) {
      return fail(`Keep the maximum team size at ${MAX_TEAM_CEILING} or below.`);
    }

    const fee = Math.max(0, num(formData, "fee", 0));
    const eventRow = await EventService.getEventByID(eventId);
    const timeZone = eventRow?.schedule?.timezone || "UTC";
    const dates = competitionDatesFromForm(
      {
        registrationClosesAt: String(formData.get("registrationClosesAt") ?? ""),
      },
      timeZone,
    );
    try {
      assertUtcIsoPayload(dates);
    } catch {
      return fail("Competition dates must use full date and time values.");
    }
    const orderErr = validateCompetitionDateOrder(dates);
    if (orderErr) return fail(orderErr.message);

    const kind = String(formData.get("isCtf") ?? "") === "true" ? "ctf" : "other";

    const existing = trackId ? await getTrack(trackId) : null;
    if (trackId && (!existing || existing.eventId !== event.id)) {
      return fail("That track does not belong to this event.");
    }
    if (trackId && !(await staffCanAct(eventId, "competitions", trackId))) {
      return fail("You cannot change tracks for that event.");
    }
    if (!trackId) {
      const grant = await getStaffEventGrant(eventId);
      if (grant.isStaff && grant.trackIds) return fail("Your role cannot add a new competition.");
    }

    if (existing) {
      const teams = await listTeams(existing.id);
      const largest = teams.reduce((n, t) => Math.max(n, t.members.length), 0);
      if (largest > maxTeamSize) {
        return fail(
          `A team on this track already has ${largest} members, so the maximum cannot go below that.`,
        );
      }
    }

    // Canonical rules & instructions = instructions* columns (rules_* deprecated dual-write stopped).
    let instructionsPath = existing?.instructionsFilePath || existing?.rulesPath || "";
    let instructionsName = existing?.instructionsFileName || existing?.rulesName || "";
    const instructionsFile = formData.get("instructionsFile");
    if (instructionsFile instanceof File && instructionsFile.size > 0) {
      if (instructionsFile.size > MAX_RULES_BYTES) {
        return fail("That file is too large. Please keep it under 15MB.");
      }
      const upload = new FormData();
      upload.append("file", instructionsFile);
      upload.append("folder", "track-instructions");
      upload.append("bucket", CERTIFICATES_BUCKET);
      const uploaded = await uploadMedia(upload);
      if (!uploaded.success) {
        return fail(uploaded.error || "That file could not be uploaded.");
      }
      instructionsPath = uploaded.path;
      instructionsName = instructionsFile.name;
    }

    let imageUrl = existing?.imageUrl ?? "";
    const image = formData.get("image");
    if (image instanceof File && image.size > 0) {
      const upload = new FormData();
      upload.append("file", image);
      upload.append("folder", "track-images");
      const uploaded = await uploadMedia(upload);
      if (!uploaded.success) {
        return fail(uploaded.error || "That image could not be uploaded.");
      }
      imageUrl = uploaded.url;
    }

    const now = new Date().toISOString();
    const id = trackId || randomUUID();
    const instructionsHtml = sanitizeDescriptionHtml(
      String(formData.get("instructions") ?? "").trim(),
    ).slice(0, 50000);
    const mergedInstructions =
      instructionsHtml || existing?.instructions || existing?.rulesText || "";
    const row: Record<string, unknown> = {
      id,
      event_id: event.id,
      organizer_id: event.organizerId,
      name,
      description: String(formData.get("description") ?? "")
        .trim()
        .slice(0, 4000),
      kind,
      // Canonical field; keep rules_text in sync once for legacy readers, no separate UI.
      instructions: mergedInstructions,
      instructions_file_path: instructionsPath,
      instructions_file_name: instructionsName,
      rules_text: mergedInstructions,
      rules_file_path: instructionsPath,
      rules_file_name: instructionsName,
      fee,
      currency: event.pricing?.currency || "PKR",
      min_team_size: minTeamSize,
      max_team_size: maxTeamSize,
      // Deprecated date columns — stop writing (null).
      opens_at: null,
      closes_at: null,
      registration_closes_at: dates.registrationClosesAt,
      roster_locks_at: null,
      submission_deadline_at: null,
      prize_pool: String(formData.get("prizePool") ?? "")
        .trim()
        .slice(0, 2000),
      image_url: imageUrl,
      discount_percent: Math.max(
        0,
        num(formData, "discountPercent", existing?.discountPercent ?? 0),
      ),
      discount_note: String(formData.get("discountNote") ?? "")
        .trim()
        .slice(0, 500),
      discount_expires_at:
        toIsoDate(String(formData.get("discountExpiresAt") ?? "").trim()) || null,
      updated_at: now,
    };
    if (!existing) {
      // Deprecated column `rubric` — do not write (leave DB default).
      row.current_round = 1;
      row.created_at = now;
    }

    const { error } = await supabaseAdmin.from(TABLES.HACKATHON_TRACKS).upsert(row as never);
    if (error) throw error;

    const sponsorOrgId = String(formData.get("sponsorOrgId") ?? "").trim();
    if (formData.has("sponsorOrgId")) {
      const orgs = await getEventOrganizations(event.id);
      for (const org of orgs) {
        if (org.type !== "sponsor") continue;
        const pointsHere = org.trackId === id;
        const shouldPoint = org.id === sponsorOrgId;
        if (pointsHere === shouldPoint) continue;
        const { data: orgRow } = await supabaseAdmin
          .from(TABLES.EVENT_ORGANIZATIONS)
          .select("extra")
          .eq("id", org.id)
          .maybeSingle();
        const extra = {
          ...pickExtra(orgRow as Record<string, unknown> | null),
          trackId: shouldPoint ? id : "",
          track_id: shouldPoint ? id : "",
          sponsorTrackId: shouldPoint ? id : "",
        };
        const { error: orgErr } = await supabaseAdmin
          .from(TABLES.EVENT_ORGANIZATIONS)
          .update({ track_id: shouldPoint ? id : null, extra, updated_at: now } as never)
          .eq("id", org.id);
        if (orgErr) throw orgErr;
      }
    }

    await replaceTrackPrizes(id, formData);

    for (const path of organizerHackathonCachePaths(event.organizerId, event.id, id)) {
      revalidatePath(path);
    }
    revalidatePath(`/events/${event.id}/tracks`);
    return ok();
  } catch (err) {
    if (isRedirectError(err)) throw err;
    console.error("[saveTrack]", err);
    return fail("Could not save that track. Please try again.");
  }
}

export async function removeTrack(eventId: string, formData: FormData): Promise<void> {
  let backTo = "/";

  try {
    const event = await assertEventActor(eventId, "competitions");
    if (!event) redirect("/");
    backTo = hackathonDashPath(event.organizerId, event.id, "competitions");

    const trackId = String(formData.get("trackId") ?? "").trim();
    const track = trackId ? await getTrack(trackId) : null;
    if (!track || track.eventId !== event.id) {
      redirect(`${backTo}?e=${encodeURIComponent("That track does not belong to this event.")}`);
    }
    if (!(await staffCanAct(eventId, "competitions", track.id))) redirect("/");

    const teams = await listTeams(track.id);
    if (teams.length) {
      const message = `This track has ${teams.length} team${teams.length === 1 ? "" : "s"}. Remove them first.`;
      redirect(`${backTo}?e=${encodeURIComponent(message)}`);
    }

    const { error } = await supabaseAdmin.from(TABLES.HACKATHON_TRACKS).delete().eq("id", track.id);
    if (error) throw error;

    const orgs = await getEventOrganizations(event.id);
    const stale = orgs.filter((o) => o.sponsorTrackId === track.id);
    const now = new Date().toISOString();
    for (const org of stale) {
      const { data: orgRow } = await supabaseAdmin
        .from(TABLES.EVENT_ORGANIZATIONS)
        .select("extra")
        .eq("id", org.id)
        .maybeSingle();
      const extra = {
        ...pickExtra(orgRow as Record<string, unknown> | null),
        trackId: "",
        track_id: "",
        sponsorTrackId: "",
      };
      const { error: orgErr } = await supabaseAdmin
        .from(TABLES.EVENT_ORGANIZATIONS)
        .update({ track_id: null, extra, updated_at: now } as never)
        .eq("id", org.id);
      if (orgErr) throw orgErr;
    }

    revalidatePath(backTo);
    revalidatePath(`/events/${event.id}/tracks`);
    redirect(backTo);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    console.error("[removeTrack]", err);
    redirect(`${backTo}?e=${encodeURIComponent("Could not remove that track.")}`);
  }
}

export async function endTrack(eventId: string, formData: FormData): Promise<void> {
  let backTo = "/";
  try {
    const event = await assertEventActor(eventId, "competitions");
    if (!event) redirect("/");
    backTo = hackathonDashPath(event.organizerId, event.id, "competitions");
    const trackId = String(formData.get("trackId") ?? "").trim();
    const track = trackId ? await getTrack(trackId) : null;
    if (!track || track.eventId !== event.id) {
      redirect(
        `${backTo}?e=${encodeURIComponent("That competition does not belong to this event.")}`,
      );
    }
    if (!(await staffCanAct(eventId, "competitions", track.id))) redirect("/");
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from(TABLES.HACKATHON_TRACKS)
      .update({ status: "ended", ended_at: now, updated_at: now } as never)
      .eq("id", track.id);
    if (error) throw error;
    revalidatePath(backTo);
    revalidatePath(`${backTo}/${track.id}`);
    redirect(`${backTo}?ok=${encodeURIComponent(`${track.name} has ended.`)}`);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    console.error("[endTrack]", err);
    redirect(`${backTo}?e=${encodeURIComponent("Could not end that competition.")}`);
  }
}
