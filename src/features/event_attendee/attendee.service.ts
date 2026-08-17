import { Attendee } from "./type";
import { User } from "@/src/services/models/user.type";
import { adminDb } from "@/data/admin_db";
import { COLLECTIONS } from "@/data/collections";
import { QuerySnapshot } from "firebase-admin/firestore";
import { toIsoString } from "@/src/lib/datetime";

export function mapToAttendee(raw: any): Attendee {
    return {
        attendeeId: raw.attendeeId || "",
        userId: raw.userId || "",

        academic: {
            university: raw.academic?.university || "",
            studentId: raw.academic?.studentId || "",
            department: raw.academic?.department || "",
            graduationYear: raw.academic?.graduationYear || 0,
            cgpa: raw.academic?.cgpa, // Optional field, so undefined/null is fine
            isStudentVerified: Boolean(raw.academic?.isStudentVerified),
            verificationMethod: raw.academic?.verificationMethod || "manual",
            verifiedAt: toIsoString(raw.academic?.verifiedAt),
        },

        // Ensure arrays are actually arrays before mapping
        interests: Array.isArray(raw.interests) ? raw.interests : [],

        skills: Array.isArray(raw.skills) ? raw.skills.map((skill: any) => ({
            name: skill.name || "",
            level: skill.level || "beginner", // fallback to beginner
            endorsements: skill.endorsements || 0,
        })) : [],

        socialLinks: {
            linkedin: raw.socialLinks?.linkedin || null,
            github: raw.socialLinks?.github || null,
            portfolio: raw.socialLinks?.portfolio || null,
            twitter: raw.socialLinks?.twitter || null,
        },

        stats: {
            totalEventsAttended: raw.stats?.totalEventsAttended || 0,
            totalCertificatesEarned: raw.stats?.totalCertificatesEarned || 0,
            totalReviewsWritten: raw.stats?.totalReviewsWritten || 0,
            averageRatingGiven: raw.stats?.averageRatingGiven || 0,
            networkingConnections: raw.stats?.networkingConnections || 0,
            eventsRegistered: raw.stats?.eventsRegistered || 0,
            eventsAttended: raw.stats?.eventsAttended || 0,
            attendanceRate: raw.stats?.attendanceRate || 0,
            totalHoursSpent: raw.stats?.totalHoursSpent || 0,
        },

        certificates: Array.isArray(raw.certificates) ? raw.certificates.map((cert: any) => ({
            certificateId: cert.certificateId || "",
            eventId: cert.eventId || "",
            issuedAt: toIsoString(cert.issuedAt) || "",
            type: cert.type || "digital",
            verificationUrl: cert.verificationUrl || "",
        })) : [],

        connections: Array.isArray(raw.connections) ? raw.connections.map((conn: any) => ({
            connectionId: conn.connectionId || "",
            connectedUserId: conn.connectedUserId || "",
            connectedAt: toIsoString(conn.connectedAt) || "",
            connectionType: conn.connectionType || "attendee",
            notes: conn.notes || "",
        })) : [],

        createdAt: toIsoString(raw.createdAt) || new Date().toISOString(),
        updatedAt: toIsoString(raw.updatedAt) || new Date().toISOString(),
    };
}

