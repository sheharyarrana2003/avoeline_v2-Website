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

export interface Service {
    serviceId: string;
    name: string;
    description: string;
    category: string;
    inclusions: string[];
    price: number;
    minOrder: number;
    images?: string[];
    videos?: string[];
}

export interface Ratings {
    averageRating: number;
    totalReviews: number;
    breakdown: Record<string, number>;
}

export interface PortfolioImage {
    url: string;
    caption: string;
    eventType: string;
    date: string;
}

export interface ClientTestimonial {
    clientName: string;
    testimonial: string;
    rating: number;
    eventDate: string;
}

export interface VendorPortfolio {
    images: PortfolioImage[];
    videos: string[];
    clientTestimonials: ClientTestimonial[];
    pastEvents: string[];
    /** Not part of the base schema, but written by the cover-image upload. */
    coverImage?: string;
}

export interface VendorData {
    vendorId: string;
    userId: string;
    businessName: string;
    logo: string;
    contact: Contact;
    serviceCategories: string[];
    portfolio: VendorPortfolio;
    pricingPackages: PricingPackage[];
    services: Service[]; // Added to match Service interface
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
    createdAt: Date | string;
    updatedAt: Date | string;
    lastActive: Date | string;
}

export class Vendor implements VendorData {
    public vendorId: string;
    public userId: string;
    public businessName: string;
    public logo: string;
    public contact: Contact;
    public serviceCategories: string[];
    public portfolio: VendorPortfolio;
    public pricingPackages: PricingPackage[];
    public services: Service[]; // Added property declaration
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
    public createdAt: Date | string;
    public updatedAt: Date | string;
    public lastActive: Date | string;

    /**
     * Initializes a brand-new Vendor profile layout during the authentication / role selection flow.
     */
    constructor(userId: string, email: string, businessName: string) {
        const now = new Date();

        this.vendorId = `${userId}`;
        this.userId = userId;
        this.businessName = businessName;
        this.logo = "";
        this.serviceCategories = [];
        this.pricingPackages = [];
        this.services = []; // Initialized as empty array
        // Spec 9.6: a new application waits for an admin. This used to be
        // 'active', which meant every vendor was bookable the moment they
        // signed up and made "Approve/Reject new vendor applications"
        // impossible to express. Existing documents already carry 'active' and
        // are unaffected.
        this.status = 'pending';
        this.featured = false;
        
        this.createdAt = now;
        this.updatedAt = now;
        this.lastActive = now;

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

        // Complete instantiation structure for the portfolio property
        this.portfolio = {
            images: [],
            videos: [],
            clientTestimonials: [],
            pastEvents: [],
            coverImage: ""
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
            services: this.services, // Added to Firestore payload
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