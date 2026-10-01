export interface UserProfile {
  fullName: string;
  phoneNumber: string;
  profileImageUrl: string;
  gender: "male" | "female" | "other";
}

export interface UserLocation {
  city: string;
  country: string;
}

export interface UserPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  language: "en" | "ur";
  theme: "light" | "dark";
}

export interface UserSecurity {
  lastLogin: string;
  loginCount: number;
  failedLoginAttempts: number;
  mfaEnabled: boolean;
  mfaMethod: "sms" | "authenticator" | "email" | null;
}

export interface UserVerification {
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  emailVerifiedAt: string | null;
  phoneVerifiedAt: string | null;
}
export type UserRole = "platform_admin" | "department_admin" | "organizer" | "team_lead" | "attendee";

export interface CurrentUserData {
  userId: string;
  email: string;
  userType: "attendee" | "organizer" | "vendor" | "admin";
  role?: UserRole;
  orgId?: string;
  managedOrgIds?: string[];
  presidentOfOrgIds?: string[];
  name: string;
  roleId: string;
  accountStatus?: "active" | "suspended" | "deactivated";
}

export interface User {
  userId: string;
  email: string;
  role: UserRole;
  userType: "attendee" | "organizer" | "vendor" | "admin";
  /** Department (department_admin) the user belongs to, from org_memberships. */
  orgId?: string;
  /** Departments plus their clubs a department_admin may manage. */
  managedOrgIds?: string[];
  /** Clubs where this user holds the president membership. */
  presidentOfOrgIds?: string[];
  accountStatus: "active" | "suspended" | "deactivated";
  /**
   * Platform-admin standing (spec 9.1). Empty and false for everybody else.
   */
  isOwner: boolean;
  adminPermissions: string[];
  profile: UserProfile;
  location: UserLocation;
  preferences: UserPreferences;
  security: UserSecurity;
  verification: UserVerification;
  createdAt: string;
  updatedAt: string;
  lastActive: string;
  mustResetPassword?: boolean;
}