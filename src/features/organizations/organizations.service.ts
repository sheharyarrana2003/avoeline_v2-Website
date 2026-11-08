import { cache } from "react";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { toIsoString } from "@/src/lib/datetime";
import { isOrganizationType, type EventOrganization, type SponsorBenefit } from "./types";

function mapToBenefits(raw: unknown): SponsorBenefit[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((b: any) => b?.label)
    .map((b: any) => ({
      label: String(b.label),
      delivered: !!b.delivered,
      deliveredAt: toIsoString(b.deliveredAt),
    }));
}

function mapRowToOrganization(row: Record<string, any>): EventOrganization {
  const extra = (row.extra && typeof row.extra === "object" ? row.extra : {}) as Record<
    string,
    any
  >;
  const typeRaw = row.type || extra.type;
  return {
    id: String(row.id || ""),
    eventId: String(row.event_id || extra.eventId || ""),
    // An unrecognised type reads as `partner`, the one with no financial or
    // access implications -- a corrupt value must not grant anything.
    type: isOrganizationType(typeRaw) ? typeRaw : "partner",
    name: String(row.name || ""),
    logoUrl: String(row.logo_url || extra.logoUrl || ""),
    websiteUrl: String(row.website_url || extra.websiteUrl || ""),
    contactName: String(row.contact_name || extra.contactName || ""),
    contactEmail: String(row.contact_email || extra.contactEmail || ""),
    contactPhone: String(row.contact_phone || extra.contactPhone || ""),

    tier: String(row.tier || extra.tier || ""),
    contractValue: Number(row.contract_value ?? extra.contractValue ?? 0),
    benefits: mapToBenefits(row.benefits ?? extra.benefits),
    paymentStatus:
      row.payment_status === "partial" || row.payment_status === "received"
        ? row.payment_status
        : "pending",
    amountReceived: Number(row.amount_received ?? 0),
    receivedOn: row.received_on ? String(row.received_on) : null,

    // Legacy field — new collaborators do not get dashboard access via role.
    role: row.role === "full" || extra.role === "full" ? "full" : "track",
    contributionKind: String(row.contribution_kind || extra.contributionKind || ""),
    contributionCustom: String(row.contribution_custom || extra.contributionCustom || ""),
    collaborationTerms: String(row.collaboration_terms || extra.collaborationTerms || ""),
    userId: row.user_id ? String(row.user_id) : extra.userId ? String(extra.userId) : null,
    invitedEmail: String(row.invited_email || extra.invitedEmail || "")
      .trim()
      .toLowerCase(),
    invitedAt: toIsoString(row.invited_at || extra.invitedAt),
    acceptedAt: toIsoString(row.accepted_at || extra.acceptedAt),
    inviteToken: row.invite_token
      ? String(row.invite_token)
      : extra.inviteToken
        ? String(extra.inviteToken)
        : null,
    trackId: String(row.track_id || extra.trackId || extra.sponsorTrackId || ""),

    partnershipKind: String(row.partnership_kind || extra.partnershipKind || ""),
    sponsorTrackId: String(row.track_id || extra.trackId || extra.sponsorTrackId || ""),

    createdAt: toIsoString(row.created_at || extra.createdAt),
    updatedAt: toIsoString(row.updated_at || extra.updatedAt),
  };
}

export async function listPartnerTypes(
  organizerId: string,
): Promise<{ label: string; description: string }[]> {
  if (!organizerId) return [];
  const { data, error } = await supabaseAdmin
    .from(TABLES.PARTNER_TYPES)
    .select("label, description")
    .eq("organizer_id", organizerId)
    .order("label");
  if (error) throw error;
  return (data ?? []).map((r) => ({
    label: String(r.label),
    description: String(r.description || ""),
  }));
}

/** Every sponsor, collaborator and partner on one event. */
export const getEventOrganizations = cache(
  async (eventId: string): Promise<EventOrganization[]> => {
    if (!eventId) return [];
    try {
      const { data, error } = await supabaseAdmin
        .from(TABLES.EVENT_SPONSORS_PARTNERS)
        .select("*")
        .eq("event_id", eventId);
      if (error) throw error;
      return (data ?? [])
        .map((d) => mapRowToOrganization(d as Record<string, any>))
        .sort((a, b) => a.name.localeCompare(b.name));
    } catch (err) {
      console.error("[getEventOrganizations] read failed", { eventId, err });
      throw new Error(`Failed to read organizations for ${eventId}`, { cause: err });
    }
  },
);

/**
 * One collaborator invite by its token.
 *
 * Queried on the token alone, like the event invites: the token is the secret,
 * so the holder does not also have to prove which event it belongs to.
 */
export const findCollaboratorByToken = cache(
  async (token: string): Promise<EventOrganization | null> => {
    const clean = String(token ?? "").trim();
    if (!clean) return null;
    try {
      const { data, error } = await supabaseAdmin
        .from(TABLES.EVENT_SPONSORS_PARTNERS)
        .select("*")
        .eq("invite_token", clean)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data ? mapRowToOrganization(data as Record<string, any>) : null;
    } catch (err) {
      console.error("[findCollaboratorByToken] read failed", err);
      throw new Error("Failed to look up that invitation", { cause: err });
    }
  },
);

/**
 * Events one person can reach as an accepted, full-access collaborator.
 *
 * The read behind collaborator authorization. `track`-role collaborators are
 * excluded: tracks arrive with the hackathon module, so there is nothing to
 * scope them to yet and granting them the whole dashboard would be wrong.
 */
export const getCollaboratingEventIds = cache(async (userId: string): Promise<string[]> => {
  if (!userId) return [];
  try {
    const { data, error } = await supabaseAdmin
      .from(TABLES.EVENT_SPONSORS_PARTNERS)
      .select("*")
      .eq("user_id", userId);
    if (error) throw error;
    return (data ?? [])
      .map((d) => mapRowToOrganization(d as Record<string, any>))
      .filter((o) => o.type === "collaborator" && o.role === "full" && !!o.acceptedAt)
      .map((o) => o.eventId);
  } catch (err) {
    console.error("[getCollaboratingEventIds] read failed", { userId, err });
    return [];
  }
});
