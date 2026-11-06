"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { randomUUID } from "crypto";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { type ActionResult, fail, ok } from "@/src/lib/action";
import { escapeHtml, sendBulkEmail, type Recipient } from "@/src/lib/email";
import { absoluteUrl } from "@/src/lib/appUrl";
import { OrganizerService } from "@/src/services/organizer.service";
import { RegService } from "@/src/services/registeration.service";
import { UserService } from "@/src/services/user.service";
import { assertEventActor, assertParticipant } from "@/src/features/events/ownership";
import { getEventForVisitor } from "@/src/features/registration/registration.service";
import { getTrack, listTeams, mapToMentor, mapToTeam } from "../hackathon.service";
import { isExpertise, livestreamUnsupported, parseSlotLines, slotIsOpen } from "../live";
import { hackathonDashPath, organizerHackathonCachePaths } from "../kinds";
import { pickExtra } from "../teamWrite";

const MAX_ANNOUNCEMENT = 4000;

export async function postAnnouncement(
  eventId: string,
  prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const event = await assertEventActor(eventId, "competitions");
    if (!event) return fail("You cannot post to that event.");

    const title = String(formData.get("title") ?? "").trim();
    const body = String(formData.get("body") ?? "").trim();
    if (!title) return fail("Give the announcement a title.");
    if (!body) return fail("Write something to announce.");

    const trackId = String(formData.get("trackId") ?? "").trim();
    const track = trackId ? await getTrack(trackId) : null;
    if (trackId && (!track || track.eventId !== event.id)) {
      return fail("That track does not belong to this event.");
    }

    const regs = await RegService.getRegsOfEvent(event.id);
    const live = regs.filter((r) => r.status !== "cancelled" && r.status !== "rejected");
    let audience = live;
    if (track) {
      const teams = await listTeams(track.id);
      const onTrack = new Set(teams.flatMap((t) => t.memberRegistrationIds));
      audience = live.filter((r) => onTrack.has(r.registrationId));
    }

    const usersById = audience.length
      ? await UserService.getUsersByIds(audience.map((r) => r.userId).filter(Boolean))
      : new Map();

    const recipients: Recipient[] = [];
    for (const reg of audience) {
      const user = usersById.get(String(reg.userId));
      const email = (user?.email || reg.attendee?.email || "").trim();
      if (email) {
        recipients.push({
          email,
          name: user?.profile?.fullName || reg.attendee?.name || undefined,
        });
      }
    }

    const shouldEmail = String(formData.get("sendEmail") ?? "") === "true";
    let emailedCount = 0;

    if (shouldEmail && recipients.length) {
      const organizer = await OrganizerService.getOrganizerById(event.organizerId).catch(
        () => null,
      );
      const link = await absoluteUrl(`/events/${event.id}/tracks`);
      const outcome = await sendBulkEmail(recipients, {
        subject: `${event.title}: ${title}`,
        senderName: organizer?.organization?.name?.trim(),
        html: `<p><strong>${escapeHtml(title)}</strong></p><p>${escapeHtml(body).replace(/\n/g, "<br />")}</p><p><a href="${link}">Open the hackathon</a></p>`,
        text: `${title}\n\n${body}\n\n${link}`,
      });
      emailedCount = outcome.sent;
    }

    const { error } = await supabaseAdmin.from(TABLES.HACKATHON_ANNOUNCEMENTS).insert({
      id: randomUUID(),
      event_id: event.id,
      track_id: track?.id ?? null,
      title: title.slice(0, 160),
      body: body.slice(0, MAX_ANNOUNCEMENT),
      emailed_count: emailedCount,
      created_at: new Date().toISOString(),
    });
    if (error) throw error;

    for (const path of organizerHackathonCachePaths(event.organizerId, event.id))
      revalidatePath(path);
    revalidatePath(`/events/${event.id}/tracks`);
    return {
      success: true,
      ...(shouldEmail && !emailedCount && recipients.length
        ? { error: "Posted, but the mail provider sent nothing — check the email configuration." }
        : {}),
    };
  } catch (err) {
    if (isRedirectError(err)) throw err;
    console.error("[postAnnouncement]", err);
    return fail("Could not post that announcement. Please try again.");
  }
}

