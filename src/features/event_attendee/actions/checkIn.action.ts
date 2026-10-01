"use server";

import { revalidatePath } from "next/cache";
import { adminDb } from "@/data/admin_db";
import { COLLECTIONS } from "@/data/collections";
import { assertOwnedEvent } from "@/src/features/events/ownership";
import { ActionResult, fail, ok } from "@/src/lib/action";

/**
 * Check an attendee in, or undo it.
 *
 * Nothing in the app set this before. `CheckInInfo` has existed on every
 * registration since they were first written — checkedIn, checkInTime,
 * checkInMethod, checkedInBy — initialized to false/null and never touched
 * again, so the check-in tile read 0% permanently, the check-in log had no rows
 * to export, and "issue certificates to everyone who checked in" had an empty
 * input set. The shape was waiting for a writer.
 *
 * Narrow on purpose. The existing attendee editor hands a whole client-supplied
 * Registration object to RegService.updateReg; this takes an id and a boolean,
 * so the only thing a caller can influence is which registration and which
 * direction — the timestamp and the operator come from the server.
 */
export async function setCheckIn(
    _prevState: ActionResult | null,
    formData: FormData,
): Promise<ActionResult> {
    try {
        const registrationId = String(formData.get("registrationId") ?? "").trim();
        const checkedIn = String(formData.get("checkedIn")) === "true";
        if (!registrationId) return fail("Missing registration.");

        const ref = adminDb.collection(COLLECTIONS.REGISTRATIONS).doc(registrationId);
        const snap = await ref.get();
        if (!snap.exists) return fail("That registration no longer exists.");

        const data = snap.data() ?? {};

        // The registration names its event; the event names its owner. Checking
        // someone in is an organizer action on their own event, so authorization
        // is resolved from stored data rather than anything the caller sent.
        const event = await assertOwnedEvent(String(data.eventId ?? ""));
        if (!event) return fail("You cannot check in attendees for that event.");

        if (data.status === "cancelled") return fail("That registration was cancelled.");

        const now = new Date().toISOString();
        const history = Array.isArray(data.statusHistory) ? data.statusHistory : [];

        // Undoing restores whatever they were before, not a hardcoded
        // "confirmed": someone checked in while still awaiting payment would
        // otherwise come back marked paid-up, which is a worse lie than the
        // mistaken check-in it is meant to correct.
        const previousStatus = [...history]
            .reverse()
            .map((entry) => String(entry?.status ?? ""))
            .find((status) => status && status !== "checked_in");

        const nextStatus = checkedIn ? "checked_in" : previousStatus || "confirmed";

        await ref.set(
            {
                status: nextStatus,
                // Appended, not replaced: the history is the audit trail for who
                // was here and when, and an undo is itself an event worth keeping.
                statusHistory: [...history, { status: nextStatus, timestamp: new Date() }],
                checkIn: {
                    checkedIn,
                    checkInTime: checkedIn ? now : null,
                    checkInMethod: checkedIn ? "manual" : null,
                    checkedInBy: checkedIn ? event.organizerId : null,
                    deviceId: null,
                },
                updatedAt: new Date(),
            },
            { merge: true },
        );

        revalidatePath(`/organizer/${event.organizerId}/events/${event.id}/attendees`);
        return ok();
    } catch (err) {
        console.error("[setCheckIn]", err);
        return fail("Could not update check-in. Please try again.");
    }
}
