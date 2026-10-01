"use server";

import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { type ActionResult, fail, ok } from "@/src/lib/action";
import { AuthService } from "@/src/features/auth/authService";
import { revalidatePath } from "next/cache";
import { NotificationServices } from "@/src/services/notification.services";
import { canManageOrg } from "@/src/features/department/orgScope";
import { isClubPresident, resolveClub } from "../club.service";
import { finishForm } from "@/src/lib/formRedirect";
import { uploadMedia } from "@/src/features/media/uploadMedia.action";

export async function submitOrgRequest(formData: FormData): Promise<void> {
  const orgId = String(formData.get("orgId") ?? "");
  finishForm(formData, `/clubs/${orgId}/requests`, await submitOrgRequestImpl(formData), "Request sent to your department.");
}

export async function reviewOrgRequest(formData: FormData): Promise<void> {
  finishForm(formData, "/department/requests", await reviewOrgRequestImpl(formData), "Request reviewed.");
}

async function submitOrgRequestImpl(formData: FormData): Promise<ActionResult> {
  const user = await AuthService.getCurrentUser();
  if (!user) return fail("Please sign in.");
  const orgId = String(formData.get("orgId") ?? "");
  const requestType = String(formData.get("requestType") ?? "other");
  const title = String(formData.get("title") ?? "").trim();
  const details = String(formData.get("details") ?? "").trim();
  const amount = Number(formData.get("requestedAmount"));
  if (!orgId || !title) return fail("Title is required.");
  if (!["budget", "event_approval", "other"].includes(requestType)) return fail("Invalid request type.");
  const club = await resolveClub(orgId);
  if (!isClubPresident(user, club)) return fail("Only this club's president can send requests.");

  const file = formData.get("attachment");
  let attachmentUrl: string | null = null;
  let attachmentName: string | null = null;
  let attachmentPath: string | null = null;
  if (file instanceof File && file.size > 0) {
    const upload = new FormData();
    upload.set("file", file);
    upload.set("folder", `club-requests/${orgId}`);
    const stored = await uploadMedia(upload);
    if (!stored.success) return fail(stored.error);
    attachmentUrl = stored.url;
    attachmentName = file.name;
    attachmentPath = stored.path;
  }

  await supabaseAdmin.from(TABLES.ORG_REQUESTS).insert({
    org_id: orgId,
    request_type: requestType,
    title,
    details,
    requested_amount: requestType === "budget" && Number.isFinite(amount) ? amount : null,
    requested_by: user.userId,
    status: "pending",
    attachment_url: attachmentUrl,
    attachment_name: attachmentName,
    attachment_path: attachmentPath,
  });
  revalidatePath(`/clubs/${orgId}`);
  revalidatePath(`/clubs/${orgId}/requests`);
  revalidatePath("/department");
  revalidatePath("/department/requests");
  return ok();
}

async function reviewOrgRequestImpl(formData: FormData): Promise<ActionResult> {
  const user = await AuthService.getCurrentUser();
  if (!user) return fail("Please sign in.");
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const note = String(formData.get("reviewNote") ?? "").trim();
  if (!id || !["approved", "rejected"].includes(status)) return fail("Invalid review.");
  const { data: req } = await supabaseAdmin.from(TABLES.ORG_REQUESTS).select("*").eq("id", id).maybeSingle();
  if (!req) return fail("That request no longer exists.");
  if (req.status !== "pending") return fail("That request has already been reviewed.");
  if (!(await canManageOrg(user, String(req.org_id)))) return fail("You can't review requests for this club.");

  await supabaseAdmin
    .from(TABLES.ORG_REQUESTS)
    .update({ status, review_note: note || null, reviewed_by: user.userId, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (status === "approved" && req.request_type === "budget" && req.org_id) {
    await supabaseAdmin.from(TABLES.BUDGET_ENTRIES).insert({
      org_id: req.org_id,
      category: "department_grant",
      entry_type: "income",
      amount: req.requested_amount ?? 0,
      note: req.title,
      entry_date: new Date().toISOString().slice(0, 10),
    });
  }
  if (req.requested_by) {
    await NotificationServices.createNotification({
      userId: String(req.requested_by),
      title: `Request ${status}: ${req.title}`,
      message: note || `Your department ${status} this request.`,
      type: "org_request",
      deepLink: `/clubs/${req.org_id}/requests`,
    }).catch(() => null);
  }
  revalidatePath("/department");
  revalidatePath("/department/requests");
  revalidatePath(`/clubs/${req.org_id}`);
  revalidatePath(`/clubs/${req.org_id}/requests`);
  return ok();
}
