import { Registration } from "./models/reg.type";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { regStatusFromDb, regStatusToDb, payStatusFromDb, payStatusToDb } from "@/data/statusMaps";
import { toIsoString } from "@/src/lib/datetime";

type RegRow = Record<string, unknown>;

/** Hydrate a Postgres registrations row into the camelCase shape mapToRegistration expects. */
export function hydrateRegistrationRow(row: RegRow): Record<string, unknown> {
  const extra = (row.extra && typeof row.extra === "object" ? row.extra : {}) as Record<
    string,
    unknown
  >;
  const status = regStatusFromDb(String(row.status || extra.status || "pending"));
  const pay = payStatusFromDb(String(row.payment_status || "pending"));
  return {
    ...extra,
    registrationId: row.id,
    id: row.id,
    eventId: row.event_id,
    userId: row.user_id || "",
    organizerId: row.organizer_id || extra.organizerId,
    attendee: extra.attendee || {
      name: row.attendee_name,
      email: row.attendee_email,
      phone: row.attendee_phone,
    },
    status,
    waitlistPosition: row.waitlist_position,
    inviteId: row.invite_id,
    customResponses: row.custom_responses || {},
    payment: (extra.payment as object) || {
      paymentId: "",
      amountPaid: row.amount_paid,
      currency: extra.currency || "PKR",
      paymentMethod: extra.paymentMethod || "bank_transfer",
      paymentStatus: pay,
      transactionId: null,
      invoiceUrl: null,
      proofPath: row.payment_proof_path,
    },
    pricingTier: row.pricing_tier,
    finalPrice: row.final_price,
    checkIn: (extra.checkIn as object) || {
      checkedIn: row.checked_in,
      checkInTime: row.check_in_time,
      checkInMethod: row.check_in_method,
      checkedInBy: row.checked_in_by,
      deviceId: null,
    },
    qrCode: (extra.qrCode as object) || {
      data: row.qr_code_data,
      imageUrl: row.qr_code_image_url,
      scanCount: 0,
      lastScanned: null,
    },
    certificate: (extra.certificate as object) || {
      type: "digital",
      issued: row.certificate_issued,
      certificateId: row.certificate_id,
      issueDate: null,
      downloadUrl: null,
      sharedOnLinkedIn: false,
    },
    communications: row.communications || extra.communications || [],
    statusHistory: row.status_history || extra.statusHistory || [],
    feedbackSubmitted: row.feedback_submitted,
    rating: row.rating,
    reviewId: row.review_id,
    registrationSource: row.registration_source || extra.registrationSource || "web",
    tier: row.tier || extra.tier || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    cancelledAt: row.cancelled_at,
    hackathonAccessCodeHash:
      row.hackathon_access_code_hash || extra.hackathonAccessCodeHash || null,
    hackathonAccessCode: extra.hackathonAccessCode || extra.hackathon_access_code || null,
    hackathonTeamId: extra.hackathonTeamId || extra.hackathon_team_id || null,
    hackathonTrackId: extra.hackathonTrackId || extra.hackathon_track_id || null,
    hackathonRole: extra.hackathonRole || extra.hackathon_role || null,
    groupId: row.group_id || extra.groupId || extra.group_id || null,
    groupRole:
      extra.groupRole === "lead" || extra.groupRole === "member"
        ? extra.groupRole
        : extra.group_role || null,
  };
}

