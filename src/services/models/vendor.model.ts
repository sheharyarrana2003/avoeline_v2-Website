export interface Address {
    street: string;
    city: string;
    country: string;
    coordinates: { lat: number; lng: number };
}

export interface Contact {
    primaryPhone: string;
    secondaryPhone: string;
    businessEmail: string;
    website: string;
    address: Address;
}

export interface PricingPackage {
    packageId: string;
    name: string;
    description: string;
    inclusions: string[];
    price: number;
    minOrder: number;
    customizationOptions: string[];
}

export interface Ratings {
    averageRating: number;
    totalReviews: number;
    breakdown: Record<string, number>;
}

export interface VendorData {
    vendorId: string;
    userId: string;
    businessName: string;
    contact: Contact;
    serviceCategories: string[];
    portfolio: any; 
    pricingPackages: PricingPackage[];
    ratings: Ratings;
    stats: any;    
    verification: {
        verified: boolean;
        verificationMethod: string;
        verifiedAt: string;
        verificationBadges: string[];
    };
    settings: any;
    status: string;
    featured: boolean;
    createdAt: string;
    updatedAt: string;
    lastActive: string;
}

