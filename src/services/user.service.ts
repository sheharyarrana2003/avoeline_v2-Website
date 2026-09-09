import { cache } from "react";
import { User } from "./models/user.type";
import { adminDb } from "@/data/admin_db";
import { COLLECTIONS } from "@/data/collections";
import { toIsoString } from "@/src/lib/datetime";


function mapToUser(raw: any): User {
  return {
    userId: raw?.userId || raw?.user_id|| "",
    email: raw?.email || "",
    userType: raw?.userType || "attendee",
    accountStatus: raw?.accountStatus || "active",
    isOwner: !!raw?.isOwner,
    adminPermissions: Array.isArray(raw?.adminPermissions) ? raw.adminPermissions.map(String) : [],

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
      lastLogin: toIsoString(raw.security?.lastLogin) || "",
      loginCount: raw.security?.loginCount || 0,
      failedLoginAttempts: raw.security?.failedLoginAttempts || 0,
      mfaEnabled: Boolean(raw.security?.mfaEnabled),
      mfaMethod: raw.security?.mfaMethod || null,
    },

    verification: {
      isEmailVerified: Boolean(raw.verification?.isEmailVerified),
      isPhoneVerified: Boolean(raw.verification?.isPhoneVerified),
      emailVerifiedAt: toIsoString(raw.verification?.emailVerifiedAt),
      phoneVerifiedAt: toIsoString(raw.verification?.phoneVerifiedAt),
    },

    createdAt: toIsoString(raw.createdAt) || new Date().toISOString(),
    updatedAt: toIsoString(raw.updatedAt) || new Date().toISOString(),
    lastActive: toIsoString(raw.lastActive) || new Date().toISOString(),
  };
}

export const UserService = {
  /**
   * The ids of every suspended organizer (spec 9.3).
   *
   * Two equality filters and no `orderBy`, which Firestore serves by merging
   * single-field indexes -- this project cannot deploy a composite one, so that
   * shape matters. `cache()`-wrapped because the public read paths that need it
   * are already scanning every event, and they must not pay for this per event.
   *
   * Lives on UserService rather than in the admin feature because it is a users
   * query, and because the public browse and access paths must not import from
   * the admin panel to decide what a stranger can see.
   */
  suspendedOrganizerIds: cache(async (): Promise<Set<string>> => {
    try {
      const snap = await adminDb
        .collection(COLLECTIONS.USERS)
        .where("accountStatus", "==", "suspended")
        .get();

      // The role is matched here, in memory, and not as a second `where`.
      // `userType` is stored inconsistently cased -- existing organizer
      // documents hold "Organizer" -- and Firestore equality is case
      // sensitive, so `where("userType", "==", "organizer")` matched nothing
      // and every suspension silently failed to hide a single event.
      const ids = new Set<string>(
        snap.docs
          .filter((d: { data: () => Record<string, unknown> }) =>
            String(d.data()?.userType ?? "").trim().toLowerCase() === "organizer")
          .map((d: { id: string }) => d.id),
      );

      // Nothing suspended is the normal case, and it costs exactly one query.
      if (ids.size === 0) return ids;

      // An event's `organizerId` is the organizer document id for some events
      // and the user id for others -- the two are different values in this
      // data, which is why `listOrganizers` counts events under either. The
      // set has to hold both or a suspension silently fails to hide anything.
      // ponytail: `in` takes 30 values, so this covers the first 30 suspended
      // organizers. Past that, hold the user id on the event instead.
      const orgSnap = await adminDb
        .collection(COLLECTIONS.ORGANIZERS)
        .where("userId", "in", [...ids].slice(0, 30))
        .get();
      for (const doc of orgSnap.docs) ids.add(doc.id);
      return ids;
    } catch (err) {
      // A failure here must not take the public event pages down with it, and
      // failing open is the safer direction: showing a suspended organizer's
      // event for one render beats a blank Browse Events for everybody.
      console.error("[suspendedOrganizerIds] Firestore read failed", err);
      return new Set<string>();
    }
  }),

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

