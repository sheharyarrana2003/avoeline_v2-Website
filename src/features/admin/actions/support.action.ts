"use server";

import { revalidatePath } from "next/cache";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { adminDb } from "@/data/admin_db";
import { COLLECTIONS } from "@/data/collections";
import { type ActionResult, fail, ok } from "@/src/lib/action";
import { AuthService } from "@/src/features/auth/authService";
import { isTicketStatus } from "../types";

/**
 * Support tickets (spec 9.7).
 *
 * The spec asks for the admin's list, but a list nothing can write to would be
 * permanently empty -- so the submit half is here too. It requires a signed-in
 * caller of any role, and takes the role and email from the session rather than
 * the form: a ticket that could claim to be from anybody is worse than none.
 *
 * ponytail: sign-in is therefore required, so an attendee who registered
 * without an account cannot file one. An open endpoint would be a spam vector
 * with no way to answer it, and every such attendee already holds a ticket page
 * carrying the organizer's own contact details. Upgrade path is a per-address
 * throttle plus an email round trip to prove the address.
 */
export async function submitTicket(
    prevState: ActionResult | null,
    formData: FormData,
): Promise<ActionResult> {
    try {
        const user = await AuthService.getCurrentUser();
        if (!user?.userId) return fail("Please sign in to contact support.");

        const subject = String(formData.get("subject") ?? "").trim();
        const body = String(formData.get("body") ?? "").trim();
        if (!subject) return fail("Give your request a subject.");
        if (!body) return fail("Describe what you need help with.");

        const now = new Date();
        const ref = adminDb.collection(COLLECTIONS.SUPPORT_TICKETS).doc();
        await ref.set({
            id: ref.id,
            fromUserId: user.userId,
            // From the session, never the form.
            fromEmail: user.email ?? "",
            fromRole: String(user.userType ?? "attendee"),
            subject: subject.slice(0, 160),
            body: body.slice(0, 4000),
            status: "open",
            adminNote: "",
            createdAt: now,
            updatedAt: now,
        });

        revalidatePath("/support");
        revalidatePath("/admin/support");
        return ok();
    } catch (err) {
        if (isRedirectError(err)) throw err;
        console.error("[submitTicket]", err);
        return fail("Could not send that. Please try again.");
    }
}

/** Move a ticket between Open, In progress and Resolved, and leave a note. */
export async function updateTicket(
    prevState: ActionResult | null,
    formData: FormData,
): Promise<ActionResult> {
    try {
        const admin = await AuthService.requireAdmin("support");
        if (!admin) return fail("You do not have permission to work support tickets.");

        const ticketId = String(formData.get("ticketId") ?? "").trim();
        const status = String(formData.get("status") ?? "");
        if (!isTicketStatus(status)) return fail("That is not a ticket status.");

        const ref = adminDb.collection(COLLECTIONS.SUPPORT_TICKETS).doc(ticketId);
        const snap = ticketId ? await ref.get() : null;
        if (!snap?.exists) return fail("That ticket no longer exists.");

        const patch: Record<string, unknown> = { status, updatedAt: new Date() };
        // Only overwrite the note when one was actually submitted, so changing
        // a status from the row's quick control does not wipe what was written.
        if (formData.has("adminNote")) {
            patch.adminNote = String(formData.get("adminNote") ?? "").trim().slice(0, 2000);
        }
        await ref.set(patch, { merge: true });

        revalidatePath("/admin/support");
        revalidatePath("/support");
        return ok();
    } catch (err) {
        if (isRedirectError(err)) throw err;
        console.error("[updateTicket]", err);
        return fail("Could not update that ticket. Please try again.");
    }
}
