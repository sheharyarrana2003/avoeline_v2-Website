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
    logo: string;
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

export class Vendor implements VendorData {
    public vendorId: string;
    public userId: string;
    public businessName: string;
    public logo: string;
    public contact: Contact;
    public serviceCategories: string[];
    public portfolio: any; 
    public pricingPackages: PricingPackage[];
    public ratings: Ratings;
    public stats: any;    
    public verification: {
        verified: boolean;
        verificationMethod: string;
        verifiedAt: string;
        verificationBadges: string[];
    };
    public settings: any;
    public status: string;
    public featured: boolean;
    public createdAt: string;
    public updatedAt: string;
    public lastActive: string;

    /**
     * Initializes a brand-new Vendor profile layout during the authentication / role selection flow.
     */
    constructor(userId: string, email: string, businessName: string) {
        const currentIsoString = new Date().toISOString();

        this.vendorId = `${userId}`;
        this.userId = userId;
        this.businessName = businessName;
        this.logo = "";
        this.serviceCategories = [];
        this.pricingPackages = [];
        this.status = 'active';
        this.featured = false;
        
        this.createdAt = currentIsoString;
        this.updatedAt = currentIsoString;
        this.lastActive = currentIsoString;

        // Structured Contact data block mapping your schema
        this.contact = {
            primaryPhone: '',
            secondaryPhone: '',
            businessEmail: email,
            website: '',
            address: {
                street: '',
                city: '',
                country: 'Pakistan',
                coordinates: { lat: 0, lng: 0 }
            }
        };

        // Complete instantiation structure for the 'any' portfolio property
        this.portfolio = {
            images: [],
            videos: [],
            clientTestimonials: [],
            pastEvents: []
        };

        // Complete initialization structure for the 'ratings' property
        this.ratings = {
            averageRating: 5.0,
            totalReviews: 0,
            breakdown: { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 }
        };

        // Complete structural layout for the 'any' stats property
        this.stats = {
            totalBookings: 0,
            completedBookings: 0,
            cancellationRate: 0.0,
            repeatClients: 0,
            totalRevenue: 0,
            avgResponseTime: 'Under 2 hours'
        };

        // Structure matching verification criteria
        this.verification = {
            verified: false,
            verificationMethod: 'manual_review',
            verifiedAt: '',
            verificationBadges: []
        };

        // Complete structural template layout for 'any' settings context
        this.settings = {
            autoAcceptQuotes: false,
            commissionRate: 15,
            notificationPreferences: {
                newQuotes: true,
                bookingConfirmations: true,
                paymentReceipts: true,
                reviews: true
            }
        };
    }

    /**
     * Serializes class state tracking parameters down into a clean, simple flat 
     * JavaScript map format to allow native writes to standard Firestore documents.
     */
    public toFirestoreObject(): Record<string, any> {
        return {
            vendorId: this.vendorId,
            userId: this.userId,
            businessName: this.businessName,
            logo: this.logo,
            contact: this.contact,
            serviceCategories: this.serviceCategories,
            portfolio: this.portfolio,
            pricingPackages: this.pricingPackages,
            ratings: this.ratings,
            stats: this.stats,
            verification: this.verification,
            settings: this.settings,
            status: this.status,
            featured: this.featured,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            lastActive: this.lastActive
        };
    }
}