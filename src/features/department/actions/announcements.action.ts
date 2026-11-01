"use server";

import { revalidatePath } from "next/cache";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { AuthService } from "@/src/features/auth/authService";
import { canManageOrg } from "@/src/features/department/orgScope";
import { postAnnouncementSchema } from "@/src/features/department/schemas";
import { resolveAnnouncementRecipients } from "@/src/features/department/announcements.service";
import { type ActionResult, fail, ok } from "@/src/lib/action";
import { finishForm } from "@/src/lib/formRedirect";
import { rateLimit } from "@/src/lib/rateLimit";
import { absoluteUrl } from "@/src/lib/appUrl";
import { sendNotification } from "@/src/lib/notifications";
import { NotificationServices } from "@/src/services/notification.services";
import { logger } from "@/src/lib/logger";

const MAX_RECIPIENTS = 500;

export async function postDepartmentAnnouncement(formData: FormData): Promise<void> {
  finishForm(
    formData,
    "/department/announcements",
    await postDepartmentAnnouncementImpl(formData),
    "Announcement sent.",
  );
}

async function postDepartmentAnnouncementImpl(formData: FormData): Promise<ActionResult> {
  const channelsRaw = formData.getAll("channels").map(String);
  const clubIds = formData.getAll("clubIds").map(String);
  const parsed = postAnnouncementSchema.safeParse({
    departmentId: String(formData.get("departmentId") ?? ""),
    title: String(formData.get("title") ?? ""),
    body: String(formData.get("body") ?? ""),
    audience: String(formData.get("audience") ?? ""),
    channels: channelsRaw.length ? channelsRaw : ["in_app"],
    clubIds,
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid announcement.");
  const input = parsed.data;

  const user = await AuthService.getCurrentUser();
  if (!user?.userId) return fail("Please sign in.");
  if (!(await canManageOrg(user, input.departmentId)))
    return fail("You can't post for this department.");

  const rl = rateLimit(`dept-announce:${input.departmentId}`, 5, 3600);
  if (!rl.ok) return fail("Announcement rate limit reached. Try again later.");

  if (input.audience === "selected_clubs" && !input.clubIds.length) {
    return fail("Pick at least one club.");
  }

  const recipients = await resolveAnnouncementRecipients({
    departmentId: input.departmentId,
    audience: input.audience,
    clubIds: input.clubIds,
  });
  if (recipients.length > MAX_RECIPIENTS) {
    return fail(`Too many recipients (${recipients.length}). Cap is ${MAX_RECIPIENTS}.`);
  }
  if (!recipients.length) return fail("No recipients matched that audience.");

  const { data: ann, error } = await supabaseAdmin
    .from(TABLES.ORG_ANNOUNCEMENTS)
    .insert({
      org_id: input.departmentId,
      department_id: input.departmentId,
      title: input.title,
      body: input.body,
      audience: input.audience,
      channels: input.channels,
      club_ids: input.clubIds,
      created_by: user.userId,
      broadcast_to_all: input.audience === "all_clubs" || input.audience === "all_members",
    })
    .select("id")
    .single();
  if (error || !ann) {
    logger.error("[postDepartmentAnnouncement] insert", { message: error?.message });
    return fail("Could not save the announcement.");
  }

  const path = `/department/announcements/${ann.id}`;
  const deepLink = await absoluteUrl(path);
  const wantsInApp = input.channels.includes("in_app");
  const wantsEmail = input.channels.includes("email");

  for (const r of recipients) {
    if (wantsInApp) {
      try {
        await NotificationServices.createNotification({
          userId: r.userId,
          title: input.title,
          message: input.body.slice(0, 240),
          type: "org_announcement",
          deepLink: path,
        });
        await supabaseAdmin.from(TABLES.ANNOUNCEMENT_DELIVERIES).insert({
          announcement_id: ann.id,
          user_id: r.userId,
          email: r.email,
          display_name: r.displayName,
          channel: "in_app",
          status: "sent",
          sent_at: new Date().toISOString(),
        });
      } catch (err) {
        await supabaseAdmin.from(TABLES.ANNOUNCEMENT_DELIVERIES).insert({
          announcement_id: ann.id,
          user_id: r.userId,
          email: r.email,
          display_name: r.displayName,
          channel: "in_app",
          status: "failed",
          error: err instanceof Error ? err.message : "failed",
        });
      }
    }
    if (wantsEmail && r.email) {
      const ids = await sendNotification(
        r.userId,
        "org_announcement",
        {
          subject: input.title,
          body: input.body.slice(0, 2000),
          message: input.body.slice(0, 2000),
          deepLink,
        },
        ["email"],
      );
      await supabaseAdmin.from(TABLES.ANNOUNCEMENT_DELIVERIES).insert({
        announcement_id: ann.id,
        user_id: r.userId,
        email: r.email,
        display_name: r.displayName,
        channel: "email",
        status: ids.length ? "sent" : "failed",
        sent_at: ids.length ? new Date().toISOString() : null,
        error: ids.length ? null : "email not delivered",
      });
    }
  }

  revalidatePath("/department/announcements");
  revalidatePath(path);
  return ok();
}
