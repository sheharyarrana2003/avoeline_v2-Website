export interface AcademicInfo {
  university: string;
  studentId: string;
  department: string;
  graduationYear: number;
  cgpa?: number;
  isStudentVerified: boolean;
  verificationMethod: string;
  verifiedAt: string | null;
}

export interface Skill {
  name: string;
  level: "beginner" | "intermediate" | "advanced";
  endorsements: number;
}

export interface SocialLinks {
  linkedin: string | null;
  github: string | null;
  portfolio: string | null;
  twitter: string | null;
}

export interface AttendeeStats {
  totalEventsAttended: number;
  totalCertificatesEarned: number;
  totalReviewsWritten: number;
  averageRatingGiven: number;
  networkingConnections: number;
  eventsRegistered: number;
  eventsAttended: number;
  attendanceRate: number;
  totalHoursSpent: number;
}

export interface AttendeeCertificate {
  certificateId: string;
  eventId: string;
  issuedAt: string;
  type: "digital" | "blockchain";
  verificationUrl: string;
}

export interface Connection {
  connectionId: string;
  connectedUserId: string;
  connectedAt: string;
  connectionType: "speaker" | "attendee" | "organizer";
  notes: string;
}

export interface Attendee {
  attendeeId: string;
  userId: string; // Foreign Key to User
  academic: AcademicInfo;
  interests: string[];
  skills: Skill[];
  socialLinks: SocialLinks;
  stats: AttendeeStats;
  certificates: AttendeeCertificate[];
  connections: Connection[];
  createdAt: string;
  updatedAt: string;
}