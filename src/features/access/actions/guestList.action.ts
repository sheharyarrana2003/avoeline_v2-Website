"use server";

import { revalidatePath } from "next/cache";
import { adminDb } from "@/data/admin_db";
import { COLLECTIONS } from "@/data/collections";
import { assertOwnedEvent } from "@/src/features/events/ownership";
import { ActionResult, fail, ok } from "@/src/lib/action";
import { absoluteUrl } from "@/src/lib/appUrl";
import { sendBulkEmail, escapeHtml } from "@/src/lib/email";
import { formatDate } from "@/src/lib/datetime";
import { getEventGuestList } from "../access.service";
import { parseGuestList } from "../types";

/** How many rows one upload may add, so a pasted spreadsheet cannot run away. */
const MAX_PER_UPLOAD = 2000;

/**
 * A token an invite link is safe to carry.
 *
 * randomUUID rather than a counter or a hash of the email: the token IS the
 * credential for an invite-only event, so it has to be unguessable and must not
 * be derivable from anything the recipient's address reveals.
 */
function inviteToken(): string {
    return `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "");
}

/**
 * Add addresses to an event's guest list, or issue unique invite links.
 *
 * Spec 2.2 wants duplicate and invalid-email detection *before* saving, so the
 * parse result is reported back in full: how many were added, which lines were
 * malformed, which addresses were repeated in the upload, and which were already
 * on the list. Nothing partial is hidden.
 */
export async function addGuests(_prevState: ActionResult | null, formData: FormData): Promise<ActionResult> {
    try {
        const eventId = String(formData.get("eventId") ?? "").trim();
        const event = await assertOwnedEvent(eventId);
        if (!event) return fail("You cannot change the guest list for that event.");

        const kind = formData.get("kind") === "invite" ? "invite" : "whitelist";
        const expiresAt = String(formData.get("expiresAt") ?? "").trim();
        const singleUse = formData.get("singleUse") === "on";
        const notify = formData.get("notify") === "on";

        // Either a pasted list or an uploaded CSV; both end up as text.
        let raw = String(formData.get("guests") ?? "");
        const file = formData.get("file");
        if (file instanceof File && file.size > 0) {
            if (file.size > 1024 * 1024) return fail("That file is too large. Split it into smaller lists.");
            raw = `${raw}\n${await file.text()}`;
        }
        if (!raw.trim()) return fail("Paste some addresses or choose a CSV file.");

        const report = parseGuestList(raw);
        if (!report.valid.length) {
            return fail(
                report.invalid.length
                    ? `No usable addresses. ${report.invalid.length} line(s) were not valid email addresses.`
                    : "No usable addresses found.",
            );
        }
        if (report.valid.length > MAX_PER_UPLOAD) {
            return fail(`That is ${report.valid.length} addresses. Add at most ${MAX_PER_UPLOAD} at a time.`);
        }

        // Already-present addresses are skipped rather than duplicated, so
        // re-uploading a longer version of the same list is safe.
        const existing = new Set((await getEventGuestList(eventId)).map((g) => g.email));
        const fresh = report.valid.filter((g) => !existing.has(g.email));

        const offered = event.access?.attendeeTiers ?? [];
        const batch = adminDb.batch();
        const links: { email: string; name?: string; url: string }[] = [];

        for (const guest of fresh) {
            const ref = adminDb.collection(COLLECTIONS.EVENT_INVITES).doc();
            const token = kind === "invite" ? inviteToken() : null;
            batch.set(ref, {
                id: ref.id,
                eventId,
                email: guest.email,
                name: guest.name,
                kind,
                token,
                // A tier from the CSV only counts if the event offers it.
                tier: offered.includes(guest.tier) ? guest.tier : "",
                openedAt: null,
                registeredAt: null,
                registrationId: null,
                // DD/MM/YYYY, per the house date contract; the form sends ISO.
                expiresAt: expiresAt ? formatDate(expiresAt) : "",
                singleUse: kind === "invite" ? singleUse : false,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
            if (token) {
                links.push({
                    email: guest.email,
                    name: guest.name || undefined,
                    url: await absoluteUrl(`/events/${eventId}?invite=${token}`),
                });
            }
        }

        if (fresh.length) await batch.commit();

        // Mailed one at a time is the whole point here: each person's link is
        // their own credential, so a shared message would hand everyone else's
        // invite to everyone. sendBulkEmail keeps recipients separate, but the
        // BODY differs per person, so these go individually.
        let mailed = 0;
        if (notify && links.length) {
            for (const link of links) {
                const html = `<p>Hello${link.name ? ` ${escapeHtml(link.name)}` : ""},</p>
<p>You have been invited to <strong>${escapeHtml(event.title)}</strong>.</p>
<p><a href="${escapeHtml(link.url)}">Open your invitation</a></p>
<p style="color:#737373;font-size:12px">This link is personal to you${singleUse ? " and can be used once" : ""}${expiresAt ? `, and expires on ${escapeHtml(formatDate(expiresAt))}` : ""}.</p>`;
                const sent = await sendBulkEmail([{ email: link.email, name: link.name }], {
                    subject: `You are invited to ${event.title}`,
                    html,
                    senderName: event.title,
                });
                mailed += sent.sent;
            }
        }

        revalidatePath(`/organizer/${event.organizerId}/events/${eventId}/access`);

        const notes = [
            `${fresh.length} added`,
            report.valid.length - fresh.length ? `${report.valid.length - fresh.length} already on the list` : "",
            report.duplicates.length ? `${report.duplicates.length} repeated in the upload` : "",
            report.invalid.length ? `${report.invalid.length} invalid (line ${report.invalid.map((i) => i.line).slice(0, 5).join(", ")})` : "",
            notify && links.length ? `${mailed} emailed` : "",
        ].filter(Boolean);

        // Reported through the error channel because there is no success channel
        // that carries detail, and a silent "done" hides the skipped rows.
        return report.invalid.length || report.duplicates.length || fresh.length !== report.valid.length
            ? fail(notes.join(" · "))
            : ok();
    } catch (err) {
        console.error("[addGuests]", err);
        return fail("Could not update the guest list. Please try again.");
    }
}

/** Remove one guest-list row. */
export async function removeGuest(formData: FormData): Promise<void> {
    try {
        const eventId = String(formData.get("eventId") ?? "").trim();
        const guestId = String(formData.get("guestId") ?? "").trim();
        if (!guestId) return;

        const event = await assertOwnedEvent(eventId);
        if (!event) return;

        // Re-read rather than trusting the form's eventId: a guest id from one
        // event must not be deletable by naming an event the caller does own.
        const ref = adminDb.collection(COLLECTIONS.EVENT_INVITES).doc(guestId);
        const snap = await ref.get();
        if (!snap.exists || String(snap.data()?.eventId) !== eventId) return;

        await ref.delete();
        revalidatePath(`/organizer/${event.organizerId}/events/${eventId}/access`);
    } catch (err) {
        console.error("[removeGuest]", err);
    }
}
