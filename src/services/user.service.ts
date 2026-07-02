import { mockUser } from "@/app/mockdata/users.mock"
import { User } from "./models/user.type";
import { auth, db } from '@/data/db'
import { doc, setDoc, getDoc } from 'firebase/firestore';


function mapToUser(raw: any): User {
  return {
    userId: raw?.userId || raw?.user_id|| "",
    email: raw?.email || "",
    userType: raw?.userType || "attendee",
    accountStatus: raw?.accountStatus || "active",

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
  async getUserById(user_id: String) {
    const docRef = doc(db, "users", user_id);
    const docSnap = await getDoc(docRef);
    const user_to_front_end = {
      "user_id": user_id,
      ...docSnap.data()
    }
    console.log("this is user docSnap.data() ",docSnap.data());

    return mapToUser(user_to_front_end);
  }
}