export async function removeAnnouncement(eventId: string, formData: FormData): Promise<void> {
  let backTo = "/";
  try {
    const event = await assertEventActor(eventId, "competitions");
    if (!event) redirect("/");
    backTo = hackathonDashPath(event.organizerId, event.id, "competitions");

    const id = String(formData.get("announcementId") ?? "").trim();
    if (id) {
      const { data } = await supabaseAdmin
        .from(TABLES.HACKATHON_ANNOUNCEMENTS)
        .select("event_id")
        .eq("id", id)
        .maybeSingle();
      if (data && String(data.event_id) === event.id) {
        await supabaseAdmin.from(TABLES.HACKATHON_ANNOUNCEMENTS).delete().eq("id", id);
      }
    }
    revalidatePath(backTo);
    redirect(backTo);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    console.error("[removeAnnouncement]", err);
    redirect(`${backTo}?e=${encodeURIComponent("Could not remove that announcement.")}`);
  }
}

export async function signUpMentor(
  eventId: string,
  prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const code = String(formData.get("accessCode") ?? "").trim() || null;
    const { event, access } = await getEventForVisitor(eventId, { code });
    if (!event) return fail("This event is no longer open.");
    if (!access.allowed) return fail("This hackathon is private. Enter its access code first.");

    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "")
      .trim()
      .toLowerCase();
    if (!name) return fail("Please give your name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))
      return fail("That email address does not look right.");

    const expertise = formData.getAll("expertise").map(String).filter(isExpertise).slice(0, 10);
    const slots = parseSlotLines(formData.get("slots"));
    if (!slots.length) {
      return fail("Add at least one time slot, as a date, a start time and an end time.");
    }

    const { data: existingRows, error: listErr } = await supabaseAdmin
      .from(TABLES.HACKATHON_MENTORS)
      .select("*")
      .eq("event_id", event.id);
    if (listErr) throw listErr;
    const existing = (existingRows ?? []).find(
      (d) => String(d.email ?? "").toLowerCase() === email,
    );

    const now = new Date().toISOString();
    const id = existing?.id || randomUUID();
    const merged = existing
      ? parseSlotLines(formData.get("slots"), mapToMentor(existing, existing.id).slots)
      : slots;
    const extra = {
      ...pickExtra(existing as Record<string, unknown> | null),
      slots: merged,
      updatedAt: now,
      ...(existing ? {} : { createdAt: now }),
    };

    const { error } = await supabaseAdmin.from(TABLES.HACKATHON_MENTORS).upsert({
      id,
      event_id: event.id,
      name,
      email,
      expertise,
      bio: String(formData.get("bio") ?? "")
        .trim()
        .slice(0, 1000),
      extra,
    });
    if (error) throw error;

    revalidatePath(`/events/${event.id}/mentors`);
    for (const path of organizerHackathonCachePaths(event.organizerId, event.id))
      revalidatePath(path);
    return ok();
  } catch (err) {
    if (isRedirectError(err)) throw err;
    console.error("[signUpMentor]", err);
    return fail("Could not sign you up. Please try again.");
  }
}

