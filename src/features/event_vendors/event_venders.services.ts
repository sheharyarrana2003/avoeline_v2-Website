import { cache } from "react";
import { VendorData, Contact,Service, Address, PricingPackage, Ratings, VendorPortfolio, PortfolioImage, ClientTestimonial } from "@/src/services/models/vendor.model"
import { BookingData } from "../bookings/types";
import { adminDb } from "@/data/admin_db";
import { QuerySnapshot } from "firebase-admin/firestore";
import { COLLECTIONS } from "@/data/collections";
import { vendorIsBookable } from "@/src/features/admin/types";

// Normalize a stored timestamp (Firebase Timestamp | ISO string | Date) to a
// Date so it round-trips as a Timestamp on whole-object vendor updates.
function toDt(v: any): Date {
    if (v && typeof v.toDate === "function") return v.toDate();
    const d = v ? new Date(v) : new Date();
    return isNaN(d.getTime()) ? new Date() : d;
}

export function mapToAddress(raw: any): Address {
    return {
        street: raw?.street || "",
        city: raw?.city || "",
        country: raw?.country || "",
        coordinates: {
            lat: raw?.coordinates?.lat || 0,
            lng: raw?.coordinates?.lng || 0,
        }
    };
}

export function mapToContact(raw: any): Contact {
    return {
        primaryPhone: raw?.primaryPhone || "",
        secondaryPhone: raw?.secondaryPhone || "",
        businessEmail: raw?.businessEmail || "",
        website: raw?.website || "",
        address: mapToAddress(raw?.address) // Utilizes the Address helper
    };
}

export function mapToPricingPackage(raw: any): PricingPackage {
    return {
        packageId: raw?.packageId || "",
        name: raw?.name || "",
        description: raw?.description || "",
        inclusions: Array.isArray(raw?.inclusions) ? raw.inclusions : [],
        price: Number(raw?.price) || 0,
        minOrder: Number(raw?.minOrder) || 0,
        customizationOptions: Array.isArray(raw?.customizationOptions) ? raw.customizationOptions : [],
    };
}

export function mapToService(raw: any): Service {
    return {
        serviceId: raw?.serviceId || "",
        name: raw?.name || "",
        description: raw?.description || "",
        category: raw?.category || "",
        inclusions: Array.isArray(raw?.inclusions) ? raw.inclusions : [],
        price: Number(raw?.price) || 0,
        minOrder: Number(raw?.minOrder) || 0,
        images: Array.isArray(raw?.images) ? raw.images : [],
        videos: Array.isArray(raw?.videos) ? raw.videos : [],
    };
}

export function mapToRatings(raw: any): Ratings {
    const totalReviews = Number(raw?.totalReviews) || 0;
    return {
        // A rating with no reviews behind it is not a rating. The vendor model seeds
        // averageRating at 5.0 and only reviewVendor recomputes it, so every vendor
        // who has never been reviewed carries a stored 5.0 — and every screen that
        // read this field advertised a perfect score for them.
        //
        // Fixing it here rather than in the model default is deliberate: this also
        // corrects the documents already carrying 5.0, which a changed default would
        // not, and it means no screen has to remember the rule.
        averageRating: totalReviews > 0 ? Number(raw?.averageRating) || 0 : 0,
        totalReviews,
        breakdown: raw?.breakdown || {}
    };
}

export function mapToPortfolio(raw: any): VendorPortfolio {
    const images: PortfolioImage[] = Array.isArray(raw?.images)
        ? raw.images.map((img: any) => ({
            url: img?.url || "",
            caption: img?.caption || "",
            eventType: img?.eventType || "",
            date: img?.date || "",
        }))
        : [];

    const clientTestimonials: ClientTestimonial[] = Array.isArray(raw?.clientTestimonials)
        ? raw.clientTestimonials.map((t: any) => ({
            clientName: t?.clientName || "",
            testimonial: t?.testimonial || "",
            rating: Number(t?.rating) || 0,
            eventDate: t?.eventDate || "",
        }))
        : [];

    return {
        images,
        videos: Array.isArray(raw?.videos) ? raw.videos.filter((v: any) => typeof v === "string") : [],
        clientTestimonials,
        pastEvents: Array.isArray(raw?.pastEvents) ? raw.pastEvents.filter((e: any) => typeof e === "string") : [],
        coverImage: raw?.coverImage || "",
    };
}

