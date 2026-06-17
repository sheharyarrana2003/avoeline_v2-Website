import { mockBookings } from "@/app/mockdata/bookings.mock";
import { mockVendors } from "@/app/mockdata/vendors.mock";
import { VendorData, Contact, Address, PricingPackage, Ratings } from "@/src/services/models/vendor.model"

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
    getVendors: async (eventId : string): Promise<VendorData[]> => {
        //! hardcoded
        //! replace it  
        const vendors_from_bookings : string[] = mockBookings.filter((b) => b.eventId).map((b) => b.vendorId);
        const raw_vendor_objects = mockVendors.filter((v) => vendors_from_bookings.includes(v.vendorId));
        const actual_vendor_objects = raw_vendor_objects.map((x) => mapToVendorData(x) );
        return actual_vendor_objects;
            
    },
    async getVendorById(vendor_id : string){
        return mockVendors.find(v=>v.vendorId === vendor_id );

    },
    async getAllVendors(){
        return mockVendors;
    }
}