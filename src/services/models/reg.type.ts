export interface StatusHistoryEntry {
  status: "pending" | "confirmed" | "checked_in" | "attended" | "cancelled" | "no_show";
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

export interface Registration {
  registrationId: string;
  eventId: string; // Foreign Key to Event
  userId: string; // Foreign Key to User
  organizerId: string; // Foreign Key to Organizer (User)
  registrationDate: string;
  registrationSource: "mobile_app" | "web" | "admin_panel";
  status: "pending" | "confirmed" | "checked_in" | "attended" | "cancelled" | "no_show";
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