"use server";

import { revalidatePath } from "next/cache";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { adminDb } from "@/data/admin_db";
import { COLLECTIONS } from "@/data/collections";
import { type ActionResult, fail, ok } from "@/src/lib/action";
import { AuthService } from "@/src/features/auth/authService";
import { EventService } from "@/src/services/event.service";
import { NotificationServices } from "@/src/services/notification.services";
import { REPORT_REASONS } from "../types";
import { logModeration } from "./moderation";

/**
 * Event moderation and the flagged-content queue (spec 9.4).
 */

/**
 * Unpublish, remove, or restore an event.
 *
 * Both hiding actions are a `status` patch through `EventService.update_event`,
 * whose own docstring already anticipated this caller. `status` is a field
 * `EventModel` assigns, so unlike a new field it round-trips on read, and
 * `eventLifecycle` already treats both values as inactive — which means the two
 * public choke points hide the event with no further change.
 *
 *   unpublish -> "draft"      hidden, and plainly reversible
 *   remove    -> "cancelled"  hidden, and what a ticket-holder's page will say
 *
 * The reason never touches the event document. It goes in the moderation log,
 * because a field added to an event is invisible through `EventModel`'s
 * constructor and would silently not round-trip.
 */
export async function moderateEvent(
    prevState: ActionResult | null,
    formData: FormData,
): Promise<ActionResult> {
    try {
        const admin = await AuthService.requireAdmin("events");
        if (!admin) return fail("You do not have permission to moderate events.");

        const eventId = String(formData.get("eventId") ?? "").trim();
        const intent = String(formData.get("intent") ?? "");
        const reason = String(formData.get("reason") ?? "").trim();

        if (!["unpublish", "remove", "restore"].includes(intent)) return fail("That is not a moderation action.");
        // Spec 9.4 asks for a required reason. Restoring is the one that needs
        // no justification: putting something back is not the act on record.
        if (intent !== "restore" && !reason) return fail("Give a reason — it is logged against the event.");

        const event = eventId ? await EventService.getEventByID(eventId) : null;
        if (!event) return fail("That event no longer exists.");

        const status = intent === "unpublish" ? "draft" : intent === "remove" ? "cancelled" : "published";
        await EventService.update_event(event.id, { status });

        await logModeration({
            admin,
            targetType: "event",
            targetId: event.id,
            targetLabel: event.title || "Untitled event",
            action: intent === "unpublish" ? "unpublished" : intent === "remove" ? "removed" : "restored",
            reason: reason || "Restored",
        });

        await NotificationServices.createNotification({
            userId: event.organizerId,
            title:
                intent === "restore"
                    ? `"${event.title}" is published again`
                    : `"${event.title}" was ${intent === "remove" ? "removed" : "unpublished"}`,
            message:
                intent === "restore"
                    ? "An administrator restored your event."
                    : `An administrator ${intent === "remove" ? "removed" : "unpublished"} your event. Reason: ${reason}`,
            type: "category_request",
            deepLink: `/organizer/${event.organizerId}/events/${event.id}`,
        });

        revalidatePath("/admin/events");
        revalidatePath("/events");
        revalidatePath(`/events/${event.id}`);
        return ok();
    } catch (err) {
        if (isRedirectError(err)) throw err;
        console.error("[moderateEvent]", err);
        return fail("Could not moderate that event. Please try again.");
    }
}

/**
 * Anybody can report an event (spec 9.4's "events reported by users").
 *
 * Public and unauthenticated by necessity — the people best placed to notice a
 * fake event are strangers browsing, not the organizer who posted it. The
 * reason must be one of the offered choices, so the queue groups rather than
 * filling with free text, and the optional email is the only thing a reporter
 * can supply that is not from a fixed list.
 *
 * ponytail: no rate limit, so the same person can file repeatedly. The queue
 * shows duplicates side by side and dismissing is one click, which at this
 * scale beats building throttling nobody has needed yet. Upgrade path is a
 * per-event, per-address guard at write time.
 */
