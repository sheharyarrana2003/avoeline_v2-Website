import { CertificateType } from "./event.model";

/**
 * Every state a registration can hold.
 *
 * `waitlisted` and `rejected` are new: capacity used to refuse outright with no
 * list to join, and an organizer approving registrations had no way to record a
 * refusal. Declared once and reused -- this union was written out twice, on
 * StatusHistoryEntry and on Registration, and the two were already a copy apart.
 */
export type RegistrationStatus =
  | "pending"
  | "confirmed"
  | "checked_in"
  | "attended"
  | "cancelled"
  | "no_show"
  | "awaiting_payment"
  | "waitlisted"
  | "rejected";

export interface StatusHistoryEntry {
  status: RegistrationStatus;
  timestamp: string;
}

export interface PaymentInfo {
  paymentId: string;
  amountPaid: number;
  currency: string;
  paymentMethod: "jazzcash" | "credit_card" | "bank_transfer" | "free_ticket" | string;
  paymentStatus: "pending" | "completed" | "failed" | "refunded";
  transactionId: string | null;
  invoiceUrl: string | null;
  /**
   * Storage key of the payment screenshot the attendee uploaded, e.g.
   * "payment-proofs/<uuid>-receipt.png". A key rather than a URL on purpose: the
   * bucket is private, so the link has to be signed, and a signed URL expires --
   * storing one would leave the organizer looking at a dead image an hour later.
   * Sign it at render time instead. Distinct from `invoiceUrl`, which is an
   * invoice we issued rather than a receipt they sent us.
   */
  proofPath: string | null;
}

export interface DiscountInfo {
  type: string;
  percentage: number;
  originalPrice: number;
  discountedPrice: number;
}

export interface CheckInInfo {
  checkedIn: boolean;
  checkInTime: string | null;
  checkInMethod: "qr_scan" | "manual" | "nfc" | null;
  checkedInBy: string | null; // Organizer ID
  deviceId: string | null;
}

export interface QRCodeInfo {
  data: string;
  imageUrl: string;
  scanCount: number;
  lastScanned: string | null;
}

export interface RegistrationCertificate {
  type : CertificateType
  issued: boolean;
  certificateId: string | null;
  issueDate: string | null;
  downloadUrl: string | null;
  sharedOnLinkedIn: boolean;
}

export interface CommunicationLog {
  type: "registration_confirmation" | "event_reminder" | "cancellation_confirmation" | string;
  sentAt: string;
  channel: "email" | "sms" | "push_notification";
  status: "sent" | "delivered" | "read" | "failed";
}

export interface RegistrationMetadata {
  ipAddress: string;
  userAgent: string;
  deviceType: "mobile" | "desktop" | "tablet" | string;
}

/**
 * Who registered, when they hold no account.
 *
 * Registrations used to be reachable only from inside the app, so `userId` always
 * pointed at a real user and the name and email were read from there. The public
 * registration form has no account behind it, so the contact details have to live
 * on the registration itself. `userId` stays "" for these.
 */
export interface RegistrantContact {
  name: string;
  email: string;
  phone: string;
}

export interface Registration {
  registrationId: string;
  eventId: string; // Foreign Key to Event
  userId: string; // Foreign Key to User -- "" for public, account-less registrations
  /** Set when `userId` is empty; null for registrations made by a signed-in user. */
  attendee: RegistrantContact | null;
  organizerId: string; // Foreign Key to Organizer (User)
  registrationDate: string;
  registrationSource: "mobile_app" | "web" | "admin_panel";
  status: RegistrationStatus;
  statusHistory: StatusHistoryEntry[];
  payment: PaymentInfo;
  pricingTier: string;
  /**
   * Attendee tier -- General/Premium/VIP/Speaker/Sponsor by default, set per
   * event. Distinct from `pricingTier`, which is the name of the ticket price
   * band they bought; this is what they are entitled to see.
   */
  tier: string;
  /** 1-based place in the queue while `status === "waitlisted"`, else 0. */
  waitlistPosition: number;
  /** The guest-list or invite row that authorized this registration, if any. */
  inviteId: string | null;
  /**
   * Answers to the event's own registration questions
   * (`event.registration.customForm`), keyed by `CustomFieldOption.fieldId`.
   *
   * Kept as a free-form map rather than typed per event, because the questions
   * are defined per event at creation time. Empty for an event that asks none,
   * and for every registration made before the form was rendered at all.
   */
  customResponses: Record<string, string | number | boolean>;
  /** Competition chosen on a hackathon register form, if any. */
  hackathonTrackId: string | null;
  finalPrice: number;
  discountApplied: DiscountInfo | null;
  checkIn: CheckInInfo;
  qrCode: QRCodeInfo;
  certificate: RegistrationCertificate;
  communications: CommunicationLog[];
  feedbackSubmitted: boolean;
  rating: number | null;
  reviewId: string | null;
  metadata: RegistrationMetadata;
  createdAt: string;
  updatedAt: string;
  cancelledAt: string | null;
  /** Hackathon team created at register time, if any. */
  hackathonTeamId?: string | null;
  /** Lead occupies capacity; extra members do not. */
  hackathonRole?: "team_lead" | "participant" | null;
  /** Plaintext access code, set only after payment + confirmation. */
  hackathonAccessCode?: string | null;
  /** Regular (non-hackathon) group booking. */
  groupId?: string | null;
  groupRole?: "lead" | "member" | null;
}