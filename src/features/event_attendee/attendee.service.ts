import { mockAttendee } from "@/app/mockdata/attendee.mock"
import { mockReg } from "@/app/mockdata/registeration.mock"
import { Attendee } from "./type";
import { doc, setDoc, query, where, getDocs, getDoc, collection } from 'firebase/firestore';
import { adminDb } from "@/data/admin_db";
import { COLLECTIONS } from "@/data/collections";
import { QuerySnapshot } from "firebase-admin/firestore";

function mapToAttendee(raw: any): Attendee {
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
            verifiedAt: raw.academic?.verifiedAt || null,
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
            issuedAt: cert.issuedAt || "",
            type: cert.type || "digital",
            verificationUrl: cert.verificationUrl || "",
        })) : [],

        connections: Array.isArray(raw.connections) ? raw.connections.map((conn: any) => ({
            connectionId: conn.connectionId || "",
            connectedUserId: conn.connectedUserId || "",
            connectedAt: conn.connectedAt || "",
            connectionType: conn.connectionType || "attendee",
            notes: conn.notes || "",
        })) : [],

        createdAt: raw.createdAt || new Date().toISOString(),
        updatedAt: raw.updatedAt || new Date().toISOString(),
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
        const user_ids_of_attendees: string[] = querySnapshot.docs.map(doc => doc.data().userId);


        const attendees: Attendee[] = await Promise.all(
            user_ids_of_attendees.map(async (x) => {
                const q = await adminDb.collection(COLLECTIONS.ATTENDEES).where("userId", "==", x).get();
                const attendeeSnap = q.docs[0];
                return mapToAttendee(attendeeSnap.data());
            })
        );


        return attendees;

    }


}