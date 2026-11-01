import { Attendee } from "./type";
import { User } from "@/src/services/models/user.type";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { toIsoString } from "@/src/lib/datetime";

/** Explicit columns for attendee_profiles (avoid select('*')). */
const ATTENDEE_PROFILE_COLS =
  "user_id, university, department, student_id, graduation_year, is_student_verified, verification_method, interests, skills, social_links, events_registered, events_attended, attendance_rate, total_certificates_earned, total_hours_spent, networking_connections, total_reviews_written, average_rating_given, updated_at, extra";

function hydrateAttendeeRow(row: Record<string, any>): Record<string, any> {
  const extra = (row.extra && typeof row.extra === "object" ? row.extra : {}) as Record<
    string,
    any
  >;
  const social =
    (row.social_links && typeof row.social_links === "object"
      ? row.social_links
      : extra.socialLinks) || {};
  return {
    ...extra,
    attendeeId: row.user_id || extra.attendeeId || "",
    userId: row.user_id || extra.userId || "",
    academic: extra.academic || {
      university: row.university,
      studentId: row.student_id,
      department: row.department,
      graduationYear: row.graduation_year,
      isStudentVerified: row.is_student_verified,
      verificationMethod: row.verification_method,
    },
    interests: row.interests || extra.interests || [],
    skills: row.skills || extra.skills || [],
    socialLinks: {
      linkedin: social.linkedin || null,
      github: social.github || null,
      portfolio: social.portfolio || null,
      twitter: social.twitter || null,
    },
    stats: extra.stats || {
      totalEventsAttended: row.events_attended,
      totalCertificatesEarned: row.total_certificates_earned,
      totalReviewsWritten: row.total_reviews_written,
      averageRatingGiven: row.average_rating_given,
      networkingConnections: row.networking_connections,
      eventsRegistered: row.events_registered,
      eventsAttended: row.events_attended,
      attendanceRate: row.attendance_rate,
      totalHoursSpent: row.total_hours_spent,
    },
    certificates: extra.certificates || [],
    connections: extra.connections || [],
    createdAt: extra.createdAt || row.updated_at,
    updatedAt: row.updated_at || extra.updatedAt,
  };
}

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

    skills: Array.isArray(raw.skills)
      ? raw.skills.map((skill: any) => ({
          name: skill.name || "",
          level: skill.level || "beginner", // fallback to beginner
          endorsements: skill.endorsements || 0,
        }))
      : [],

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

    certificates: Array.isArray(raw.certificates)
      ? raw.certificates.map((cert: any) => ({
          certificateId: cert.certificateId || "",
          eventId: cert.eventId || "",
          issuedAt: toIsoString(cert.issuedAt) || "",
          type: cert.type || "digital",
          verificationUrl: cert.verificationUrl || "",
        }))
      : [],

    connections: Array.isArray(raw.connections)
      ? raw.connections.map((conn: any) => ({
          connectionId: conn.connectionId || "",
          connectedUserId: conn.connectedUserId || "",
          connectedAt: toIsoString(conn.connectedAt) || "",
          connectionType: conn.connectionType || "attendee",
          notes: conn.notes || "",
        }))
      : [],

    createdAt: toIsoString(raw.createdAt) || new Date().toISOString(),
    updatedAt: toIsoString(raw.updatedAt) || new Date().toISOString(),
  };
}

export const AttendeeService = {
  async getAttendeeOfEvent(event_id: String) {
    const { data: regs, error } = await supabaseAdmin
      .from(TABLES.REGISTRATIONS)
      .select("user_id")
      .eq("event_id", String(event_id));
    if (error) throw error;
    if (!regs?.length) return null;

    const user_ids_of_attendees = regs.map((r) => r.user_id).filter(Boolean) as string[];
    if (!user_ids_of_attendees.length) return [];

    // Batch the attendee lookups into PostgREST-friendly chunks, fetched
    // in parallel, instead of one query per attendee.
    const CHUNK = 100;
    const chunks: string[][] = [];
    for (let i = 0; i < user_ids_of_attendees.length; i += CHUNK) {
      chunks.push(user_ids_of_attendees.slice(i, i + CHUNK));
    }

    const snapshots = await Promise.all(
      chunks.map(async (chunk) => {
        const { data, error: chunkError } = await supabaseAdmin
          .from(TABLES.ATTENDEE_PROFILES)
          .select(ATTENDEE_PROFILE_COLS)
          .in("user_id", chunk);
        if (chunkError) throw chunkError;
        return data ?? [];
      }),
    );

    const attendees: Attendee[] = [];
    snapshots.forEach((rows) => {
      rows.forEach((row) => {
        attendees.push(mapToAttendee(hydrateAttendeeRow(row as Record<string, any>)));
      });
    });

    return attendees;
  },

  async getAttendeebyuserid(user_id: string) {
    const { data, error } = await supabaseAdmin
      .from(TABLES.ATTENDEE_PROFILES)
      .select(ATTENDEE_PROFILE_COLS)
      .eq("user_id", user_id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return mapToAttendee({ userId: user_id, attendeeId: user_id });
    return mapToAttendee(hydrateAttendeeRow(data as Record<string, any>));
  },
  // Fetch attendee PROFILES for a set of user ids, returned as a Map keyed by
  // userId. Unlike getAttendeeOfEvent, this lets callers drive a list off the
  // registrations and treat the attendee profile as an optional left-join —
  // so a registered user without an `attendees` doc still shows up.
  async getAttendeeProfilesByUserIds(userIds: string[]): Promise<Map<string, Attendee>> {
    const uniqueIds = [...new Set(userIds.filter(Boolean).map(String))];
    const map = new Map<string, Attendee>();
    if (uniqueIds.length === 0) return map;

    const CHUNK = 100;
    const chunks: string[][] = [];
    for (let i = 0; i < uniqueIds.length; i += CHUNK) {
      chunks.push(uniqueIds.slice(i, i + CHUNK));
    }

    const snapshots = await Promise.all(
      chunks.map(async (chunk) => {
        const { data, error } = await supabaseAdmin
          .from(TABLES.ATTENDEE_PROFILES)
          .select(ATTENDEE_PROFILE_COLS)
          .in("user_id", chunk);
        if (error) throw error;
        return data ?? [];
      }),
    );

    snapshots.forEach((rows) => {
      rows.forEach((row) => {
        const attendee = mapToAttendee(hydrateAttendeeRow(row as Record<string, any>));
        if (attendee.userId) map.set(attendee.userId, attendee);
      });
    });

    return map;
  },
};

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
    role: "attendee",
    userType: "attendee",
    accountStatus: "active",
    // A synthesised attendee row, never a platform admin.
    isOwner: false,
    adminPermissions: [],
    profile: {
      // Never "": AttendeeListItem takes .charAt(0) for the avatar, and an
      // empty initial renders as a blank circle with no hint of who it is.
      fullName: contact?.name || "Guest registration",
      phoneNumber: contact?.phone || "",
      profileImageUrl: "",
      gender: "other",
    },
    location: { city: "", country: "" },
    preferences: {
      emailNotifications: true,
      pushNotifications: false,
      language: "en",
      theme: "light",
    },
    security: {
      lastLogin: "",
      loginCount: 0,
      failedLoginAttempts: 0,
      mfaEnabled: false,
      mfaMethod: null,
    },
    verification: {
      isEmailVerified: false,
      isPhoneVerified: false,
      emailVerifiedAt: null,
      phoneVerifiedAt: null,
    },
    createdAt: "",
    updatedAt: "",
    lastActive: "",
  };
}
