import { mockUser } from "@/app/mockdata/users.mock"
import { User } from "./models/user.type";

function mapToUser(raw: any): User {
  return {
    userId: raw.userId || "",
    email: raw.email || "",
    userType: raw.userType || "attendee",
    accountStatus: raw.accountStatus || "active",
    
    profile: {
      fullName: raw.profile?.fullName || "",
      phoneNumber: raw.profile?.phoneNumber || "",
      profileImageUrl: raw.profile?.profileImageUrl || "",
      gender: raw.profile?.gender || "other",
    },
    
    location: {
      city: raw.location?.city || "",
      country: raw.location?.country || "",
    },
    
    preferences: {
      // Using ?? ensures that if the DB explicitly says false, we don't accidentally override it to true
      emailNotifications: Boolean(raw.preferences?.emailNotifications ?? true),
      pushNotifications: Boolean(raw.preferences?.pushNotifications ?? true),
      language: raw.preferences?.language || "en",
      theme: raw.preferences?.theme || "light",
    },
    
    security: {
      lastLogin: raw.security?.lastLogin || "",
      loginCount: raw.security?.loginCount || 0,
      failedLoginAttempts: raw.security?.failedLoginAttempts || 0,
      mfaEnabled: Boolean(raw.security?.mfaEnabled),
      mfaMethod: raw.security?.mfaMethod || null,
    },
    
    verification: {
      isEmailVerified: Boolean(raw.verification?.isEmailVerified),
      isPhoneVerified: Boolean(raw.verification?.isPhoneVerified),
      emailVerifiedAt: raw.verification?.emailVerifiedAt || null,
      phoneVerifiedAt: raw.verification?.phoneVerifiedAt || null,
    },
    
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString(),
    lastActive: raw.lastActive || new Date().toISOString(),
  };
}

export const UserService = {
    async getUserById(user_id:String){
        const user = mockUser.filter(u => u.userId === user_id);
        return mapToUser(user[0]) || null;
    }
}

