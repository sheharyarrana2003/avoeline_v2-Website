"use server";

import { revalidatePath } from "next/cache";
import { adminDb } from "@/data/admin_db";
import { COLLECTIONS } from "@/data/collections";
import { assertOwnedEvent } from "@/src/features/events/ownership";
import { AuthService } from "@/src/features/auth/authService";
import { ActionResult, fail, ok } from "@/src/lib/action";
import { absoluteUrl } from "@/src/lib/appUrl";
import { escapeHtml, sendEmail } from "@/src/lib/email";
import { getEventOrganizations, findCollaboratorByToken } from "../organizations.service";
import {
    DEFAULT_BENEFITS,
    isOrganizationType,
    parseBenefitLines,
    type OrganizationType,
} from "../types";

/** Unguessable, like the event invite tokens: this is the accept link's credential. */
function inviteToken(): string {
    return `${crypto.randomUUID()}${crypto.randomUUID()}`.replace(/-/g, "");
}

function normalizeEmail(value: unknown): string {
    return String(value ?? "").trim().toLowerCase();
}

function looksLikeEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Add or update a sponsor, collaborator or partner.
 *
 * One action for all three, matching the one form the spec asks for: the type
 * decides which fields are read, and the ones that do not apply are written as
 * their empty value rather than left stale. Otherwise switching a sponsor to a
 * partner would leave a contract value on a record that is not supposed to have
 * financial fields at all.
 */
export async function saveOrganization(
    _prevState: ActionResult | null,
    formData: FormData,
): Promise<ActionResult> {
    try {
        const eventId = String(formData.get("eventId") ?? "").trim();
        const event = await assertOwnedEvent(eventId);
        if (!event) return fail("You cannot change organizations for that event.");

        const rawType = String(formData.get("type") ?? "").trim().toLowerCase();
        if (!isOrganizationType(rawType)) return fail("Choose sponsor, collaborator or partner.");
        const type: OrganizationType = rawType;

        const name = String(formData.get("name") ?? "").trim();
        if (!name) return fail("Give the organization a name.");
        if (name.length > 120) return fail("That name is too long.");

        const contactEmail = normalizeEmail(formData.get("contactEmail"));
        if (contactEmail && !looksLikeEmail(contactEmail)) return fail("That contact email does not look right.");

        const existingId = String(formData.get("id") ?? "").trim();
        const all = await getEventOrganizations(eventId);
        const existing = existingId ? all.find((o) => o.id === existingId) : undefined;
        if (existingId && !existing) return fail("That record no longer exists.");

        const contractValue = Number(String(formData.get("contractValue") ?? "").replace(/[^\d.-]/g, "")) || 0;
        if (contractValue < 0) return fail("A contract value cannot be negative.");

        const tier = String(formData.get("tier") ?? "").trim();
        if (type === "sponsor" && tier && !event.sponsorTiers.includes(tier)) {
            return fail("That tier is not one this event offers.");
        }

        const benefitsText = String(formData.get("benefits") ?? "");
        const benefits =
            type === "sponsor"
                ? parseBenefitLines(benefitsText.trim() ? benefitsText : DEFAULT_BENEFITS.join("\n"), existing?.benefits ?? [])
                : [];

        const common = {
            eventId,
            type,
            name,
            logoUrl: String(formData.get("logoUrl") ?? "").trim(),
            websiteUrl: String(formData.get("websiteUrl") ?? "").trim(),
            contactName: String(formData.get("contactName") ?? "").trim(),
            contactEmail,
            contactPhone: String(formData.get("contactPhone") ?? "").trim(),

            // Sponsor-only, cleared for the other two.
            tier: type === "sponsor" ? tier : "",
            contractValue: type === "sponsor" ? contractValue : 0,
            benefits,
            sponsorTrackId: type === "sponsor" ? String(formData.get("sponsorTrackId") ?? "").trim() : "",

            // Collaborator-only.
            role: type === "collaborator" ? (formData.get("role") === "full" ? "full" : "track") : "track",
            trackId: type === "collaborator" ? String(formData.get("trackId") ?? "").trim() : "",

            // Partner-only.
            partnershipKind: type === "partner" ? String(formData.get("partnershipKind") ?? "").trim() : "",

            updatedAt: new Date(),
        };

        if (existing) {
            await adminDb.collection(COLLECTIONS.EVENT_ORGANIZATIONS).doc(existing.id).set(common, { merge: true });
        } else {
            const ref = adminDb.collection(COLLECTIONS.EVENT_ORGANIZATIONS).doc();
            await ref.set({
                id: ref.id,
                ...common,
                // Invite state starts empty; inviteCollaborator fills it in.
                userId: null,
                invitedEmail: "",
                invitedAt: null,
                acceptedAt: null,
                inviteToken: null,
                createdAt: new Date(),
            });
        }

        revalidatePath(`/organizer/${event.organizerId}/events/${eventId}/sponsors`);
        revalidatePath(`/events/${eventId}`);
        return ok();
    } catch (err) {
        console.error("[saveOrganization]", err);
        return fail("Could not save that. Please try again.");
    }
}

