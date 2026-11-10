"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
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
  return String(value ?? "")
    .trim()
    .toLowerCase();
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

    const rawType = String(formData.get("type") ?? "")
      .trim()
      .toLowerCase();
    if (!isOrganizationType(rawType)) return fail("Choose sponsor, collaborator or partner.");
    const type: OrganizationType = rawType;

    const name = String(formData.get("name") ?? "").trim();
    if (!name) return fail("Give the organization a name.");
    if (name.length > 120) return fail("That name is too long.");

    const contactEmail = normalizeEmail(formData.get("contactEmail"));
    if (contactEmail && !looksLikeEmail(contactEmail))
      return fail("That contact email does not look right.");

    const existingId = String(formData.get("id") ?? "").trim();
    const all = await getEventOrganizations(eventId);
    const existing = existingId ? all.find((o) => o.id === existingId) : undefined;
    if (existingId && !existing) return fail("That record no longer exists.");

    const contractValue =
      Number(String(formData.get("contractValue") ?? "").replace(/[^\d.-]/g, "")) || 0;
    if (contractValue < 0) return fail("A contract value cannot be negative.");
    const paymentStatusRaw = String(formData.get("paymentStatus") ?? "pending").trim();
    const paymentStatus =
      paymentStatusRaw === "partial" || paymentStatusRaw === "received"
        ? paymentStatusRaw
        : "pending";
    const amountReceived =
      Number(String(formData.get("amountReceived") ?? "").replace(/[^\d.-]/g, "")) || 0;
    if (amountReceived < 0) return fail("Amount received cannot be negative.");
    const receivedOn = String(formData.get("receivedOn") ?? "").trim() || null;

    const tier = String(formData.get("tier") ?? "").trim();
    if (type === "sponsor" && tier && !event.sponsorTiers.includes(tier)) {
      return fail("That tier is not one this event offers.");
    }

    const benefitsText = String(formData.get("benefits") ?? "");
    const benefits =
      type === "sponsor"
        ? parseBenefitLines(
            benefitsText.trim() ? benefitsText : DEFAULT_BENEFITS.join("\n"),
            existing?.benefits ?? [],
          )
        : [];

    const now = new Date().toISOString();
    const trackId =
      type === "sponsor" ? String(formData.get("trackId") ?? "").trim() || null : null;
    const contributionKind = String(formData.get("contributionKind") ?? "").trim();
    const contributionCustom = String(formData.get("contributionCustom") ?? "").trim();
    const collaborationTerms = String(formData.get("collaborationTerms") ?? "").trim();
    if (type === "collaborator") {
      if (!contributionKind) return fail("Choose what this collaborator contributes.");
      if (contributionKind === "Other" && !contributionCustom) {
        return fail("Describe the custom contribution.");
      }
      if (!collaborationTerms) return fail("Collaboration terms are required.");
    }
    let partnershipKind =
      type === "partner" ? String(formData.get("partnershipKind") ?? "").trim() : "";
    const customPartnerType = String(formData.get("customPartnerType") ?? "").trim();
    const customPartnerDesc = String(formData.get("customPartnerDescription") ?? "").trim();
    if (type === "partner" && partnershipKind === "__custom__") {
      if (!customPartnerType) return fail("Enter a custom partner type label.");
      partnershipKind = customPartnerType;
      await supabaseAdmin.from(TABLES.PARTNER_TYPES).upsert(
        {
          organizer_id: event.organizerId,
          label: customPartnerType,
          description: customPartnerDesc || "",
        },
        { onConflict: "organizer_id,label" },
      );
    }
    if (type === "partner" && !partnershipKind) return fail("Choose a partner type.");

    const common = {
      event_id: eventId,
      type,
      name,
      logo_url:
        String(formData.get("logoUrl") ?? "").trim() ||
        String(formData.get("logoUrlPaste") ?? "").trim() ||
        null,
      website_url: String(formData.get("websiteUrl") ?? "").trim() || null,
      contact_name: String(formData.get("contactName") ?? "").trim() || null,
      contact_email: contactEmail || null,
      contact_phone: String(formData.get("contactPhone") ?? "").trim() || null,
      tier: type === "sponsor" ? tier || null : null,
      contract_value: type === "sponsor" ? contractValue : 0,
      payment_status: type === "sponsor" ? paymentStatus : "pending",
      amount_received: type === "sponsor" ? amountReceived : 0,
      received_on: type === "sponsor" ? receivedOn : null,
      benefits,
      role: "track",
      track_id: trackId,
      partnership_kind: type === "partner" ? partnershipKind : null,
      contribution_kind: type === "collaborator" ? contributionKind : null,
      contribution_custom: type === "collaborator" ? contributionCustom : null,
      collaboration_terms: type === "collaborator" ? collaborationTerms : null,
      updated_at: now,
    };

    if (existing) {
      const { error } = await supabaseAdmin
        .from(TABLES.EVENT_SPONSORS_PARTNERS)
        .update(common)
        .eq("id", existing.id);
      if (error) throw error;
    } else {
      const id = randomUUID();
      const { error } = await supabaseAdmin.from(TABLES.EVENT_SPONSORS_PARTNERS).insert({
        id,
        ...common,
        user_id: null,
        invited_email: null,
        invited_at: null,
        accepted_at: null,
        invite_token: null,
        created_at: now,
      });
      if (error) throw error;
    }

    revalidatePath(`/organizer/${event.organizerId}/events/${eventId}/sponsors`);
    revalidatePath(`/events/${eventId}`);
    return ok();
  } catch (err) {
    console.error("[saveOrganization]", err);
    return fail(
      "Could not save that organization. Check the name, logo, and required fields, then try again.",
    );
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
    const { data: row, error } = await supabaseAdmin
      .from(TABLES.EVENT_SPONSORS_PARTNERS)
      .select("id, event_id")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!row || String(row.event_id) !== eventId) return;

    const { error: deleteError } = await supabaseAdmin
      .from(TABLES.EVENT_SPONSORS_PARTNERS)
      .delete()
      .eq("id", id);
    if (deleteError) throw deleteError;
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

    const { data: row, error } = await supabaseAdmin
      .from(TABLES.EVENT_SPONSORS_PARTNERS)
      .select("id, event_id, benefits")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!row || String(row.event_id) !== eventId) return;

    const benefits = Array.isArray(row.benefits)
      ? [
          ...(row.benefits as Array<{
            label?: string;
            delivered?: boolean;
            deliveredAt?: string | null;
          }>),
        ]
      : [];
    const benefit = benefits[index];
    if (!benefit?.label) return;

    const delivered = !benefit.delivered;
    benefits[index] = {
      label: String(benefit.label),
      delivered,
      // Cleared on un-ticking, so the timestamp never claims a delivery
      // that has been walked back.
      deliveredAt: delivered ? new Date().toISOString() : null,
    };

    const { error: updateError } = await supabaseAdmin
      .from(TABLES.EVENT_SPONSORS_PARTNERS)
      .update({ benefits, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (updateError) throw updateError;
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
    if (target.type !== "collaborator")
      return fail("Only a collaborator can be invited to the dashboard.");
    if (target.acceptedAt) return fail("They have already accepted.");

    // Re-issued on every invite, so a forwarded older link stops working.
    const token = inviteToken();
    const { error } = await supabaseAdmin
      .from(TABLES.EVENT_SPONSORS_PARTNERS)
      .update({
        invited_email: email,
        invited_at: new Date().toISOString(),
        invite_token: token,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) throw error;

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
      return fail(
        "Collaborator access needs an organizer account. Sign up as an organizer, then open the link again.",
      );
    }

    const invite = await findCollaboratorByToken(token);
    if (!invite || invite.type !== "collaborator")
      return fail("That invitation link is not valid.");
    if (invite.acceptedAt) return fail("That invitation has already been accepted.");

    // The address the organizer invited is part of the credential: a
    // forwarded link must not let a different account take the seat.
    if (invite.invitedEmail && invite.invitedEmail !== normalizeEmail(user.email)) {
      return fail("This invitation was sent to a different email address.");
    }

    const { error } = await supabaseAdmin
      .from(TABLES.EVENT_SPONSORS_PARTNERS)
      .update({
        user_id: user.userId,
        accepted_at: new Date().toISOString(),
        // Spent, so the link cannot be replayed.
        invite_token: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", invite.id);
    if (error) throw error;

    revalidatePath(`/organizer/${user.userId}/events`);
    return ok();
  } catch (err) {
    console.error("[acceptCollaboration]", err);
    return fail("Could not accept that invitation. Please try again.");
  }
}
