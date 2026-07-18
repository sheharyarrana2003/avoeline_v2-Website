import { cache } from "react";
import { User } from "./models/user.type";
import { adminDb } from "@/data/admin_db";
import { COLLECTIONS } from "@/data/collections";


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
  // Cached per request: the same user is often resolved multiple times in one
  // render (layout + page + list rows), so dedupe those to a single read.
  getUserById: cache(async (user_id: String) => {
    const docSnap = await adminDb.collection(COLLECTIONS.USERS).doc(String(user_id)).get();
    const user_to_front_end = {
      user_id,
      ...docSnap.data()
    };
    return mapToUser(user_to_front_end);
  }),

  // Batch-fetch many users in a single Firestore getAll() round-trip instead
  // of one getUserById per id. Returns a Map keyed by userId (missing docs map
  // to a safe default via mapToUser).
  async getUsersByIds(ids: string[]): Promise<Map<string, User>> {
    const uniqueIds = [...new Set(ids.filter(Boolean).map(String))];
    const map = new Map<string, User>();
    if (uniqueIds.length === 0) return map;

    const refs = uniqueIds.map(id => adminDb.collection(COLLECTIONS.USERS).doc(id));
    const snaps: FirebaseFirestore.DocumentSnapshot[] = await adminDb.getAll(...refs);
    snaps.forEach((snap, i) => {
      const id = uniqueIds[i];
      map.set(id, mapToUser({ user_id: id, ...(snap.exists ? snap.data() : {}) }));
    });
    return map;
  }
}

