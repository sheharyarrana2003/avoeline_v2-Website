import { cache } from "react";
import { VendorData, Contact, Address, PricingPackage, Ratings } from "@/src/services/models/vendor.model"
import { BookingData } from "../bookings/types";
import {  adminDb } from "@/data/admin_db";
import { QuerySnapshot } from "firebase-admin/firestore";
import { COLLECTIONS } from "@/data/collections";


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
        customizationOptions: Array.isArray(raw?.customizationOptions) ? raw.customizationOptions : []
    };
}


export function mapToRatings(raw: any): Ratings {
    return {
        averageRating: Number(raw?.averageRating) || 0,
        totalReviews: Number(raw?.totalReviews) || 0,
        breakdown: raw?.breakdown || {}
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
        portfolio: raw?.portfolio || {},

        pricingPackages: Array.isArray(raw?.pricingPackages)
            ? raw.pricingPackages.map(mapToPricingPackage)
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

        status: raw?.status || "inactive",
        featured: Boolean(raw?.featured),

        createdAt: raw?.createdAt || new Date().toISOString(),
        updatedAt: raw?.updatedAt || new Date().toISOString(),
        lastActive: raw?.lastActive || new Date().toISOString(),
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
        //now have many bookings -> eahc having vendorid -> extracat their corrrespoding vecator

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

        const querySnapshot : QuerySnapshot= await q.get();
        if (querySnapshot.empty) {
            return null;
        }
        let arr_of_vendors: VendorData[] = [];

        querySnapshot.forEach(x => {
            arr_of_vendors.push(mapToVendorData(x.data(), x.id));
        })
        return arr_of_vendors;
    }
}