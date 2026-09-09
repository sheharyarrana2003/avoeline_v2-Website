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
export interface CurrentUserData{
   userId: string;
  email: string;
  userType: "attendee" | "organizer" | "vendor" | "admin";
  name : string;
  roleId : string;
}
export interface User {
  userId: string;
  email: string;
  userType: "attendee" | "organizer" | "vendor" | "admin";
  accountStatus: "active" | "suspended" | "deactivated";
  /**
   * Platform-admin standing (spec 9.1). Empty and false for everybody else.
   *
   * On the user document rather than a collection of its own because that is
   * what it describes, and because the promote flow already writes here -- so
   * an account becomes an owner in the same write that makes it an admin.
   * `mapToUser` maps both; a field this mapper does not assign is invisible on
   * read, which is the trap the organizer and event mappers already carry.
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
}