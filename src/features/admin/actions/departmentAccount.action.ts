"use server";

import { revalidatePath } from "next/cache";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { type ActionResult, fail, ok } from "@/src/lib/action";
import { AuthService } from "@/src/features/auth/authService";
import { NotificationServices } from "@/src/services/notification.services";
import { canManageArea } from "../types";
import { getAdminOrg, listClubsForDepartment } from "../orgDetail.service";
import { getOrganizerRow } from "../admin.service";
import { logModeration } from "./moderation";

async function setUserAccountStatus(userId: string, suspend: boolean): Promise<void> {
  const { error } = await supabaseAdmin
    .from(TABLES.USERS)
    .update({
      account_status: suspend ? "suspended" : "active",
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
  if (error) throw error;
}

async function notifyStatusChange(userId: string, suspend: boolean, reason: string): Promise<void> {
  await NotificationServices.createNotification({
    userId,
    title: suspend ? "Your account has been suspended" : "Your account has been reactivated",
    message: suspend
      ? `An administrator suspended your account. Sign-in is blocked while it is. Reason: ${reason}`
      : "An administrator reactivated your account. You can sign in again.",
    type: "category_request",
    deepLink: "/support",
  });
}

/**
 * Suspend / reactivate a department login from the department detail page.
 * Optional: also suspend club owner users under the department.
 */
export async function setDepartmentAccountStatus(
  prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const admin = await AuthService.requireAdmin("orgs");
    if (!admin || !canManageArea(admin, "orgs")) {
      return fail("You do not have permission to manage department accounts.");
    }

    const orgId = String(formData.get("orgId") ?? "").trim();
    const suspend = String(formData.get("suspend") ?? "") === "true";
    const reason = String(formData.get("reason") ?? "").trim();
    const alsoSuspendClubs =
      String(formData.get("alsoSuspendClubs") ?? "") === "on" ||
      String(formData.get("alsoSuspendClubs") ?? "") === "true";

    if (!orgId) return fail("That department does not exist.");
    if (suspend && !reason) return fail("Give a reason for the suspension.");

    const org = await getAdminOrg(orgId);
    if (!org || org.orgType !== "department") return fail("That department does not exist.");
    if (!org.ownerUserId) return fail("This department has no linked login.");
    if (org.ownerUserId === admin.userId) return fail("You cannot suspend your own account.");

    const ownerRow = await getOrganizerRow(org.ownerUserId);
    const ownerLabel = ownerRow?.name || org.name;

    await setUserAccountStatus(org.ownerUserId, suspend);
    await logModeration({
      admin,
      targetType: "organizer",
      targetId: org.ownerUserId,
      targetLabel: ownerLabel,
      action: suspend ? "suspended" : "reactivated",
      reason: reason || "Reactivated",
    });
    await notifyStatusChange(org.ownerUserId, suspend, reason || "Reactivated");

    if (suspend && alsoSuspendClubs) {
      const clubs = await listClubsForDepartment(org.id);
      const ownerIds = [...new Set(clubs.map((c) => c.ownerUserId).filter(Boolean))] as string[];
      const toSuspend = ownerIds.filter((id) => id !== org.ownerUserId && id !== admin.userId);
      if (toSuspend.length) {
        const { error } = await supabaseAdmin
          .from(TABLES.USERS)
          .update({
            account_status: "suspended",
            updated_at: new Date().toISOString(),
          })
          .in("id", toSuspend);
        if (error) throw error;

        await Promise.all(
          toSuspend.map(async (userId) => {
            await logModeration({
              admin,
              targetType: "organizer",
              targetId: userId,
              targetLabel: `Club login under ${org.name}`,
              action: "suspended",
              reason: `${reason} (cascaded from department)`,
            });
            await notifyStatusChange(userId, true, `${reason} (cascaded from department)`);
          }),
        );
      }
    }

    revalidatePath(`/admin/departments/${org.id}`);
    revalidatePath("/admin/orgs");
    revalidatePath("/admin/organizers");
    return ok();
  } catch (err) {
    if (isRedirectError(err)) throw err;
    console.error("[setDepartmentAccountStatus]", err);
    return fail("Could not change that account. Please try again.");
  }
}
