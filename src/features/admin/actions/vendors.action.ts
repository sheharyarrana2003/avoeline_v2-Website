"use server";

import { revalidatePath } from "next/cache";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { adminDb } from "@/data/admin_db";
import { COLLECTIONS } from "@/data/collections";
import { type ActionResult, fail, ok } from "@/src/lib/action";
import { AuthService } from "@/src/features/auth/authService";
import { NotificationServices } from "@/src/services/notification.services";
import { isVendorStatus, type VendorStatus } from "../types";
import { logModeration } from "./moderation";

/**
 * Vendor approval and suspension (spec 9.6).
 *
 * This is the action that makes three existing things mean something. Until
 * now a vendor was created `active` by its own constructor, nothing filtered
 * the marketplace by status, and the read-mapper defaulted a missing status to
 * `inactive` while the constructor wrote `active` -- so "approval status" was a
 * field nobody read. `vendorIsBookable` is now the gate, here and in the
 * marketplace.
 */
export async function setVendorStatus(
    prevState: ActionResult | null,
    formData: FormData,
): Promise<ActionResult> {
    try {
        const admin = await AuthService.requireAdmin("vendors");
        if (!admin) return fail("You do not have permission to manage vendors.");

        const vendorDocId = String(formData.get("vendorDocId") ?? "").trim();
        const status = String(formData.get("status") ?? "");
        const reason = String(formData.get("reason") ?? "").trim();

        if (!isVendorStatus(status)) return fail("That is not a vendor status.");
        // Rejecting or suspending is a decision somebody will ask about later.
        // Approving needs no defence.
        if ((status === "rejected" || status === "suspended") && !reason) {
            return fail("Give a reason — it is logged and sent to the vendor.");
        }

        const ref = adminDb.collection(COLLECTIONS.VENDORS).doc(vendorDocId);
        const snap = vendorDocId ? await ref.get() : null;
        if (!snap?.exists) return fail("That vendor no longer exists.");
        const raw = snap.data() ?? {};

        await ref.set({ status, updatedAt: new Date() }, { merge: true });

        const label = String(raw.businessName || "Vendor");
        const action: "approved" | "rejected" | "suspended" | "reactivated" =
            status === "active" ? (raw.status === "suspended" ? "reactivated" : "approved") : (status as "rejected" | "suspended");

        await logModeration({
            admin,
            targetType: "vendor",
            targetId: String(raw.vendorId || vendorDocId),
            targetLabel: label,
            action: status === "pending" ? "report_dismissed" : action,
            reason: reason || (status === "active" ? "Approved" : status),
        });

        const message: Record<VendorStatus, string> = {
            active: "Your vendor listing is approved and visible to organizers.",
            pending: "Your vendor listing is back under review.",
            rejected: `Your vendor application was not approved. Reason: ${reason}`,
            suspended: `Your vendor listing has been suspended and is hidden from organizers. Reason: ${reason}`,
        };

        await NotificationServices.createNotification({
            // Addressed by the stored vendorId, which is the id vendor routes
            // and queries use -- not the auth uid. See authService's roleId note.
            userId: String(raw.vendorId || vendorDocId),
            title: status === "active" ? "Your vendor listing is live" : `Your vendor listing is ${status}`,
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
