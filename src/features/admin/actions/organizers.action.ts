"use server";

import { revalidatePath } from "next/cache";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { type ActionResult, fail, ok } from "@/src/lib/action";
import { finishForm } from "@/src/lib/formRedirect";
import { AuthService } from "@/src/features/auth/authService";
import { NotificationServices } from "@/src/services/notification.services";
import { canManageArea } from "../types";
import { getOrganizerRow } from "../admin.service";
import { logModeration } from "./moderation";

/**
 * Approve or reject an organizer whose `review_status` is still pending.
 * Returns to the organizers list (unlike tenant-queue verification).
 */
export async function setOrganizerReview(formData: FormData): Promise<void> {
  finishForm(
    formData,
    "/admin/organizers",
    await setOrganizerReviewImpl(formData),
    "Review updated.",
  );
}

async function setOrganizerReviewImpl(formData: FormData): Promise<ActionResult> {
  const admin = await AuthService.requireAdmin("organizers");
  if (!admin || !canManageArea(admin, "organizers")) {
    return fail("You do not have permission to review organizers.");
  }

  const organizerId = String(formData.get("organizerId") ?? "").trim();
  const action = String(formData.get("action") ?? "").trim();
  if (!organizerId) return fail("That organizer does not exist.");
  if (action !== "approve" && action !== "reject") return fail("Choose Approve or Reject.");

  const row = await getOrganizerRow(organizerId);
  if (!row) return fail("That organizer does not exist.");

  const review_status = action === "approve" ? "approved" : "rejected";
  const { error } = await supabaseAdmin
    .from(TABLES.ORGANIZER_PROFILES)
    .update({ review_status, updated_at: new Date().toISOString() })
    .eq("user_id", row.userId);
  if (error) throw error;

  await logModeration({
    admin,
    targetType: "organizer",
    targetId: row.organizerId,
    targetLabel: row.name,
    action: action === "approve" ? "approved" : "rejected",
    reason:
      action === "approve" ? "Approved from organizers list" : "Rejected from organizers list",
  });

  revalidatePath("/admin/organizers");
  revalidatePath(`/admin/organizers/${row.organizerId}`);
  revalidatePath("/admin/tenants");
  return ok();
}

/**
 * Suspend or reactivate an organizer (spec 9.3).
 *
 * Writes `User.accountStatus`, which already existed on the model and was read
 * by nothing. Not a new field on the organizer document: `mapToOrganizer` is a
 * strict mapper, so a field it does not assign would silently fail to round
 * trip, and account standing already has a home.
 *
 * What suspension actually does, in four places:
 *   - their events leave Browse Events        (browse.service.ts)
 *   - their event links stop resolving        (access.service.ts)
 *   - they cannot sign in again               (setClaimsForUser)
 *   - they cannot mutate an event they own    (assertOwnedEvent)
 *
 * Ceiling, written down rather than implied: tickets already issued to their
 * attendees keep working. Revoking those would strand people who paid, and the
 * spec asks only that the organizer's public events be hidden.
 */
export async function setOrganizerStatus(
  prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const admin = await AuthService.requireAdmin("organizers");
    if (!admin) return fail("You do not have permission to manage organizers.");

    const organizerId = String(formData.get("organizerId") ?? "").trim();
    const suspend = String(formData.get("suspend") ?? "") === "true";
    const reason = String(formData.get("reason") ?? "").trim();

    // A suspension with no stated reason is unauditable, and this is the
    // action a person will most want explained back to them later.
    if (suspend && !reason) return fail("Give a reason for the suspension.");

    const row = organizerId ? await getOrganizerRow(organizerId) : null;
    if (!row) return fail("That organizer does not exist.");
    if (row.userId === admin.userId) return fail("You cannot suspend your own account.");

    const { error } = await supabaseAdmin
      .from(TABLES.USERS)
      .update({
        account_status: suspend ? "suspended" : "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.userId);
    if (error) throw error;

    await logModeration({
      admin,
      targetType: "organizer",
      targetId: row.organizerId,
      targetLabel: row.name,
      action: suspend ? "suspended" : "reactivated",
      reason: reason || "Reactivated",
    });

    // They may not be able to sign in, but the notification is waiting when
    // they are reactivated, and it is addressed by their route id.
    await NotificationServices.createNotification({
      userId: row.userId,
      title: suspend ? "Your account has been suspended" : "Your account has been reactivated",
      message: suspend
        ? `An administrator suspended your account. Your public events are hidden while it is. Reason: ${reason}`
        : "An administrator reactivated your account. Your events are public again.",
      type: "category_request",
      deepLink: "/support",
    });

    revalidatePath("/admin/organizers");
    revalidatePath(`/admin/organizers/${row.organizerId}`);
    // Their events appear on, or vanish from, the public list immediately.
    revalidatePath("/events");
    return ok();
  } catch (err) {
    if (isRedirectError(err)) throw err;
    console.error("[setOrganizerStatus]", err);
    return fail("Could not change that account. Please try again.");
  }
}