/** Remove one organization from an event. */
export async function removeOrganization(formData: FormData): Promise<void> {
    try {
        const eventId = String(formData.get("eventId") ?? "").trim();
        const id = String(formData.get("id") ?? "").trim();
        if (!id) return;

        const event = await assertOwnedEvent(eventId);
        if (!event) return;

        // Re-read and check it belongs to this event, so a record id from
        // elsewhere cannot be deleted by naming an event the caller does own.
        const ref = adminDb.collection(COLLECTIONS.EVENT_ORGANIZATIONS).doc(id);
        const snap = await ref.get();
        if (!snap.exists || String(snap.data()?.eventId) !== eventId) return;

        await ref.delete();
        revalidatePath(`/organizer/${event.organizerId}/events/${eventId}/sponsors`);
        revalidatePath(`/events/${eventId}`);
    } catch (err) {
        console.error("[removeOrganization]", err);
    }
}

/**
 * Tick one benefit off as delivered, or back on (spec 5.2).
 *
 * Addressed by index rather than label, so two benefits that happen to read the
 * same do not toggle together, and bounds-checked because the index comes from a
 * form.
 */
export async function toggleBenefit(formData: FormData): Promise<void> {
    try {
        const eventId = String(formData.get("eventId") ?? "").trim();
        const id = String(formData.get("id") ?? "").trim();
        const index = Number(formData.get("index"));
        if (!id || !Number.isInteger(index) || index < 0) return;

        const event = await assertOwnedEvent(eventId);
        if (!event) return;

        const ref = adminDb.collection(COLLECTIONS.EVENT_ORGANIZATIONS).doc(id);
        const snap = await ref.get();
        const row = snap.data() as { eventId?: string; benefits?: unknown[] } | undefined;
        if (!snap.exists || String(row?.eventId) !== eventId) return;

        const benefits = Array.isArray(row?.benefits)
            ? [...(row.benefits as Array<{ label?: string; delivered?: boolean; deliveredAt?: Date | string | null }>)]
            : [];
        const benefit = benefits[index];
        if (!benefit?.label) return;

        const delivered = !benefit.delivered;
        benefits[index] = {
            label: String(benefit.label),
            delivered,
            // Cleared on un-ticking, so the timestamp never claims a delivery
            // that has been walked back.
            deliveredAt: delivered ? new Date() : null,
        };

        await ref.set({ benefits, updatedAt: new Date() }, { merge: true });
        revalidatePath(`/organizer/${event.organizerId}/events/${eventId}/sponsors`);
    } catch (err) {
        console.error("[toggleBenefit]", err);
    }
}

/**
 * Invite a collaborator by email (spec 5.2).
 *
 * Deliberately does NOT create an account. Minting users server-side means a
 * set-password flow and a new auth surface, and this codebase's signup already
 * had a privilege-escalation hole in it. Instead the invitee signs up through
 * the normal route and then accepts, which is what links their account to the
 * event -- so no credential is ever issued by this action.
 */