export async function bookMentorSlot(
  eventId: string,
  registrationId: string,
  prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const who = await assertParticipant(eventId, registrationId);
    if (!who) return fail("That registration is not valid for this event.");

    const mentorId = String(formData.get("mentorId") ?? "").trim();
    const slotId = String(formData.get("slotId") ?? "").trim();
    const teamId = String(formData.get("teamId") ?? "").trim();
    if (!mentorId || !slotId || !teamId) return fail("Pick a slot to book.");

    const { data: teamRow } = await supabaseAdmin
      .from(TABLES.HACKATHON_TEAMS)
      .select("*")
      .eq("id", teamId)
      .maybeSingle();
    if (!teamRow) return fail("That team no longer exists.");
    const team = mapToTeam(teamRow, teamRow.id);
    if (team.eventId !== who.event.id) return fail("That team is not on this event.");
    if (!team.memberRegistrationIds.includes(registrationId))
      return fail("You are not in that team.");

    const { data: mentorRow, error: mentorErr } = await supabaseAdmin
      .from(TABLES.HACKATHON_MENTORS)
      .select("*")
      .eq("id", mentorId)
      .maybeSingle();
    if (mentorErr) throw mentorErr;
    if (!mentorRow) return fail("That mentor is no longer listed.");
    const mentor = mapToMentor(mentorRow, mentorRow.id);
    if (mentor.eventId !== who.event.id) return fail("That mentor is not on this event.");

    const slot = mentor.slots.find((s) => s.id === slotId);
    if (!slot) return fail("That slot is no longer listed.");
    if (!slotIsOpen(slot)) {
      return fail(
        slot.bookedByTeamId
          ? "Somebody has just taken that slot."
          : "That slot has already passed.",
      );
    }
    if (mentor.slots.some((s) => s.bookedByTeamId === team.id)) {
      return fail(`Your team already has a slot with ${mentor.name}.`);
    }

    const slots = mentor.slots.map((s) =>
      s.id === slotId
        ? {
            ...s,
            bookedByTeamId: team.id,
            bookedTeamName: team.name,
            bookedAt: new Date().toISOString(),
          }
        : s,
    );
    const extra = {
      ...pickExtra(mentorRow as Record<string, unknown>),
      slots,
      updatedAt: new Date().toISOString(),
    };
    const { error } = await supabaseAdmin
      .from(TABLES.HACKATHON_MENTORS)
      .update({ extra })
      .eq("id", mentorId);
    if (error) throw error;

    revalidatePath(`/events/${who.event.id}/ticket/${registrationId}/team`);
    revalidatePath(`/events/${who.event.id}/mentors`);
    return ok();
  } catch (err) {
    if (isRedirectError(err)) throw err;
    console.error("[bookMentorSlot]", err);
    return fail("Could not book that slot. Please try again.");
  }
}

export async function cancelMentorSlot(
  eventId: string,
  registrationId: string,
  prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const who = await assertParticipant(eventId, registrationId);
    if (!who) return fail("That registration is not valid for this event.");

    const mentorId = String(formData.get("mentorId") ?? "").trim();
    const slotId = String(formData.get("slotId") ?? "").trim();
    const teamId = String(formData.get("teamId") ?? "").trim();

    const { data: teamRow } = teamId
      ? await supabaseAdmin.from(TABLES.HACKATHON_TEAMS).select("*").eq("id", teamId).maybeSingle()
      : { data: null };
    if (!teamRow) return fail("That team no longer exists.");
    const team = mapToTeam(teamRow, teamRow.id);
    if (!team.memberRegistrationIds.includes(registrationId))
      return fail("You are not in that team.");

    const { data: mentorRow, error: mentorErr } = await supabaseAdmin
      .from(TABLES.HACKATHON_MENTORS)
      .select("*")
      .eq("id", mentorId)
      .maybeSingle();
    if (mentorErr) throw mentorErr;
    if (!mentorRow) return fail("That mentor is no longer listed.");
    const mentor = mapToMentor(mentorRow, mentorRow.id);
    const slot = mentor.slots.find((s) => s.id === slotId);
    if (!slot || slot.bookedByTeamId !== team.id) {
      return fail("Your team does not hold that slot.");
    }
    const slots = mentor.slots.map((s) =>
      s.id === slotId ? { ...s, bookedByTeamId: "", bookedTeamName: "", bookedAt: null } : s,
    );
    const extra = {
      ...pickExtra(mentorRow as Record<string, unknown>),
      slots,
      updatedAt: new Date().toISOString(),
    };
    const { error } = await supabaseAdmin
      .from(TABLES.HACKATHON_MENTORS)
      .update({ extra })
      .eq("id", mentorId);
    if (error) throw error;

    revalidatePath(`/events/${who.event.id}/ticket/${registrationId}/team`);
    revalidatePath(`/events/${who.event.id}/mentors`);
    return ok();
  } catch (err) {
    if (isRedirectError(err)) throw err;
    console.error("[cancelMentorSlot]", err);
    return fail("Could not cancel that slot. Please try again.");
  }
}

