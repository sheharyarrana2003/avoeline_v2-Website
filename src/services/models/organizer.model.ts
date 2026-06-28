// organizer.model.ts
import { IOrganizer, IOrganizationDetails, IContactInfo, IAddress, IBankingDetails, IEventStats, IVendorStats, IVerificationDetails, IOrganizerSettings, ISubscriptionPlan } from './organizer.interfaces';

export class Organizer implements IOrganizer{
  public organizerId: string;
  public userId: string;
  public organization: IOrganizationDetails;
  public contact: IContactInfo;
  public address: IAddress;
  public banking: IBankingDetails;
  public eventStats: IEventStats;
  public vendorStats: IVendorStats;
  public verification: IVerificationDetails;
  public settings: IOrganizerSettings;
  public plan: ISubscriptionPlan;
  public createdAt: Date;
  public updatedAt: Date;
  public lastActive: Date;

  // 2. The Constructor sets up the default "Empty/New" profile state for a new signup
  constructor(userId: string, email: string, organizationName: string) {
    this.organizerId = `O_${userId}`; // Or use a UUID generator
    this.userId = userId;
    
    // Set default values for a brand new account so the document structure matches perfectly
    this.organization = {
      type: 'individual',
      name: organizationName,
      establishedYear: new Date().getFullYear(),
      description: '',
      logo: '',
      coverImage: ''
    };

    this.contact = {
      primaryEmail: email,
      primaryPhone: '',
      socialMedia: {}
    };

    this.address = {
      officeAddress: '',
      city: '',
      country: 'Pakistan',
      coordinates: { lat: 0, lng: 0 }
    };

    this.banking = {
      bankName: '',
      accountTitle: '',
      accountNumber: '',
      iban: '',
      paymentMethods: [],
      payoutSchedule: 'weekly',
      minimumPayout: 5000
    };

    // New signups start at zero stats
    this.eventStats = { totalEventsCreated: 0, publishedEvents: 0, upcomingEvents: 0, completedEvents: 0, cancelledEvents: 0, totalAttendees: 0, averageAttendeesPerEvent: 0, totalRevenue: 0, averageRating: 5.0 };
    this.vendorStats = { totalVendorsHired: 0, repeatVendors: 0, averageVendorRating: 0, totalSpentOnVendors: 0 };

    this.verification = {
      isVerified: false,
      verificationLevel: 'bronze',
      documents: {},
      badges: []
    };

    this.settings = {
      autoPublishEvents: false,
      defaultEventSettings: { certificateTemplate: 'template_01', reminderDays: [7, 1], allowWaitlist: true, requireApproval: false },
      notificationPreferences: { newRegistrations: true, newVendorQuotes: true, paymentReceived: true, eventReminders: true }
    };

    this.plan = {
      type: 'free',
      features: [],
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year expiry for free tier
      autoRenew: false
    };

    this.createdAt = new Date();
    this.updatedAt = new Date();
    this.lastActive = new Date();
  }

  public toFirestoreObject(): Record<string, any> {
    return {
      organizerId: this.organizerId,
      userId: this.userId,
      organization: this.organization,
      contact: this.contact,
      address: this.address,
      banking: this.banking,
      eventStats: this.eventStats,
      vendorStats: this.vendorStats,
      verification: this.verification,
      settings: this.settings,
      plan: this.plan,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      lastActive: this.lastActive,
    };
  }
}