// ==========================================
// BOOKING REQUIREMENTS
// ==========================================

export interface Requirements {
    description: string;
    serviceDate: string;
    startTime: string;
    endTime: string;
    location: string;
    specialInstructions: string;
    guestCount: number;
}

// ==========================================
// QUOTE & NEGOTIATION INTERFACES
// ==========================================

export interface AdditionalCharge {
    description: string;
    amount: number;
}

export interface BreakdownItem {
    item: string;
    quantity: number;
    unitPrice: number;
    total: number;
}

export interface VendorQuote {
    basePrice: number;
    additionalCharges: AdditionalCharge[];
    discount: number;
    totalAmount: number;
    breakdown: BreakdownItem[];
    terms: string;
    validity: string;
}

// System timestamps are stored as Firebase Timestamps (read back as Date);
// legacy docs may still carry ISO strings, hence the union.
export type SystemTimestamp = Date | string;

export interface NegotiationMessage {
    from: "organizer" | "vendor";
    message: string;
    timestamp: SystemTimestamp;
}

export interface Quote {
    requestedAt: SystemTimestamp;
    respondedAt: SystemTimestamp | null;
    vendorQuote: VendorQuote | null;
    negotiation: NegotiationMessage[];
}

// ==========================================
// STATUS, CONTRACT & PAYMENT INTERFACES
// ==========================================

export interface StatusHistoryEntry {
    status: "quote_requested" | "quote_sent" | "quote_accepted" | "confirmed" | "in_progress" | "completed" | "cancelled" | string;
    timestamp: SystemTimestamp;
}

export interface ContractTerms {
    cancellationPolicy: string;
    liability: string;
}

export interface Contract {
    signed: boolean;
    signedByOrganizer: string | null;
    signedByVendor: string | null;
    signedAt: string | null;
    contractUrl: string | null;
    terms: ContractTerms;
}

export interface PaymentInstallment {
    installment: string;
    amount: number;
    dueDate: string;
    status: "pending" | "paid" | "failed" | "refunded";
    paymentId: string | null;
}

export interface Commission {
    platformCommission: number;
    platformCommissionPercentage: number;
    vendorReceives: number;
}

export interface Payment {
    totalAmount: number;
    currency: string;
    paymentSchedule: PaymentInstallment[];
    commission: Commission;
}

// ==========================================
// LOGISTICS & POST-EVENT INTERFACES
// ==========================================

export interface Delivery {
    scheduledDate: string;
    scheduledTime: string;
    actualDeliveryTime: string | null;
    deliveryNotes: string | null;
    setupCompleted: boolean;
    teardownCompleted: boolean;
}

export interface OrganizerCheck {
    checked: boolean;
    rating: number | null;
    comments: string | null;
    checkedAt: string | null;
}

export interface VendorSelfCheck {
    completed: boolean;
    report: string | null;
}

export interface QualityCheck {
    organizerCheck: OrganizerCheck | null;
    vendorSelfCheck: VendorSelfCheck | null;
}

export interface Communication {
    type: string;
    from: "organizer" | "vendor" | "system";
    to: "organizer" | "vendor" | "system";
    message: string;
    timestamp: SystemTimestamp;
}

export interface Documents {
    quotePdf: string | null;
    invoicePdf: string | null;
    receiptPdf: string | null;
}

export interface Review {
    organizerReviewId: string | null;
    vendorReviewId: string | null;
    organizerRating: number | null;
    vendorRating: number | null;
}

// ==========================================
// MAIN BOOKING INTERFACE
// ==========================================

export interface BookingData {
    bookingId: string;
    eventId: string;
    vendorId: string;
    organizerId: string;
    serviceType: string;
    serviceId: string;
    requirements: Requirements;
    quote: Quote;
    status: "quote_requested" | "quote_sent" | "quote_accepted" | "confirmed" | "in_progress" | "completed" | "cancelled" | string;
    statusHistory: StatusHistoryEntry[];
    contract: Contract;
    payment: Payment;
    delivery: Delivery;
    qualityCheck: QualityCheck;
    communications: Communication[];
    documents: Documents;
    review: Review;
    createdAt: SystemTimestamp;
    updatedAt: SystemTimestamp;
    confirmedAt: SystemTimestamp | null;
    completedAt: SystemTimestamp | null;
    cancelledAt: SystemTimestamp | null;
}