export function mapToVendorData(raw: any, fallbackId: string = ""): VendorData {
    return {
        // Fall back to the Firestore doc id so vendorId is never empty (empty ids
        // collide as React keys in vendor lists).
        vendorId: raw?.vendorId || fallbackId,
        userId: raw?.userId || "",
        businessName: raw?.businessName || "",
        logo: raw?.logo || "",

        contact: mapToContact(raw?.contact),

        serviceCategories: Array.isArray(raw?.serviceCategories) ? raw.serviceCategories : [],
        portfolio: mapToPortfolio(raw?.portfolio),

        pricingPackages: Array.isArray(raw?.pricingPackages)
            ? raw.pricingPackages.map(mapToPricingPackage)
            : [],

        services: Array.isArray(raw?.services)
            ? raw.services.map(mapToService)
            : [],

        ratings: mapToRatings(raw?.ratings),

        stats: raw?.stats || {},
        settings: raw?.settings || {},

        verification: {
            verified: Boolean(raw?.verification?.verified),
            verificationMethod: raw?.verification?.verificationMethod || "unknown",
            verifiedAt: raw?.verification?.verifiedAt || "",
            verificationBadges: Array.isArray(raw?.verification?.verificationBadges)
                ? raw.verification.verificationBadges
                : []
        },

        // A document with no status predates vendor approval: it was bookable
        // before the field existed, so it stays bookable. A new signup gets
        // "pending" explicitly from the Vendor constructor -- only a legacy
        // document lands here.
        status: raw?.status || "active",
        featured: Boolean(raw?.featured),

        createdAt: toDt(raw?.createdAt),
        updatedAt: toDt(raw?.updatedAt),
        lastActive: toDt(raw?.lastActive),
    };
}

export const EventVendorService = {
    getVendorsByEvent: async (eventId: string) => {
        let arr_of_bookings: BookingData[] = [];

        const q = adminDb.
            collection(COLLECTIONS.BOOKINGS).
            where("eventId", "==", eventId)

        const querySnapshot : QuerySnapshot = await q.get();
        if (querySnapshot.empty) {
            return null;
        }
        arr_of_bookings = querySnapshot.docs.map(doc => ({
            bookingId: doc.id,
            ...doc.data()
        })) as BookingData[];

        const validStatuses = ["confirmed", "in_progress", "completed"];
        const arr_of_bookings_active = arr_of_bookings.filter(x =>
            validStatuses.includes(x.status)
        );

        const vendorIds = [...new Set(arr_of_bookings_active.map(b => b.vendorId).filter(Boolean))];
        const max_num_firebase_allows = 30;

        // Split the vendor ids into Firestore's max 30-per-"in"-query chunks and
        // fetch all chunks in parallel instead of one sequential round-trip each.
        const chunks: string[][] = [];
        for (let i = 0; i < vendorIds.length; i += max_num_firebase_allows) {
            chunks.push(vendorIds.slice(i, i + max_num_firebase_allows));
        }

        const snapshots: QuerySnapshot[] = await Promise.all(
            chunks.map(chunk =>
                adminDb.collection(COLLECTIONS.VENDORS).where("vendorId", "in", chunk).get()
            )
        );

        const arr_of_vendors_active: VendorData[] = [];
        snapshots.forEach((snap) => {
            snap.forEach((x) => {
                arr_of_vendors_active.push(mapToVendorData(x.data(), x.id));
            });
        });

        return arr_of_vendors_active;
    },

    getVendorById: cache(async (vendor_id: string) => {
        // Only the first match is used, so cap the read at one document.
        const q = adminDb.
            collection(COLLECTIONS.VENDORS).
            where("vendorId", "==", vendor_id).
            limit(1)

        const querySnapshot = await q.get();

        if (querySnapshot.empty) {
            return null;
        }
        const data = querySnapshot.docs[0].data();
        return mapToVendorData(data, querySnapshot.docs[0].id);

    }),

    async getAllVendors() {
        // Cap the marketplace read instead of pulling the entire vendors
        // collection every load. Raise the limit or paginate when needed.
        const q = adminDb.
            collection(COLLECTIONS.VENDORS).
            limit(60)

        const querySnapshot : QuerySnapshot = await q.get();
        if (querySnapshot.empty) {
            return null;
        }
        let arr_of_vendors: VendorData[] = [];

        querySnapshot.forEach(x => {
            arr_of_vendors.push(mapToVendorData(x.data(), x.id));
        })

        // Spec 9.6: only an approved vendor is bookable. Until this line the
        // marketplace showed whatever was in the collection, so a rejected or
        // suspended vendor stayed bookable and "approval status" was a field
        // nobody read. Filtered here rather than in the query because the
        // status of legacy documents is normalized on read, not in Firestore.
        return arr_of_vendors.filter((v: VendorData) => vendorIsBookable(v.status));
    }
}