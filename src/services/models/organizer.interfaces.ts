// organizer.model.ts

export type OrganizationType = 'individual' | 'company' | 'university' | 'nonprofit';
export type PayoutScheduleType = 'weekly' | 'biweekly' | 'monthly';
export type VerificationLevelType = 'bronze' | 'silver' | 'gold' | 'platinum';
export type SubscriptionPlanType = 'free' | 'pro' | 'enterprise';

export interface ICoordinates {
  lat: number;
  lng: number;
}

export interface IOrganizationDetails {
  type: OrganizationType;
  name: string;
  registrationNumber?: string; // Optional depending on 'individual' type
  taxNumber?: string;          // Optional (e.g., NTN)
  establishedYear: number;
  description: string;
  logo: string;
  coverImage: string;
}

export interface ISocialMedia {
  facebook?: string;
  instagram?: string;
  linkedin?: string;
  twitter?: string;
}

export interface IContactInfo {
  primaryEmail: string;
  primaryPhone: string;
  secondaryPhone?: string;
  website?: string;
  socialMedia: ISocialMedia;
}

export interface IAddress {
  officeAddress: string;
  city: string;
  country: string;
  coordinates: ICoordinates;
}

export interface IBankingDetails {
  bankName: string;
  accountTitle: string;
  accountNumber: string;
  iban: string;
  paymentMethods: string[]; // e.g., ["bank_transfer", "jazzcash", "easypaisa"]
  payoutSchedule: PayoutScheduleType;
  minimumPayout: number;
}

export interface IEventStats {
  totalEventsCreated: number;
  publishedEvents: number;
  upcomingEvents: number;
  completedEvents: number;
  cancelledEvents: number;
  totalAttendees: number;
  averageAttendeesPerEvent: number;
  totalRevenue: number;
  averageRating: number;
}

export interface IVendorStats {
  totalVendorsHired: number;
  repeatVendors: number;
  averageVendorRating: number;
  totalSpentOnVendors: number;
}

export interface IVerificationDocuments {
  businessRegistration?: string;
  taxCertificate?: string;
  identityProof?: string;
}

export interface IVerificationDetails {
  isVerified: boolean;
  verificationLevel: VerificationLevelType;
  verifiedAt?: Date;
  verifiedBy?: string;
  documents: IVerificationDocuments;
  badges: string[];
}

export interface IDefaultEventSettings {
  certificateTemplate: string;
  reminderDays: number[];
  allowWaitlist: boolean;
  requireApproval: boolean;
}

export interface INotificationPreferences {
  newRegistrations: boolean;
  newVendorQuotes: boolean;
  paymentReceived: boolean;
  eventReminders: boolean;
}

export interface IOrganizerSettings {
  autoPublishEvents: boolean;
  defaultEventSettings: IDefaultEventSettings;
  notificationPreferences: INotificationPreferences;
}

export interface ISubscriptionPlan {
  type: SubscriptionPlanType;
  features: string[];
  expiresAt: Date;
  autoRenew: boolean;
}

// Main Organizer Interface matching your schema
export interface IOrganizer {
  organizerId: string;
  userId: string;
  organization: IOrganizationDetails;
  contact: IContactInfo;
  address: IAddress;
  banking: IBankingDetails;
  eventStats: IEventStats;
  vendorStats: IVendorStats;
  verification: IVerificationDetails;
  settings: IOrganizerSettings;
  plan: ISubscriptionPlan;
  createdAt: Date;
  updatedAt: Date;
  lastActive: Date;
}