export function mapToRegistration(raw: any, fallbackId?: string): Registration {
  if (!raw) {
    throw new Error("Cannot map an empty or undefined raw object to Registration");
  }

  return {
    // Live rows don't always carry a registrationId field, so fall back to the
    // table primary key — callers key list rows off this and need it unique.
    registrationId: String(raw.registrationId || fallbackId || ""),
    eventId: String(raw.eventId || ""),
    userId: String(raw.userId || ""),
    // Only public, account-less registrations carry this. Seeded docs predate the
    // field entirely, so absence has to stay null rather than an empty contact --
    // callers use it to decide whether to look the person up in `users` at all.
    attendee: raw.attendee
      ? {
          name: String(raw.attendee.name || ""),
          email: String(raw.attendee.email || ""),
          phone: String(raw.attendee.phone || ""),
        }
      : null,
    organizerId: String(raw.organizerId || ""),
    registrationDate: String(raw.registrationDate || new Date().toISOString()),
    registrationSource: raw.registrationSource || "web",
    status: raw.status || "pending",
    // Defaults chosen so a document written before these fields existed reads as
    // "not waitlisted, no tier assigned, not from an invite" rather than as
    // position 1 in a queue it was never in.
    tier: String(raw.tier || ""),
    waitlistPosition: Number(raw.waitlistPosition ?? 0),
    inviteId: raw.inviteId ? String(raw.inviteId) : null,
    // A plain object, so the shape crossing to a Client Component stays JSON.
    // Anything that is not one reads as "asked nothing", not as a broken row.
    customResponses:
      raw.customResponses &&
      typeof raw.customResponses === "object" &&
      !Array.isArray(raw.customResponses)
        ? { ...raw.customResponses }
        : {},
    hackathonTrackId: String(raw.hackathonTrackId || raw.hackathon_track_id || "") || null,
    hackathonTeamId: String(raw.hackathonTeamId || raw.hackathon_team_id || "") || null,
    hackathonRole:
      raw.hackathonRole === "team_lead" || raw.hackathonRole === "participant"
        ? raw.hackathonRole
        : null,
    hackathonAccessCode: String(raw.hackathonAccessCode || "") || null,
    groupId: String(raw.groupId || raw.group_id || "") || null,
    groupRole: raw.groupRole === "lead" || raw.groupRole === "member" ? raw.groupRole : null,

    statusHistory: Array.isArray(raw.statusHistory)
      ? raw.statusHistory.map((h: any) => ({
          status: h.status || "pending",
          timestamp: toIsoString(h.timestamp) || new Date().toISOString(),
        }))
      : [],

    payment: {
      paymentId: String(raw.payment?.paymentId || ""),
      amountPaid: Number(raw.payment?.amountPaid ?? 0),
      currency: String(raw.payment?.currency || "USD"),
      paymentMethod: String(raw.payment?.paymentMethod || "free_ticket"),
      paymentStatus: raw.payment?.paymentStatus || "pending",
      transactionId: raw.payment?.transactionId ?? null,
      invoiceUrl: raw.payment?.invoiceUrl ?? null,
      proofPath: raw.payment?.proofPath ?? null,
    },

    pricingTier: String(raw.pricingTier || ""),
    finalPrice: Number(raw.finalPrice ?? 0),

    discountApplied: raw.discountApplied
      ? {
          type: String(raw.discountApplied.type || ""),
          percentage: Number(raw.discountApplied.percentage ?? 0),
          originalPrice: Number(raw.discountApplied.originalPrice ?? 0),
          discountedPrice: Number(raw.discountApplied.discountedPrice ?? 0),
        }
      : null,

    checkIn: {
      checkedIn: Boolean(raw.checkIn?.checkedIn ?? false),
      checkInTime: toIsoString(raw.checkIn?.checkInTime),
      checkInMethod: raw.checkIn?.checkInMethod ?? null,
      checkedInBy: raw.checkIn?.checkedInBy ?? null,
      deviceId: raw.checkIn?.deviceId ?? null,
    },

    qrCode: {
      data: String(raw.qrCode?.data || ""),
      imageUrl: String(raw.qrCode?.imageUrl || ""),
      scanCount: Number(raw.qrCode?.scanCount ?? 0),
      // Live docs hold a real Timestamp here. Passed through raw it crashes the
      // organizer's attendees tab outright -- a Timestamp is a class instance, and
      // anything crossing into a Client Component has to be plain JSON.
      lastScanned: toIsoString(raw.qrCode?.lastScanned),
    },

    certificate: {
      type: raw?.type || "digital",
      issued: Boolean(raw.certificate?.issued ?? false),
      certificateId: raw.certificate?.certificateId ?? null,
      issueDate: toIsoString(raw.certificate?.issueDate),
      downloadUrl: raw.certificate?.downloadUrl ?? null,
      sharedOnLinkedIn: Boolean(raw.certificate?.sharedOnLinkedIn ?? false),
    },

    communications: Array.isArray(raw.communications)
      ? raw.communications.map((c: any) => ({
          type: String(c.type || "registration_confirmation"),
          sentAt: String(c.sentAt || new Date().toISOString()),
          channel: c.channel || "email",
          status: c.status || "sent",
        }))
      : [],

    feedbackSubmitted: Boolean(raw.feedbackSubmitted ?? false),
    rating: raw.rating !== undefined && raw.rating !== null ? Number(raw.rating) : null,
    reviewId: raw.reviewId ?? null,

    metadata: {
      ipAddress: String(raw.metadata?.ipAddress || ""),
      userAgent: String(raw.metadata?.userAgent || ""),
      deviceType: String(raw.metadata?.deviceType || "desktop"),
    },

    // String(Timestamp) yields "[object Object]" — three live registration docs
    // already store that, which is what crashed the analytics trend.
    createdAt: toIsoString(raw.createdAt) || new Date().toISOString(),
    updatedAt: toIsoString(raw.updatedAt) || new Date().toISOString(),
    cancelledAt: toIsoString(raw.cancelledAt),
  };
}

