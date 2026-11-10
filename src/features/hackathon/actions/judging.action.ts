"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { randomUUID } from "crypto";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { type ActionResult, fail, ok } from "@/src/lib/action";
import { absoluteUrl } from "@/src/lib/appUrl";
import {
  requireConnectedSender,
  sendViaOrganizerConnection,
} from "@/src/features/email/organizerTransport.service";
import { assertEventActor } from "@/src/features/events/ownership";
import { rateLimit } from "@/src/lib/rateLimit";
import { findJudgeByToken, listTracks } from "../hackathon.service";
import { applyJudgeInviteTemplate, statusAfterOpen, statusAfterResend } from "../judgeInvite.logic";
import {
  getTaskMaxPoints,
  listSubmissionsForJudgeTracks,
  upsertJudgeSubmissionScore,
} from "../judgeScoring.service";
import {
  hackathonDashPath,
  hackathonTrackManagePath,
  organizerHackathonCachePaths,
} from "../kinds";
import { type HackathonJudge } from "../judging";
import { pickExtra } from "../teamWrite";

function mintToken(): string {
  return `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "");
}

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

const DEFAULT_SUBJECT = "You're invited to judge — {{eventTitle}}";
const DEFAULT_BODY = `Hi {{name}},

You have been asked to judge {{eventTitle}}.

Open your private invite: {{link}}

That link is yours alone — please do not forward it.`;

async function sendJudgeInviteMail(opts: {
  organizerId: string;
  eventId: string;
  eventTitle: string;
  name: string;
  email: string;
  token: string;
  subjectTpl: string;
  bodyTpl: string;
  trackNames: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const link = await absoluteUrl(`/judge/${opts.token}`);
  const vars = {
    name: opts.name,
    link,
    eventTitle: `${opts.eventTitle}${opts.trackNames ? ` (${opts.trackNames})` : ""}`,
  };
  const subject = applyJudgeInviteTemplate(opts.subjectTpl || DEFAULT_SUBJECT, vars);
  const text = applyJudgeInviteTemplate(opts.bodyTpl || DEFAULT_BODY, vars);
  const { renderJudgeInviteEmail } = await import("@/src/features/email/renderAttendeeEmail");
  const rendered = await renderJudgeInviteEmail({
    organizerName: "Organizer",
    judgeName: opts.name,
    eventTitle: vars.eventTitle,
    inviteUrl: link,
    subject,
    bodyPlain: text,
  });
  const mail = await sendViaOrganizerConnection({
    organizerId: opts.organizerId,
    to: opts.email,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    kind: "judge_invite",
    eventId: opts.eventId,
  });
  if (!mail.ok)
    return { ok: false, error: mail.error || "Connect organizer Gmail to send judge invites." };
  return { ok: true };
}

export async function inviteJudge(
  eventId: string,
  prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const event = await assertEventActor(eventId, "competitions");
    if (!event) return fail("You cannot change that event.");

    const sender = await requireConnectedSender(event.organizerId, { eventId });
    if (!sender.ok) return fail(sender.error || "Connect organizer Gmail to send judge invites.");

    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "")
      .trim()
      .toLowerCase();
    if (!name) return fail("Give the judge a name.");
    if (!looksLikeEmail(email)) return fail("That email address does not look right.");

    const trackIds = formData.getAll("trackIds").map(String).filter(Boolean);
    if (!trackIds.length) return fail("Choose at least one track for them to judge.");

    const tracks = await listTracks(event.id);
    const valid = trackIds.filter((id) => tracks.some((t) => t.id === id));
    if (!valid.length) return fail("Those tracks do not belong to this event.");

    const subjectTpl = String(formData.get("subject") ?? "").trim() || DEFAULT_SUBJECT;
    const bodyTpl = String(formData.get("body") ?? "").trim() || DEFAULT_BODY;

    const { data: existingRows, error: listErr } = await supabaseAdmin
      .from(TABLES.HACKATHON_JUDGES)
      .select("*")
      .eq("event_id", event.id);
    if (listErr) throw listErr;
    const existing = (existingRows ?? []).find(
      (d) => String(d.email ?? "").toLowerCase() === email,
    );

    const now = new Date().toISOString();
    const id = existing?.id || randomUUID();
    const token = existing ? String(existing.invite_token || "") || mintToken() : mintToken();
    const extra = {
      ...pickExtra(existing as Record<string, unknown> | null),
      organizerId: event.organizerId,
      organizer_id: event.organizerId,
      ...(existing ? {} : { inviteStatus: "invited", inviteRespondedAt: null }),
      updatedAt: now,
      ...(existing ? {} : { createdAt: now }),
    };

    const { error } = await supabaseAdmin.from(TABLES.HACKATHON_JUDGES).upsert({
      id,
      event_id: event.id,
      name,
      email,
      track_ids: valid,
      invite_token: token,
      invited_at: existing?.invited_at ?? now,
      last_scored_at: existing?.last_scored_at ?? null,
      extra,
      updated_at: now,
    });
    if (error) throw error;

    const named = tracks
      .filter((t) => valid.includes(t.id))
      .map((t) => t.name)
      .join(", ");
    const mail = await sendJudgeInviteMail({
      organizerId: event.organizerId,
      eventId: event.id,
      eventTitle: event.title,
      name,
      email,
      token,
      subjectTpl,
      bodyTpl,
      trackNames: named,
    });
    if (!mail.ok) return fail(mail.error);

    for (const path of organizerHackathonCachePaths(event.organizerId, event.id))
      revalidatePath(path);
    for (const tid of valid) {
      revalidatePath(hackathonTrackManagePath(event.organizerId, event.id, tid));
    }
    return ok();
  } catch (err) {
    if (isRedirectError(err)) throw err;
    console.error("[inviteJudge]", err);
    return fail("Could not invite that judge. Please try again.");
  }
}

export async function resendJudgeInviteAction(formData: FormData): Promise<void> {
  let backTo = "/";
  try {
    const eventId = String(formData.get("eventId") ?? "").trim();
    const judgeId = String(formData.get("judgeId") ?? "").trim();
    const event = await assertEventActor(eventId, "competitions");
    if (!event || !judgeId) redirect("/");
    const requested = String(formData.get("returnTo") ?? "").trim();
    backTo =
      requested.startsWith("/organizer/") && !requested.includes("//")
        ? requested
        : hackathonDashPath(event.organizerId, event.id, "competitions");

    const sender = await requireConnectedSender(event.organizerId, { eventId });
    if (!sender.ok) {
      redirect(`${backTo}?e=${encodeURIComponent(sender.error || "Connect Gmail to resend.")}`);
    }

    const { data: row } = await supabaseAdmin
      .from(TABLES.HACKATHON_JUDGES)
      .select("*")
      .eq("id", judgeId)
      .eq("event_id", event.id)
      .maybeSingle();
    if (!row) redirect(`${backTo}?e=${encodeURIComponent("That judge is not on this event.")}`);

    const ex = pickExtra(row as Record<string, unknown>);
    const current = String(ex.inviteStatus || "invited") as
      "invited" | "opened" | "accepted" | "declined";
    const next = statusAfterResend(
      current === "opened" ||
        current === "accepted" ||
        current === "declined" ||
        current === "invited"
        ? current
        : "invited",
    );
    const token = String(row.invite_token || "") || mintToken();
    const now = new Date().toISOString();
    const extra = {
      ...ex,
      inviteStatus: next,
      inviteRespondedAt: next === "invited" ? null : (ex.inviteRespondedAt ?? null),
      organizerId: event.organizerId,
    };
    await supabaseAdmin
      .from(TABLES.HACKATHON_JUDGES)
      .update({
        invite_token: token,
        invited_at: now,
        extra,
        updated_at: now,
      })
      .eq("id", judgeId);

    const tracks = await listTracks(event.id);
    const trackIds = Array.isArray(row.track_ids) ? row.track_ids.map(String) : [];
    const named = tracks
      .filter((t) => trackIds.includes(t.id))
      .map((t) => t.name)
      .join(", ");
    const mail = await sendJudgeInviteMail({
      organizerId: event.organizerId,
      eventId: event.id,
      eventTitle: event.title,
      name: String(row.name || ""),
      email: String(row.email || ""),
      token,
      subjectTpl: DEFAULT_SUBJECT,
      bodyTpl: DEFAULT_BODY,
      trackNames: named,
    });
    if (!mail.ok) {
      redirect(`${backTo}?e=${encodeURIComponent(mail.error)}`);
    }
    revalidatePath(backTo);
    redirect(`${backTo}?ok=${encodeURIComponent("Invite resent.")}`);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    console.error("[resendJudgeInviteAction]", err);
    redirect(`${backTo}?e=${encodeURIComponent("Could not resend that invite.")}`);
  }
}

export async function removeJudge(eventId: string, formData: FormData): Promise<void> {
  let backTo = "/";
  try {
    const event = await assertEventActor(eventId, "competitions");
    if (!event) redirect("/");
    const requested = String(formData.get("returnTo") ?? "").trim();
    backTo =
      requested.startsWith("/organizer/") && !requested.includes("//")
        ? requested
        : hackathonDashPath(event.organizerId, event.id, "competitions");

    const judgeId = String(formData.get("judgeId") ?? "").trim();
    const { data: snap } = judgeId
      ? await supabaseAdmin
          .from(TABLES.HACKATHON_JUDGES)
          .select("event_id")
          .eq("id", judgeId)
          .maybeSingle()
      : { data: null };
    if (!snap || String(snap.event_id) !== event.id) {
      redirect(`${backTo}?e=${encodeURIComponent("That judge is not on this event.")}`);
    }

    const { error } = await supabaseAdmin.from(TABLES.HACKATHON_JUDGES).delete().eq("id", judgeId);
    if (error) throw error;
    revalidatePath(backTo);
    redirect(backTo);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    console.error("[removeJudge]", err);
    redirect(`${backTo}?e=${encodeURIComponent("Could not remove that judge.")}`);
  }
}

export async function judgeLink(judge: HackathonJudge): Promise<string> {
  return judge.inviteToken ? absoluteUrl(`/judge/${judge.inviteToken}`) : Promise.resolve("");
}

export async function markJudgeInviteOpened(token: string): Promise<void> {
  const value = String(token ?? "").trim();
  if (!value) return;
  const rl = await rateLimit(`judge-open:${value.slice(0, 32)}`, 30, 60);
  if (!rl.ok) return;
  const judge = await findJudgeByToken(value);
  if (!judge) return;
  const next = statusAfterOpen(judge.inviteStatus);
  if (next === judge.inviteStatus) return;
  const { data: row } = await supabaseAdmin
    .from(TABLES.HACKATHON_JUDGES)
    .select("id, extra")
    .eq("id", judge.id)
    .maybeSingle();
  if (!row) return;
  const now = new Date().toISOString();
  const extra = { ...pickExtra(row as Record<string, unknown>), inviteStatus: next };
  await supabaseAdmin
    .from(TABLES.HACKATHON_JUDGES)
    .update({ extra, updated_at: now })
    .eq("id", judge.id);
}

export async function recordJudgeInviteResponse(
  token: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const decision = String(formData.get("decision") ?? "").toLowerCase();
    if (decision !== "accept" && decision !== "decline") {
      return fail("Choose accept or decline.");
    }
    const judge = await findJudgeByToken(token);
    if (!judge || !judge.inviteToken) return fail("That invite link is no longer valid.");

    const { data: row } = await supabaseAdmin
      .from(TABLES.HACKATHON_JUDGES)
      .select("id, extra")
      .eq("id", judge.id)
      .maybeSingle();
    if (!row) return fail("That invite link is no longer valid.");

    const now = new Date().toISOString();
    const extra = {
      ...pickExtra(row as Record<string, unknown>),
      inviteStatus: decision === "accept" ? "accepted" : "declined",
      inviteRespondedAt: now,
    };

    const { error } = await supabaseAdmin
      .from(TABLES.HACKATHON_JUDGES)
      .update({ extra, updated_at: now } as never)
      .eq("id", judge.id);
    if (error) throw error;

    revalidatePath(`/judge/${token}`);
    for (const path of organizerHackathonCachePaths(judge.organizerId, judge.eventId))
      revalidatePath(path);
    return ok();
  } catch (err) {
    if (isRedirectError(err)) throw err;
    console.error("[recordJudgeInviteResponse]", err);
    return fail("Could not save your response. Please try again.");
  }
}

export async function scoreSubmissionAsJudgeAction(
  token: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const judge = await findJudgeByToken(token);
    if (!judge || judge.inviteStatus !== "accepted") {
      return fail("Only accepted judges can score submissions.");
    }
    const submissionId = String(formData.get("submissionId") ?? "").trim();
    const points = Number(String(formData.get("points") ?? "").replace(/[^\d.-]/g, ""));
    const comment = String(formData.get("comment") ?? "").trim();
    if (!submissionId) return fail("Missing submission.");
    if (Number.isNaN(points)) return fail("Points must be a number.");

    const rows = await listSubmissionsForJudgeTracks(judge.trackIds);
    const sub = rows.find((r) => String(r.id) === submissionId);
    if (!sub) return fail("That submission is not in your competitions.");

    const taskMax = await getTaskMaxPoints(String(sub.task_id));
    await upsertJudgeSubmissionScore({
      judgeId: judge.id,
      submissionId,
      teamId: String(sub.team_id),
      taskId: String(sub.task_id),
      points,
      comment,
      taskMax,
    });

    revalidatePath(`/judge/${token}`);
    for (const path of organizerHackathonCachePaths(judge.organizerId, judge.eventId))
      revalidatePath(path);
    return ok();
  } catch (err) {
    if (isRedirectError(err)) throw err;
    console.error("[scoreSubmissionAsJudgeAction]", err);
    return fail("Could not save that score.");
  }
}
