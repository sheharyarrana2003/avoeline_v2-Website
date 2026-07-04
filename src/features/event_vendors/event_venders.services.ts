import { mockBookings } from "@/app/mockdata/bookings.mock";
import { mockVendors } from "@/app/mockdata/vendors.mock";
import { VendorData, Contact, Address, PricingPackage, Ratings } from "@/src/services/models/vendor.model"
import { doc, setDoc, query, where, getDocs, collection } from 'firebase/firestore';
import { auth, db } from '@/data/db'


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

export function mapToVendorData(raw: any): VendorData {
    return {
        vendorId: raw?.vendorId || "",
        userId: raw?.userId || "",
        businessName: raw?.businessName || "",

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
    getVendorsByEvent: async (eventId: string): Promise<VendorData[]> => {

        let arr_of_vendors: VendorData[] = [];
        const q = query(
            collection(db, "bookings"),
            where("eventId", "==", eventId)
        )

        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            return arr_of_vendors;
        }

        querySnapshot.forEach(x => {
            arr_of_vendors.push(mapToVendorData(x.data()));
        })

        const arr_of_vendors_active = arr_of_vendors.filter(x => x.stats === "confirmed" || "in_progress" || "completed")
        return arr_of_vendors_active;
    },
        getVendorsByOrganizer: async (organizerId: string): Promise<VendorData[]> => {

        let arr_of_vendors: VendorData[] = [];
        const q = query(
            collection(db, "bookings"),
            where("organizerId", "==", organizerId)
        )

        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            return arr_of_vendors;
        }

        querySnapshot.forEach(x => {
            arr_of_vendors.push(mapToVendorData(x.data()));
        })

        const arr_of_vendors_active = arr_of_vendors.filter(x => x.stats === "confirmed" || "in_progress" || "completed")
        return arr_of_vendors_active;
    },

    async getVendorById(vendor_id: string) {
        const q = query(
            collection(db, "vendors"),
            where("vendorId", "==", vendor_id)
        )
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            return null;
        }
        return querySnapshot.docs[0].data();

    },
    async getAllVendors() {
        const q = query(
            collection(db, "vendors")
        )
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            return null;
        }
        let arr_of_vendors: VendorData[] = [];

        querySnapshot.forEach(x => {
            arr_of_vendors.push(mapToVendorData(x.data()));
        })
        return arr_of_vendors;
    }
}