export const AttendeeService = {
    async getAttendeeOfEvent(event_id: String) {

        const q = adminDb.
            collection(COLLECTIONS.REGISTRATIONS).
            where("eventId", "==", event_id)


        const querySnapshot: QuerySnapshot = await q.get();
        if (querySnapshot.empty) {
            return null;
        }
        const user_ids_of_attendees: string[] = [
            ...querySnapshot.docs.map(doc => doc.data().userId).filter(Boolean)
        ];

        // Batch the attendee lookups into Firestore's 30-per-"in" chunks, fetched
        // in parallel, instead of one query per attendee (previously N+1, and it
        // crashed on any attendee without a matching doc via docs[0].data()).
        const CHUNK = 30;
        const chunks: string[][] = [];
        for (let i = 0; i < user_ids_of_attendees.length; i += CHUNK) {
            chunks.push(user_ids_of_attendees.slice(i, i + CHUNK));
        }

        const snapshots: QuerySnapshot[] = await Promise.all(
            chunks.map(chunk =>
                adminDb.collection(COLLECTIONS.ATTENDEES).where("userId", "in", chunk).get()
            )
        );

        const attendees: Attendee[] = [];
        snapshots.forEach((snap) => {
            snap.forEach((d) => {
                attendees.push(mapToAttendee(d.data()));
            });
        });

        return attendees;

    },

    async getAttendeebyuserid(user_id:string){
         const attendee = await adminDb.collection(COLLECTIONS.ATTENDEES).where("userId", "==",user_id).get();
         return mapToAttendee(attendee);
    },
    // Fetch attendee PROFILES for a set of user ids, returned as a Map keyed by
    // userId. Unlike getAttendeeOfEvent, this lets callers drive a list off the
    // registrations and treat the attendee profile as an optional left-join —
    // so a registered user without an `attendees` doc still shows up.
    async getAttendeeProfilesByUserIds(userIds: string[]): Promise<Map<string, Attendee>> {
        const uniqueIds = [...new Set(userIds.filter(Boolean).map(String))];
        const map = new Map<string, Attendee>();
        if (uniqueIds.length === 0) return map;

        const CHUNK = 30;
        const chunks: string[][] = [];
        for (let i = 0; i < uniqueIds.length; i += CHUNK) {
            chunks.push(uniqueIds.slice(i, i + CHUNK));
        }

        const snapshots: QuerySnapshot[] = await Promise.all(
            chunks.map(chunk =>
                adminDb.collection(COLLECTIONS.ATTENDEES).where("userId", "in", chunk).get()
            )
        );

        snapshots.forEach((snap) => {
            snap.forEach((d) => {
                const attendee = mapToAttendee(d.data());
                if (attendee.userId) map.set(attendee.userId, attendee);
            });
        });

        return map;
    }


}

// Build a minimal Attendee placeholder for a registered user who has no
// `attendees` profile doc, so registration-driven lists can still render a row
// with a stable, unique key.
export function emptyAttendeeForUser(userId: string): Attendee {
    return mapToAttendee({ userId, attendeeId: `reg-${userId}` });
}

/**
 * The display identity for a registration whose `users` document cannot be found.
 *
 * Two ways to land here. A public registration has no account at all, so `userId`
 * is "" and there is nothing to look up -- the name and email live on the
 * registration. And a registration whose user was deleted resolves to nothing
 * either. Both used to produce `undefined`, which `AttendeeListItem` then walked
 * into via `attendee_user.profile.fullName.charAt(0)`, taking down the whole
 * Attendees tab rather than dropping one row.
 *
 * Same idea as `emptyAttendeeForUser` above: synthesise a well-formed object so
 * the list stays renderable, and let the missing data show as missing.
 */
export function userFromRegistration(reg: {
    userId?: string;
    attendee?: { name?: string; email?: string; phone?: string } | null;
}): User {
    const contact = reg.attendee;
    return {
        userId: String(reg.userId || ""),
        email: contact?.email || "",
        userType: "attendee",
        accountStatus: "active",
        profile: {
            // Never "": AttendeeListItem takes .charAt(0) for the avatar, and an
            // empty initial renders as a blank circle with no hint of who it is.
            fullName: contact?.name || "Guest registration",
            phoneNumber: contact?.phone || "",
            profileImageUrl: "",
            gender: "other",
        },
        location: { city: "", country: "" },
        preferences: { emailNotifications: true, pushNotifications: false, language: "en", theme: "light" },
        security: { lastLogin: "", loginCount: 0, failedLoginAttempts: 0, mfaEnabled: false, mfaMethod: null },
        verification: { isEmailVerified: false, isPhoneVerified: false, emailVerifiedAt: null, phoneVerifiedAt: null },
        createdAt: "",
        updatedAt: "",
        lastActive: "",
    };
}