export async function reportEvent(
    eventId: string,
    prevState: ActionResult | null,
    formData: FormData,
): Promise<ActionResult> {
    try {
        const reason = String(formData.get("reason") ?? "").trim();
        if (!(REPORT_REASONS as readonly string[]).includes(reason)) {
            return fail("Choose why you are reporting this event.");
        }

        const event = eventId ? await EventService.getEventByID(eventId) : null;
        if (!event) return fail("That event no longer exists.");

        const email = String(formData.get("reporterEmail") ?? "").trim().toLowerCase();
        const detail = String(formData.get("detail") ?? "").trim().slice(0, 1000);

        const ref = adminDb.collection(COLLECTIONS.EVENT_REPORTS).doc();
        await ref.set({
            id: ref.id,
            eventId: event.id,
            // Denormalized so the queue still reads if the event is later removed.
            eventTitle: event.title || "Untitled event",
            reason: detail ? `${reason} — ${detail}` : reason,
            reporterEmail: email.includes("@") ? email : "",
            status: "open",
            createdAt: new Date(),
            decidedAt: null,
        });

        revalidatePath("/admin/events");
        return ok();
    } catch (err) {
        if (isRedirectError(err)) throw err;
        console.error("[reportEvent]", err);
        return fail("Could not send that report. Please try again.");
    }
}

/**
 * Decide a report: Approve leaves the event standing, Remove unpublishes it.
 *
 * "Approve" is the spec's word and it means approving the *event*, not the
 * report — so it dismisses the flag. Worth naming, because the opposite reading
 * would delete an event every time somebody complained.
 */
export async function decideReport(
    prevState: ActionResult | null,
    formData: FormData,
): Promise<ActionResult> {
    try {
        const admin = await AuthService.requireAdmin("events");
        if (!admin) return fail("You do not have permission to moderate events.");

        const reportId = String(formData.get("reportId") ?? "").trim();
        const decision = String(formData.get("decision") ?? "");
        if (!["approve", "remove"].includes(decision)) return fail("That is not a decision.");

        const snap = reportId ? await adminDb.collection(COLLECTIONS.EVENT_REPORTS).doc(reportId).get() : null;
        if (!snap?.exists) return fail("That report no longer exists.");
        const raw = snap.data() ?? {};
        // Re-read and guard against re-deciding, the same way the category
        // queue does -- two admins on the queue at once must not both act.
        if (String(raw.status) !== "open") return fail("That report has already been decided.");

        const eventId = String(raw.eventId || "");
        const event = eventId ? await EventService.getEventByID(eventId) : null;

        if (decision === "remove") {
            if (!event) return fail("That event no longer exists.");
            await EventService.update_event(event.id, { status: "draft" });
            await logModeration({
                admin,
                targetType: "event",
                targetId: event.id,
                targetLabel: event.title || "Untitled event",
                action: "unpublished",
                reason: `Reported: ${String(raw.reason || "")}`,
            });
            await NotificationServices.createNotification({
                userId: event.organizerId,
                title: `"${event.title}" was unpublished after a report`,
                message: `An administrator unpublished your event following a report. Reason: ${String(raw.reason || "")}`,
                type: "category_request",
                deepLink: `/organizer/${event.organizerId}/events/${event.id}`,
            });
        } else if (event) {
            await logModeration({
                admin,
                targetType: "event",
                targetId: event.id,
                targetLabel: event.title || "Untitled event",
                action: "report_dismissed",
                reason: String(raw.reason || ""),
            });
        }

        await adminDb
            .collection(COLLECTIONS.EVENT_REPORTS)
            .doc(reportId)
            .set({ status: decision === "remove" ? "actioned" : "dismissed", decidedAt: new Date() }, { merge: true });

        revalidatePath("/admin/events");
        revalidatePath("/events");
        return ok();
    } catch (err) {
        if (isRedirectError(err)) throw err;
        console.error("[decideReport]", err);
        return fail("Could not decide that report. Please try again.");
    }
}
