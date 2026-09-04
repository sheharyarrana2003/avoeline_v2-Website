import { adminAuth, adminDb } from "@/data/admin_db";
import { Registration } from "./models/reg.type";
import { QuerySnapshot } from "firebase-admin/firestore";
import { COLLECTIONS } from "@/data/collections";
import { toIsoString } from "@/src/lib/datetime";


export function mapToRegistration(raw: any, fallbackId?: string): Registration {
  if (!raw) {
    throw new Error("Cannot map an empty or undefined raw object to Registration");
  }

  return {
    // Live docs don't carry a registrationId field, so fall back to the Firestore
    // doc id — callers key list rows off this and need it to be unique.
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
      raw.customResponses && typeof raw.customResponses === "object" && !Array.isArray(raw.customResponses)
        ? { ...raw.customResponses }
        : {},

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
    const querySnapshot: QuerySnapshot = await adminDb
      .collection(COLLECTIONS.REGISTRATIONS)
      .where("userId", "==", user_id)
      .get();

    return querySnapshot.docs
      .map((d) => mapToRegistration(d.data(), d.id))
      .sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));
  },

  // Fetch every registration for an event in one query. Used to resolve each
  // attendee's this-event registration without an extra read per attendee.
  async getRegsOfEvent(event_id: string): Promise<Registration[]> {
    const querySnapshot: QuerySnapshot = await adminDb
      .collection(COLLECTIONS.REGISTRATIONS)
      .where("eventId", "==", event_id)
      .get();
    return querySnapshot.docs.map(d => mapToRegistration(d.data(), d.id));
  }
  , async updateReg(updated_reg: Registration) {

    const regDocRef = adminDb
      .collection(COLLECTIONS.REGISTRATIONS)
      .doc(updated_reg.registrationId);

    // Filter out registrationId if it's stored separately as doc ID, or pass updated_reg directly
    await regDocRef.set({
      ...updated_reg,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  }
}