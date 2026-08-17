import { CertificateType } from "./event.model";

export interface StatusHistoryEntry {
  status: "pending" | "confirmed" | "checked_in" | "attended" | "cancelled" | "no_show" | "awaiting_payment";
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
  status: "pending" | "confirmed" | "checked_in" | "attended" | "cancelled" | "no_show" | "awaiting_payment";
  statusHistory: StatusHistoryEntry[];
  payment: PaymentInfo;
  pricingTier: string;
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
}