export async function removeMentor(eventId: string, formData: FormData): Promise<void> {
  let backTo = "/";
  try {
    const event = await assertEventActor(eventId, "competitions");
    if (!event) redirect("/");
    backTo = hackathonDashPath(event.organizerId, event.id, "competitions");

    const id = String(formData.get("mentorId") ?? "").trim();
    if (id) {
      const { data } = await supabaseAdmin
        .from(TABLES.HACKATHON_MENTORS)
        .select("event_id")
        .eq("id", id)
        .maybeSingle();
      if (data && String(data.event_id) === event.id) {
        await supabaseAdmin.from(TABLES.HACKATHON_MENTORS).delete().eq("id", id);
      }
    }
    revalidatePath(backTo);
    revalidatePath(`/events/${eventId}/mentors`);
    redirect(backTo);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    console.error("[removeMentor]", err);
    redirect(`${backTo}?e=${encodeURIComponent("Could not remove that mentor.")}`);
  }
}

export async function saveHackathonSettings(
  eventId: string,
  prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const event = await assertEventActor(eventId, "settings");
    if (!event) return fail("You cannot change that event.");

    const livestreamUrl = String(formData.get("livestreamUrl") ?? "")
      .trim()
      .slice(0, 500);
    const maxAttachmentMb = Math.min(
      50,
      Math.max(1, Number(formData.get("maxAttachmentMb")) || 10),
    );
    const judgingWindowStart = String(formData.get("judgingWindowStart") ?? "")
      .trim()
      .slice(0, 40);
    const judgingWindowEnd = String(formData.get("judgingWindowEnd") ?? "")
      .trim()
      .slice(0, 40);
    const onlineSessionStart = String(formData.get("onlineSessionStart") ?? "")
      .trim()
      .slice(0, 40);
    const onlineSessionEnd = String(formData.get("onlineSessionEnd") ?? "")
      .trim()
      .slice(0, 40);
    const now = new Date().toISOString();

    const { data: existing } = await supabaseAdmin
      .from(TABLES.HACKATHON_SETTINGS)
      .select("extra")
      .eq("event_id", event.id)
      .maybeSingle();
    const prevExtra =
      existing?.extra && typeof existing.extra === "object" && !Array.isArray(existing.extra)
        ? (existing.extra as Record<string, unknown>)
        : {};

    const { error } = await supabaseAdmin.from(TABLES.HACKATHON_SETTINGS).upsert({
      event_id: event.id,
      online_mode: String(formData.get("onlineMode") ?? "") === "true",
      livestream_url: livestreamUrl,
      max_attachment_mb: maxAttachmentMb,
      updated_at: now,
      extra: {
        ...prevExtra,
        judgingWindowStart,
        judgingWindowEnd,
        onlineSessionStart,
        onlineSessionEnd,
      },
    } as never);
    if (error) throw error;

    for (const path of organizerHackathonCachePaths(event.organizerId, event.id))
      revalidatePath(path);
    revalidatePath(`/events/${event.id}/tracks`);
    revalidatePath(`/events/${event.id}/tracks/[trackId]/leaderboard`, "page");
    return {
      success: true,
      ...(livestreamUnsupported(livestreamUrl)
        ? {
            error:
              "Saved. That link will not embed, though — the spectator page shows no stream until it is a YouTube or Zoom link.",
          }
        : {}),
    };
  } catch (err) {
    if (isRedirectError(err)) throw err;
    console.error("[saveHackathonSettings]", err);
    return fail("Could not save those settings. Please try again.");
  }
}
