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
}
export interface User {
  userId: string;
  email: string;
  userType: "attendee" | "organizer" | "vendor" | "admin";
  accountStatus: "active" | "suspended" | "deactivated";
  profile: UserProfile;
  location: UserLocation;
  preferences: UserPreferences;
  security: UserSecurity;
  verification: UserVerification;
  createdAt: string;
  updatedAt: string;
  lastActive: string;
}