function registrationToRow(reg: Registration): Record<string, unknown> {
  const now = new Date().toISOString();
  return {
    event_id: reg.eventId || null,
    user_id: reg.userId || null,
    attendee_name: reg.attendee?.name || "",
    attendee_email: reg.attendee?.email || "",
    attendee_phone: reg.attendee?.phone || null,
    organizer_id: reg.organizerId || null,
    status: regStatusToDb(reg.status),
    waitlist_position: reg.waitlistPosition || null,
    invite_id: reg.inviteId || null,
    custom_responses: reg.customResponses || {},
    registration_source: reg.registrationSource || "web",
    tier: reg.tier || null,
    pricing_tier: reg.pricingTier || null,
    final_price: reg.finalPrice ?? 0,
    payment_status: payStatusToDb(reg.payment?.paymentStatus),
    amount_paid: reg.payment?.amountPaid ?? 0,
    payment_proof_path: reg.payment?.proofPath ?? null,
    checked_in: Boolean(reg.checkIn?.checkedIn),
    check_in_time: reg.checkIn?.checkInTime || null,
    check_in_method: reg.checkIn?.checkInMethod || null,
    checked_in_by: reg.checkIn?.checkedInBy || null,
    qr_code_data: reg.qrCode?.data || "",
    // O1 A6: stop writing hosted QR URLs — render via /api/qr/[token].png
    qr_code_image_url: null,
    certificate_issued: Boolean(reg.certificate?.issued),
    certificate_id: reg.certificate?.certificateId || null,
    feedback_submitted: Boolean(reg.feedbackSubmitted),
    rating: reg.rating ?? null,
    review_id: reg.reviewId || null,
    communications: reg.communications || [],
    status_history: reg.statusHistory || [],
    cancelled_at: reg.cancelledAt || null,
    group_id: reg.groupId || null,
    updated_at: now,
    extra: {
      ...reg,
      hackathonTrackId: reg.hackathonTrackId,
      hackathonTeamId: reg.hackathonTeamId,
      hackathonRole: reg.hackathonRole,
      hackathonAccessCode: reg.hackathonAccessCode,
      groupRole: reg.groupRole,
      discountApplied: reg.discountApplied,
      metadata: reg.metadata,
      payment: reg.payment,
      checkIn: reg.checkIn,
      qrCode: reg.qrCode,
      certificate: reg.certificate,
      attendee: reg.attendee,
    },
  };
}

export const RegService = {
  /**
   * Every registration one person holds, newest first.
   *
   * Replaces getRegOfUser, which capped the read at one document and returned
   * `mapToRegistration({})` when there were none -- a truthy object with empty
   * fields, which reads as "a registration exists" at every call site. It had
   * none, so nothing had to be migrated.
   *
   * Sorted in memory: a where + orderBy pair needs a composite index, and the
   * ones declared for registrations are on a misspelled collection group.
   */
  async getRegsOfUser(user_id: string): Promise<Registration[]> {
    if (!user_id) return [];
    const { data, error } = await supabaseAdmin
      .from(TABLES.REGISTRATIONS)
      .select("*")
      .eq("user_id", user_id);
    if (error) throw error;

    return (data ?? [])
      .map((row) => mapToRegistration(hydrateRegistrationRow(row as RegRow), row.id))
      .sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));
  },

  // Fetch every registration for an event in one query. Used to resolve each
  // attendee's this-event registration without an extra read per attendee.
  async getRegsOfEvent(event_id: string): Promise<Registration[]> {
    const { data, error } = await supabaseAdmin
      .from(TABLES.REGISTRATIONS)
      .select("*")
      .eq("event_id", event_id);
    if (error) throw error;
    return (data ?? []).map((row) =>
      mapToRegistration(hydrateRegistrationRow(row as RegRow), row.id),
    );
  },

  async updateReg(updated_reg: Registration) {
    const { error } = await supabaseAdmin
      .from(TABLES.REGISTRATIONS)
      .update(registrationToRow(updated_reg))
      .eq("id", updated_reg.registrationId);
    if (error) throw error;
  },
};
