"use server";

import { revalidatePath } from "next/cache";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { type ActionResult, fail, ok } from "@/src/lib/action";
import { AuthService } from "@/src/features/auth/authService";
import { getAuthenticatedUser } from "@/src/features/auth/rbac.service";
import { can } from "@/src/features/permissions/can";
import { NotificationServices } from "@/src/services/notification.services";
import { isVendorStatus, normalizeVendorStatus, type VendorStatus } from "../types";
import { logModeration } from "./moderation";

/**
 * Vendor approval and suspension.
 * Writes Postgres statuses: pending | approved | rejected | suspended.
 */
export async function setVendorStatus(
  prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  void prevState;
  try {
    const admin = await AuthService.requireAdmin("vendors");
    if (!admin) return fail("You do not have permission to manage vendors.");
    const user = await getAuthenticatedUser();
    if (!(await can(user, "admin:vendors:manage"))) {
      return fail("You do not have permission to change vendor status.");
    }

    const vendorDocId = String(formData.get("vendorDocId") ?? "").trim();
    const rawStatus = String(formData.get("status") ?? "");
    const status = normalizeVendorStatus(rawStatus === "active" ? "approved" : rawStatus);
    const reason = String(formData.get("reason") ?? "").trim();

    if (!isVendorStatus(status)) return fail("That is not a vendor status.");
    if ((status === "rejected" || status === "suspended") && reason.length < 3) {
      return fail("Give a reason — it is logged and sent to the vendor.");
    }
    if (
      status === "approved" &&
      reason.length < 3 &&
      String(formData.get("requireReason") ?? "") === "1"
    ) {
      return fail("Give a reason — it is logged and sent to the vendor.");
    }

    if (!vendorDocId) return fail("That vendor no longer exists.");
    const { data: raw, error: readErr } = await supabaseAdmin
      .from(TABLES.VENDOR_PROFILES)
      .select("user_id, business_name, status")
      .eq("user_id", vendorDocId)
      .maybeSingle();
    if (readErr) throw readErr;
    if (!raw) return fail("That vendor no longer exists.");

    const current = normalizeVendorStatus(raw.status);
    if (status === "approved" && current === "approved") {
      return fail("This vendor is already approved.");
    }

    const { error } = await supabaseAdmin
      .from(TABLES.VENDOR_PROFILES)
      .update({ status, updated_at: new Date().toISOString() })
      .eq("user_id", vendorDocId);
    if (error) throw error;

    const label = String(raw.business_name || "Vendor");
    const action =
      status === "approved"
        ? current === "suspended" || current === "rejected"
          ? "reactivated"
          : "approved"
        : status === "rejected"
          ? "rejected"
          : status === "suspended"
            ? "suspended"
            : "report_dismissed";

    await logModeration({
      admin,
      targetType: "vendor",
      targetId: String(raw.user_id || vendorDocId),
      targetLabel: label,
      action,
      reason:
        reason ||
        (status === "approved"
          ? current === "suspended" || current === "rejected"
            ? "Reinstated"
            : "Approved"
          : status),
    });

    const message: Record<VendorStatus, string> = {
      approved: "Your vendor listing is approved and visible to organizers.",
      pending: "Your vendor listing is back under review.",
      rejected: `Your vendor application was not approved. Reason: ${reason}`,
      suspended: `Your vendor listing has been suspended and is hidden from organizers. Reason: ${reason}`,
    };

    await NotificationServices.createNotification({
      userId: String(raw.user_id || vendorDocId),
      title:
        status === "approved" ? "Your vendor listing is live" : `Your vendor listing is ${status}`,
      message: message[status],
      type: "category_request",
      deepLink: "/support",
    });

    revalidatePath("/admin/vendors");
    revalidatePath(`/admin/vendors/${vendorDocId}`);
    return ok();
  } catch (err) {
    if (isRedirectError(err)) throw err;
    console.error("[setVendorStatus]", err);
    return fail("Could not change that vendor. Please try again.");
  }
}
