import { randomUUID } from "crypto";
import { BookingData } from "./types";
import { EventVendorService } from "../event_vendors/event_venders.services";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { NotificationServices } from "@/src/services/notification.services";
import { formatDate, formatTime, toDate } from "@/src/lib/datetime";
import { recordPayment } from "@/src/features/payments/payments.service";
import type { Database, Json } from "@/src/lib/database.types";

type BookingRow = Database["public"]["Tables"]["bookings"]["Row"];
type BookingUpdate = Database["public"]["Tables"]["bookings"]["Update"];

// Normalize a stored timestamp to a Date, so system-timestamp fields round-trip
// cleanly on the whole-object update_booking write instead of degrading to strings.
function toDt(v: any): Date | null {
  return toDate(v);
}

function asRecord(v: unknown): Record<string, any> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, any>) : {};
}

function toIso(v: unknown): string | null {
  if (v == null || v === "") return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v.toISOString();
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function asJson(value: unknown): Json {
  return value as Json;
}

/** Row → camelCase shape for mapToBooking (columns win over extra). */
function bookingRowToItem(row: BookingRow): Record<string, any> {
  const extra = asRecord(row.extra);
  const quoteCol = asRecord(row.quote);
  const quoteExtra = asRecord(extra.quote);
  const negotiation =
    (Array.isArray(row.negotiation_messages) ? row.negotiation_messages : null) ??
    (Array.isArray(quoteExtra.negotiation) ? quoteExtra.negotiation : null) ??
    (Array.isArray(quoteCol.negotiation) ? quoteCol.negotiation : null) ??
    (Array.isArray(extra.negotiation) ? extra.negotiation : []) ??
    [];

  const contractExtra = asRecord(extra.contract);
  const paymentExtra = asRecord(extra.payment);
  const deliveryExtra = asRecord(extra.delivery);
  const documentsExtra = asRecord(extra.documents);
  const reviewExtra = asRecord(extra.review);
  const requirementsCol = asRecord(row.requirements);
  const requirements =
    Object.keys(requirementsCol).length > 0 ? requirementsCol : asRecord(extra.requirements);

  return {
    ...extra,
    bookingId: row.id,
    eventId: row.event_id,
    vendorId: row.vendor_id,
    organizerId: row.organizer_id,
    serviceType: row.service_type ?? extra.serviceType ?? "",
    serviceId: extra.serviceId ?? extra.service_id ?? "",
    requirements,
    quote: {
      ...quoteExtra,
      ...quoteCol,
      negotiation,
    },
    status: row.status || extra.status || "quote_requested",
    statusHistory: Array.isArray(row.status_history)
      ? row.status_history
      : Array.isArray(extra.statusHistory)
        ? extra.statusHistory
        : [],
    contract: {
      signed: Boolean(contractExtra.signed ?? row.contract_signed),
      signedByOrganizer:
        contractExtra.signedByOrganizer ?? row.contract_signed_by_organizer ?? null,
      signedByVendor: contractExtra.signedByVendor ?? row.contract_signed_by_vendor ?? null,
      signedAt: contractExtra.signedAt ?? row.contract_signed_at ?? null,
      contractUrl: contractExtra.contractUrl ?? row.contract_url ?? null,
      terms: asRecord(contractExtra.terms),
    },
    payment: {
      totalAmount: paymentExtra.totalAmount ?? row.total_amount ?? 0,
      currency: paymentExtra.currency ?? row.currency ?? "USD",
      paymentSchedule: Array.isArray(paymentExtra.paymentSchedule)
        ? paymentExtra.paymentSchedule
        : [],
      commission: {
        platformCommission:
          asRecord(paymentExtra.commission).platformCommission ?? row.platform_commission ?? 0,
        platformCommissionPercentage:
          asRecord(paymentExtra.commission).platformCommissionPercentage ??
          row.platform_commission_pct ??
          0,
        vendorReceives:
          asRecord(paymentExtra.commission).vendorReceives ?? row.vendor_receives ?? 0,
      },
    },
    delivery: {
      scheduledDate: deliveryExtra.scheduledDate ?? row.scheduled_date ?? "",
      scheduledTime: deliveryExtra.scheduledTime ?? row.scheduled_time ?? "",
      actualDeliveryTime: deliveryExtra.actualDeliveryTime ?? row.actual_delivery_time ?? null,
      deliveryNotes: deliveryExtra.deliveryNotes ?? row.delivery_notes ?? null,
      setupCompleted: Boolean(deliveryExtra.setupCompleted ?? row.setup_completed),
      teardownCompleted: Boolean(deliveryExtra.teardownCompleted ?? row.teardown_completed),
    },
    qualityCheck: asRecord(extra.qualityCheck ?? extra.quality_check),
    communications: Array.isArray(extra.communications) ? extra.communications : [],
    documents: {
      quotePdf: documentsExtra.quotePdf ?? row.quote_pdf_url ?? null,
      invoicePdf: documentsExtra.invoicePdf ?? row.invoice_pdf_url ?? null,
      receiptPdf: documentsExtra.receiptPdf ?? row.receipt_pdf_url ?? null,
    },
    review: {
      organizerReviewId: reviewExtra.organizerReviewId ?? null,
      vendorReviewId: reviewExtra.vendorReviewId ?? null,
      organizerRating: row.organizer_rating ?? reviewExtra.organizerRating ?? null,
      vendorRating: row.vendor_rating ?? reviewExtra.vendorRating ?? null,
    },
    createdAt: row.created_at ?? extra.createdAt,
    updatedAt: row.updated_at ?? extra.updatedAt,
    confirmedAt: row.confirmed_at ?? extra.confirmedAt,
    completedAt: row.completed_at ?? extra.completedAt,
    cancelledAt: row.cancelled_at ?? extra.cancelledAt,
  };
}

function mapToBooking(item: any): BookingData {
  if (!item) {
    throw new Error("Cannot map an empty or null object to BookingData.");
  }

  return {
    bookingId: item.bookingId || "",
    eventId: item.eventId || "",
    vendorId: item.vendorId || "",
    organizerId: item.organizerId || "",
    serviceType: item.serviceType || "",
    serviceId: item.serviceId || "",

    requirements: {
      description: item.requirements?.description || "",
      serviceDate: item.requirements?.serviceDate || "",
      startTime: item.requirements?.startTime || "",
      endTime: item.requirements?.endTime || "",
      location: item.requirements?.location || "",
      specialInstructions: item.requirements?.specialInstructions || "",
      guestCount: Number(item.requirements?.guestCount) || 0,
    },

    quote: {
      requestedAt: toDt(item.quote?.requestedAt) ?? new Date(),
      respondedAt: toDt(item.quote?.respondedAt),
      vendorQuote: item.quote?.vendorQuote
        ? {
            basePrice: Number(item.quote.vendorQuote.basePrice) || 0,
            additionalCharges: Array.isArray(item.quote.vendorQuote.additionalCharges)
              ? item.quote.vendorQuote.additionalCharges.map((ac: any) => ({
                  description: ac.description || "",
                  amount: Number(ac.amount) || 0,
                }))
              : [],
            discount: Number(item.quote.vendorQuote.discount) || 0,
            totalAmount: Number(item.quote.vendorQuote.totalAmount) || 0,
            breakdown: Array.isArray(item.quote.vendorQuote.breakdown)
              ? item.quote.vendorQuote.breakdown.map((b: any) => ({
                  item: b.item || "",
                  quantity: Number(b.quantity) || 0,
                  unitPrice: Number(b.unitPrice) || 0,
                  total: Number(b.total) || 0,
                }))
              : [],
            terms: item.quote.vendorQuote.terms || "",
            validity: item.quote.vendorQuote.validity || "",
          }
        : null,
      negotiation: Array.isArray(item.quote?.negotiation)
        ? item.quote.negotiation.map((msg: any) => ({
            from: msg.from === "vendor" ? "vendor" : "organizer",
            message: msg.message || "",
            timestamp: toDt(msg.timestamp) ?? new Date(),
          }))
        : [],
    },

    status: item.status || "quote_requested",
    statusHistory: Array.isArray(item.statusHistory)
      ? item.statusHistory.map((history: any) => ({
          status: history.status || "quote_requested",
          timestamp: toDt(history.timestamp) ?? new Date(),
        }))
      : [],

    contract: {
      signed: Boolean(item.contract?.signed),
      signedByOrganizer: item.contract?.signedByOrganizer || null,
      signedByVendor: item.contract?.signedByVendor || null,
      signedAt: item.contract?.signedAt || null,
      contractUrl: item.contract?.contractUrl || null,
      terms: {
        cancellationPolicy: item.contract?.terms?.cancellationPolicy || "",
        liability: item.contract?.terms?.liability || "",
      },
    },

    payment: {
      totalAmount: Number(item.payment?.totalAmount) || 0,
      currency: item.payment?.currency || "USD",
      paymentSchedule: Array.isArray(item.payment?.paymentSchedule)
        ? item.payment.paymentSchedule.map((p: any) => ({
            installment: p.installment || "",
            amount: Number(p.amount) || 0,
            dueDate: p.dueDate || "",
            status: ["pending", "paid", "failed", "refunded"].includes(p.status)
              ? p.status
              : "pending",
            paymentId: p.paymentId || null,
          }))
        : [],
      commission: {
        platformCommission: Number(item.payment?.commission?.platformCommission) || 0,
        platformCommissionPercentage:
          Number(item.payment?.commission?.platformCommissionPercentage) || 0,
        vendorReceives: Number(item.payment?.commission?.vendorReceives) || 0,
      },
    },

    delivery: {
      scheduledDate: item.delivery?.scheduledDate || "",
      scheduledTime: item.delivery?.scheduledTime || "",
      actualDeliveryTime: item.delivery?.actualDeliveryTime || null,
      deliveryNotes: item.delivery?.deliveryNotes || null,
      setupCompleted: Boolean(item.delivery?.setupCompleted),
      teardownCompleted: Boolean(item.delivery?.teardownCompleted),
    },

    qualityCheck: {
      organizerCheck: item.qualityCheck?.organizerCheck
        ? {
            checked: Boolean(item.qualityCheck.organizerCheck.checked),
            rating:
              item.qualityCheck.organizerCheck.rating !== undefined
                ? Number(item.qualityCheck.organizerCheck.rating)
                : null,
            comments: item.qualityCheck.organizerCheck.comments || null,
            checkedAt: item.qualityCheck.organizerCheck.checkedAt || null,
          }
        : null,
      vendorSelfCheck: item.qualityCheck?.vendorSelfCheck
        ? {
            completed: Boolean(item.qualityCheck.vendorSelfCheck.completed),
            report: item.qualityCheck.vendorSelfCheck.report || null,
          }
        : null,
    },

    communications: Array.isArray(item.communications)
      ? item.communications.map((comm: any) => ({
          type: comm.type || "chat",
          from: ["organizer", "vendor", "system"].includes(comm.from) ? comm.from : "system",
          to: ["organizer", "vendor", "system"].includes(comm.to) ? comm.to : "system",
          message: comm.message || "",
          timestamp: toDt(comm.timestamp) ?? new Date(),
        }))
      : [],
    documents: {
      quotePdf: item.documents?.quotePdf || null,
      invoicePdf: item.documents?.invoicePdf || null,
      receiptPdf: item.documents?.receiptPdf || null,
    },
    review: {
      organizerReviewId: item.review?.organizerReviewId || null,
      vendorReviewId: item.review?.vendorReviewId || null,
      organizerRating:
        item.review?.organizerRating !== undefined ? Number(item.review.organizerRating) : null,
      vendorRating:
        item.review?.vendorRating !== undefined ? Number(item.review.vendorRating) : null,
    },

    createdAt: toDt(item.createdAt) ?? new Date(),
    updatedAt: toDt(item.updatedAt) ?? new Date(),
    confirmedAt: toDt(item.confirmedAt),
    completedAt: toDt(item.completedAt),
    cancelledAt: toDt(item.cancelledAt),
  };
}

function bookingToRow(
  booking: BookingData,
  existingExtra: Record<string, any> = {},
): BookingUpdate & { id: string; event_id: string; organizer_id: string; vendor_id: string } {
  let status = String(booking.status || "quote_requested");
  // Match admin_db: in_progress is not a DB check value.
  if (status === "in_progress") status = "confirmed";

  const extra = {
    ...existingExtra,
    serviceId: booking.serviceId,
    bookingId: booking.bookingId,
    contract: booking.contract,
    payment: booking.payment,
    delivery: booking.delivery,
    qualityCheck: booking.qualityCheck,
    communications: booking.communications,
    documents: booking.documents,
    review: booking.review,
    quote: booking.quote,
    requirements: booking.requirements,
    statusHistory: booking.statusHistory,
    createdAt: toIso(booking.createdAt) ?? existingExtra.createdAt,
    updatedAt: toIso(booking.updatedAt) ?? new Date().toISOString(),
    confirmedAt: toIso(booking.confirmedAt),
    completedAt: toIso(booking.completedAt),
    cancelledAt: toIso(booking.cancelledAt),
  };

  return {
    id: booking.bookingId,
    event_id: booking.eventId,
    organizer_id: booking.organizerId,
    vendor_id: booking.vendorId,
    service_type: booking.serviceType || null,
    status,
    requirements: asJson(booking.requirements),
    quote: asJson(booking.quote),
    negotiation_messages: asJson(booking.quote?.negotiation ?? []),
    contract_signed: Boolean(booking.contract?.signed),
    contract_signed_at: toIso(booking.contract?.signedAt),
    contract_signed_by_organizer: booking.contract?.signedByOrganizer != null,
    contract_signed_by_vendor: booking.contract?.signedByVendor != null,
    contract_url: booking.contract?.contractUrl ?? null,
    scheduled_date: booking.delivery?.scheduledDate || null,
    scheduled_time: booking.delivery?.scheduledTime || null,
    setup_completed: Boolean(booking.delivery?.setupCompleted),
    teardown_completed: Boolean(booking.delivery?.teardownCompleted),
    actual_delivery_time: toIso(booking.delivery?.actualDeliveryTime),
    delivery_notes: booking.delivery?.deliveryNotes ?? null,
    platform_commission: Number(booking.payment?.commission?.platformCommission) || 0,
    platform_commission_pct: Number(booking.payment?.commission?.platformCommissionPercentage) || 0,
    vendor_receives: Number(booking.payment?.commission?.vendorReceives) || 0,
    total_amount: Number(booking.payment?.totalAmount) || 0,
    currency: booking.payment?.currency || "PKR",
    quote_pdf_url: booking.documents?.quotePdf ?? null,
    invoice_pdf_url: booking.documents?.invoicePdf ?? null,
    receipt_pdf_url: booking.documents?.receiptPdf ?? null,
    status_history: asJson(booking.statusHistory),
    organizer_rating: booking.review?.organizerRating ?? null,
    vendor_rating: booking.review?.vendorRating ?? null,
    created_at: toIso(booking.createdAt),
    updated_at: toIso(booking.updatedAt) ?? new Date().toISOString(),
    confirmed_at: toIso(booking.confirmedAt),
    completed_at: toIso(booking.completedAt),
    cancelled_at: toIso(booking.cancelledAt),
    extra: asJson(extra),
  };
}

/** Merge a partial camelCase patch into bookings.extra (+ optional column updates). */
export async function patchBookingFields(
  bookingId: string,
  columns: BookingUpdate,
  extraPatch?: Record<string, unknown>,
): Promise<void> {
  let extra: Json | undefined;
  if (extraPatch) {
    const { data, error } = await supabaseAdmin
      .from(TABLES.BOOKINGS)
      .select("extra")
      .eq("id", bookingId)
      .maybeSingle();
    if (error) throw error;
    const current = asRecord(data?.extra);
    extra = asJson({ ...current, ...extraPatch });
  }
  const { error } = await supabaseAdmin
    .from(TABLES.BOOKINGS)
    .update({
      ...columns,
      ...(extra !== undefined ? { extra } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId);
  if (error) throw error;
}

export const BookingServices = {
  async getBookingsOfOrganizer(organizerId: string) {
    const { data, error } = await supabaseAdmin
      .from(TABLES.BOOKINGS)
      .select("*")
      .eq("organizer_id", organizerId);
    if (error) throw error;
    if (!data?.length) return null;

    const arr_of_bookings = data.map((row) => mapToBooking(bookingRowToItem(row)));

    const vendor_unique_ids = [...new Set(arr_of_bookings.map((x) => x.vendorId).filter(Boolean))];
    const event_unique_ids = [...new Set(arr_of_bookings.map((x) => x.eventId).filter(Boolean))];

    const [vendors_from_db, eventsRes] = await Promise.all([
      EventVendorService.getVendorsByIds(vendor_unique_ids),
      event_unique_ids.length
        ? supabaseAdmin
            .from(TABLES.EVENTS)
            .select("id, title, start_date")
            .in("id", event_unique_ids)
        : Promise.resolve({
            data: [] as { id: string; title: string | null; start_date: string | null }[],
            error: null,
          }),
    ]);
    if (eventsRes.error) throw eventsRes.error;

    const vendors_map = new Map(vendors_from_db.map((v) => [v.vendorId, v]));
    const events_map = new Map(
      (eventsRes.data ?? []).map((e) => [
        e.id,
        {
          id: e.id,
          title: e.title || "Unknown Event",
          schedule: { startDate: e.start_date || "No date mentioned" },
        },
      ]),
    );

    return arr_of_bookings.map((booking) => {
      const vendor = vendors_map.get(booking.vendorId);
      const event = events_map.get(booking.eventId);

      return {
        bookingId: booking.bookingId,
        requirements: {
          serviceDate: booking.requirements.serviceDate,
          description: booking.requirements.description,
        },
        quote: booking.quote
          ? {
              vendorQuote: {
                totalAmount: booking.quote.vendorQuote?.totalAmount,
              },
            }
          : undefined,

        vendor: vendor
          ? {
              vendorId: vendor.vendorId,
              businessName: vendor.businessName,
              serviceCategories: vendor.serviceCategories,
            }
          : {
              vendorId: "unknown",
              businessName: "Unknown Vendor",
              serviceCategories: [],
            },

        eventName: event ? event.title : "Unknown Event",
        eventDate: event ? event.schedule.startDate : "No date mentioned",

        status: booking.status,
      };
    });
  },

  async getBookingById(booking_id: string) {
    const { data, error } = await supabaseAdmin
      .from(TABLES.BOOKINGS)
      .select("*")
      .eq("id", booking_id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return mapToBooking(bookingRowToItem(data));
  },

  async getAllBookingsOfOrganizer(organizerId: String) {
    const { data, error } = await supabaseAdmin
      .from(TABLES.BOOKINGS)
      .select("*")
      .eq("organizer_id", String(organizerId));
    if (error) throw error;
    if (!data?.length) return null;
    return data.map((row) => mapToBooking(bookingRowToItem(row)));
  },

  async getAllBookingsOfVendor(vendorId: String) {
    const { data, error } = await supabaseAdmin
      .from(TABLES.BOOKINGS)
      .select("*")
      .eq("vendor_id", String(vendorId));
    if (error) throw error;
    if (!data?.length) return null;
    return data.map((row) => mapToBooking(bookingRowToItem(row)));
  },

  async createBookingFromForm(
    formData: FormData,
    organizerId: string,
    eventId: string = "",
    vendorId: string = "",
  ) {
    const id_generated = randomUUID();
    const now = new Date();

    const serviceType = ((formData.get("serviceType") as string) || "").trim();
    const serviceId = (
      (formData.get("serviceId") as string) ||
      (formData.get("serviceName") as string) ||
      ""
    ).trim();
    const description = (formData.get("requirementsDescription") as string) || "";
    const rawServiceDate = (formData.get("serviceDate") as string) || "";
    const rawStartTime = (formData.get("startTime") as string) || "";
    const serviceDate = rawServiceDate ? formatDate(rawServiceDate) : "";
    const startTime = rawStartTime ? formatTime(rawStartTime) : "";

    const baseBudget = Number(formData.get("budget")) || 50000;
    const platformCommissionPct = 15;
    const commissionAmount = (baseBudget * platformCommissionPct) / 100;

    const booking_object: BookingData = {
      bookingId: id_generated,
      eventId: eventId,
      vendorId: vendorId,
      organizerId: organizerId,
      serviceType: serviceType,
      serviceId: serviceId,

      requirements: {
        description: description,
        serviceDate: serviceDate,
        startTime: startTime,
        endTime: "",
        location: "",
        specialInstructions: "Quote request generated via client RFQ dashboard.",
        guestCount: 0,
      },

      quote: {
        requestedAt: now,
        respondedAt: null,
        vendorQuote: null,
        negotiation: [],
      },

      status: "quote_requested",
      statusHistory: [
        {
          status: "quote_requested",
          timestamp: now,
        },
      ],

      contract: {
        signed: false,
        signedByOrganizer: null,
        signedByVendor: null,
        signedAt: null,
        contractUrl: null,
        terms: {
          cancellationPolicy: "Standard vendor profile policy applies.",
          liability: "Standard marketplace terms apply.",
        },
      },

      payment: {
        totalAmount: baseBudget,
        currency: "PKR",
        paymentSchedule: [],
        commission: {
          platformCommission: commissionAmount,
          platformCommissionPercentage: platformCommissionPct,
          vendorReceives: baseBudget - commissionAmount,
        },
      },

      delivery: {
        scheduledDate: serviceDate,
        scheduledTime: startTime,
        actualDeliveryTime: null,
        deliveryNotes: null,
        setupCompleted: false,
        teardownCompleted: false,
      },

      qualityCheck: {
        organizerCheck: null,
        vendorSelfCheck: null,
      },

      communications: [],
      documents: {
        quotePdf: null,
        invoicePdf: null,
        receiptPdf: null,
      },

      review: {
        organizerReviewId: null,
        vendorReviewId: null,
        organizerRating: null,
        vendorRating: null,
      },

      createdAt: now,
      updatedAt: now,
      confirmedAt: null,
      completedAt: null,
      cancelledAt: null,
    };

    const row = bookingToRow(booking_object);
    const { error } = await supabaseAdmin.from(TABLES.BOOKINGS).insert(row);
    if (error) throw error;

    await NotificationServices.createNotification({
      userId: vendorId,
      type: "vendor_quote",
      title: "New quote request",
      message: `An organizer requested a quote for ${serviceType || "a service"} (budget Rs ${baseBudget.toLocaleString()}).`,
      deepLink: `/vendor/${vendorId}/quotes/${id_generated}`,
    });
  },

  async update_booking(updated_booking: BookingData | null) {
    if (!updated_booking) {
      return;
    }
    const { data: existing, error: readErr } = await supabaseAdmin
      .from(TABLES.BOOKINGS)
      .select("extra")
      .eq("id", updated_booking.bookingId)
      .maybeSingle();
    if (readErr) throw readErr;

    const row = bookingToRow(updated_booking, asRecord(existing?.extra));
    const { id, ...patch } = row;
    const { error } = await supabaseAdmin.from(TABLES.BOOKINGS).update(patch).eq("id", id);
    if (error) throw error;

    const paidInstallment = updated_booking.payment?.paymentSchedule?.some(
      (s) => String(s.status).toLowerCase() === "paid",
    );
    if (paidInstallment || String(updated_booking.status).toLowerCase() === "confirmed") {
      await recordPayment({
        payerId: updated_booking.organizerId,
        receiverId: updated_booking.vendorId,
        purpose: "vendor_booking",
        referenceType: "booking",
        referenceId: updated_booking.bookingId,
        totalAmount: Number(updated_booking.payment?.totalAmount ?? 0),
        status: "verified",
      });
    }
  },
};