export async function inviteCollaborator(
    _prevState: ActionResult | null,
    formData: FormData,
): Promise<ActionResult> {
    try {
        const eventId = String(formData.get("eventId") ?? "").trim();
        const id = String(formData.get("id") ?? "").trim();
        const email = normalizeEmail(formData.get("email"));
        if (!looksLikeEmail(email)) return fail("Enter a valid email address.");

        const event = await assertOwnedEvent(eventId);
        if (!event) return fail("You cannot invite collaborators to that event.");

        const all = await getEventOrganizations(eventId);
        const target = all.find((o) => o.id === id);
        if (!target) return fail("That record no longer exists.");
        if (target.type !== "collaborator") return fail("Only a collaborator can be invited to the dashboard.");
        if (target.acceptedAt) return fail("They have already accepted.");

        // Re-issued on every invite, so a forwarded older link stops working.
        const token = inviteToken();
        await adminDb.collection(COLLECTIONS.EVENT_ORGANIZATIONS).doc(id).set(
            { invitedEmail: email, invitedAt: new Date(), inviteToken: token, updatedAt: new Date() },
            { merge: true },
        );

        const acceptUrl = await absoluteUrl(`/collaborate/${token}`);
        await sendEmail(
            { email, name: target.contactName || target.name },
            {
                subject: `You have been invited to collaborate on ${event.title}`,
                html: `<p>${escapeHtml(target.name)} has been invited to collaborate on <strong>${escapeHtml(event.title)}</strong>.</p>
<p><a href="${escapeHtml(acceptUrl)}">Accept the invitation</a></p>
<p style="color:#737373;font-size:12px">You will need an Avoeline organizer account. Sign up first if you do not have one, then open this link again.</p>`,
                senderName: event.title,
            },
        );

        revalidatePath(`/organizer/${event.organizerId}/events/${eventId}/sponsors`);
        return ok();
    } catch (err) {
        console.error("[inviteCollaborator]", err);
        return fail("Could not send that invitation. Please try again.");
    }
}

/**
 * Accept a collaborator invitation, linking the signed-in account to the event.
 *
 * The token authorizes the link, but the ACCOUNT has to be an organizer: the
 * dashboard lives under /organizer, and proxy.ts admits only that role there, so
 * accepting as an attendee would produce an account that holds access it can
 * never reach. Saying so is better than granting something unusable.
 */
export async function acceptCollaboration(formData: FormData): Promise<ActionResult> {
    try {
        const token = String(formData.get("token") ?? "").trim();
        if (!token) return fail("That invitation link is not valid.");

        const user = await AuthService.getCurrentUser();
        if (!user?.userId) return fail("Sign in first, then open the invitation link again.");
        if (String(user.userType).trim().toLowerCase() !== "organizer") {
            return fail("Collaborator access needs an organizer account. Sign up as an organizer, then open the link again.");
        }

        const invite = await findCollaboratorByToken(token);
        if (!invite || invite.type !== "collaborator") return fail("That invitation link is not valid.");
        if (invite.acceptedAt) return fail("That invitation has already been accepted.");

        // The address the organizer invited is part of the credential: a
        // forwarded link must not let a different account take the seat.
        if (invite.invitedEmail && invite.invitedEmail !== normalizeEmail(user.email)) {
            return fail("This invitation was sent to a different email address.");
        }

        await adminDb.collection(COLLECTIONS.EVENT_ORGANIZATIONS).doc(invite.id).set(
            {
                userId: user.userId,
                acceptedAt: new Date(),
                // Spent, so the link cannot be replayed.
                inviteToken: null,
                updatedAt: new Date(),
            },
            { merge: true },
        );

        revalidatePath(`/organizer/${user.userId}/events`);
        return ok();
    } catch (err) {
        console.error("[acceptCollaboration]", err);
        return fail("Could not accept that invitation. Please try again.");
    }
}
