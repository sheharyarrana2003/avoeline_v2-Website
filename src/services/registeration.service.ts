import { adminAuth, adminDb } from "@/data/admin_db";
import { Registration } from "./models/reg.type";
import { QuerySnapshot } from "firebase-admin/firestore";


 function mapToRegistration(raw: any): Registration {
  if (!raw) {
    throw new Error("Cannot map an empty or undefined raw object to Registration");
  }

  return {
    registrationId: String(raw.registrationId || ""),
    eventId: String(raw.eventId || ""),
    userId: String(raw.userId || ""),
    organizerId: String(raw.organizerId || ""),
    registrationDate: String(raw.registrationDate || new Date().toISOString()),
    registrationSource: raw.registrationSource || "web",
    status: raw.status || "pending",
    
    statusHistory: Array.isArray(raw.statusHistory)
      ? raw.statusHistory.map((h: any) => ({
          status: h.status || "pending",
          timestamp: String(h.timestamp || new Date().toISOString()),
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
      checkInTime: raw.checkIn?.checkInTime ?? null,
      checkInMethod: raw.checkIn?.checkInMethod ?? null,
      checkedInBy: raw.checkIn?.checkedInBy ?? null,
      deviceId: raw.checkIn?.deviceId ?? null,
    },

    qrCode: {
      data: String(raw.qrCode?.data || ""),
      imageUrl: String(raw.qrCode?.imageUrl || ""),
      scanCount: Number(raw.qrCode?.scanCount ?? 0),
      lastScanned: raw.qrCode?.lastScanned ?? null,
    },

    certificate: {
      issued: Boolean(raw.certificate?.issued ?? false),
      certificateId: raw.certificate?.certificateId ?? null,
      issueDate: raw.certificate?.issueDate ?? null,
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

    createdAt: String(raw.createdAt || new Date().toISOString()),
    updatedAt: String(raw.updatedAt || new Date().toISOString()),
    cancelledAt: raw.cancelledAt ?? null,
  };
}
export const RegService = {
    async getRegOfUser(user_id:string){
        const q = adminDb.collection("registeration").where("userId","==",user_id);
        const querySnapshot :  QuerySnapshot= await q.get();

        // if(querySnapshot.empty()){
        //     return null;
        // }

        return  mapToRegistration(querySnapshot.docs[0].data());

    }
}