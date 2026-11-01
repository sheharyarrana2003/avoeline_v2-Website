import { PERMISSION_GROUPS, PERMISSION_PRESETS, TAB_PERMISSION } from "@/src/lib/permissions";

export type OrgType = "department" | "club";

export interface OrgDoc {
  id: string;
  name: string;
  type: OrgType;
  parentOrgId?: string | null;
  ownerUid: string;
  createdAt: string;
}

export type TeamContextType = "hackathon_track" | "club_committee" | "event_staff";

export type TeamExtra = {
  description?: string;
  teamType?: string;
  [key: string]: unknown;
};

export type TeamMemberExtra = {
  designation?: string;
  notes?: string;
  [key: string]: unknown;
};

export interface TeamDoc {
  id: string;
  contextType: TeamContextType;
  eventId?: string | null;
  trackId?: string | null;
  orgId?: string | null;
  organizerId?: string | null;
  name: string;
  joinCode: string;
  createdAt: string;
  createdBy?: string;
  /** jsonb: description, teamType, … */
  extra?: TeamExtra;
}

export type TeamMemberRole = "lead" | "member";

export type TeamPositionDoc = {
  id: string;
  teamId: string;
  title: string;
  permissions: string[];
  trackIds: string[];
};

/** @deprecated use TAB_PERMISSION from @/src/lib/permissions */
export const STAFF_PAGE_KEYS = Object.entries(TAB_PERMISSION)
  .filter(([, key]) => !!key)
  .map(([tab, key]) => ({
    key: key!,
    label: tab.charAt(0).toUpperCase() + tab.slice(1),
    tab,
  }));

export const STAFF_PERMISSIONS = PERMISSION_GROUPS.flatMap((g) =>
  g.permissions.map((p) => ({ key: p.key, label: p.label })),
);

export const EVENT_STAFF_POSITIONS = [
  "Registration Lead",
  "Competition Lead",
  "Marketing Lead",
  "Operations Lead",
  "Technical Lead",
  "Volunteer Coordinator",
] as const;

export const STAFF_TITLE_PRESETS: Record<string, string[]> = {
  ...PERMISSION_PRESETS,
};

export interface TeamMemberDoc {
  id: string;
  teamId: string;
  userId: string;
  role: TeamMemberRole;
  joinedAt: string;
  positionId?: string | null;
  displayName?: string;
  email?: string;
  phone?: string;
  source?: "manual" | "recruited";
  /** jsonb: designation, notes, … */
  extra?: TeamMemberExtra;
  user?: {
    name: string;
    email: string;
  };
}

export interface TeamWithMembers extends TeamDoc {
  members: TeamMemberDoc[];
}

export type ApplicantStatus =
  "applied" | "shortlisted" | "interview_scheduled" | "accepted" | "rejected" | "withdrawn";

export const APPLICANT_STATUSES: ApplicantStatus[] = [
  "applied",
  "shortlisted",
  "interview_scheduled",
  "accepted",
  "rejected",
  "withdrawn",
];

export const APPLICANT_STATUS_LABEL: Record<ApplicantStatus, string> = {
  applied: "Applied",
  shortlisted: "Shortlisted",
  interview_scheduled: "Interview Scheduled",
  accepted: "Onboarded",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export type OrganizerTeamsStats = {
  teamsCount: number;
  membersCount: number;
  leadsWithAccess: number;
  openForms: number;
  newApplicants7d: number;
  inInterview: number;
  pendingInvites: number;
};

export type OrganizerAccessGrantSummary = {
  id: string;
  granteeUserId: string;
  scopeType: "organizer" | "org" | "event";
  scopeId: string;
  permissions: string[];
  grantedBy: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  inviteTokenHash: string | null;
  inviteSentAt: string | null;
  /** Resolved display fields for Access tab */
  granteeEmail?: string | null;
  granteeName?: string | null;
  lastActiveAt?: string | null;
  teamName?: string | null;
  eventTitle?: string | null;
};

export type AccessGrantUiStatus = "invited" | "active" | "expired" | "revoked";

export function accessGrantUiStatus(g: {
  revokedAt: string | null;
  expiresAt: string | null;
  inviteTokenHash: string | null;
  inviteSentAt: string | null;
}): AccessGrantUiStatus {
  if (g.revokedAt) return "revoked";
  if (g.expiresAt && new Date(g.expiresAt).getTime() <= Date.now()) return "expired";
  if (g.inviteTokenHash || g.inviteSentAt) return "invited";
  return "active";
}

export const APPLICANT_NEXT: Partial<Record<ApplicantStatus, ApplicantStatus>> = {
  applied: "shortlisted",
  shortlisted: "interview_scheduled",
  interview_scheduled: "accepted",
};

export type ApplicantTimelineEntry = {
  at: string;
  kind: string;
  note?: string;
};

export type StaffApplicant = {
  id: string;
  formId: string;
  teamId: string;
  positionId: string | null;
  email: string;
  responses: Record<string, unknown>;
  status: ApplicantStatus;
  appliedAt: string;
  interviewAt: string | null;
  interviewNotes: string;
  privateNotes: string;
  timeline: ApplicantTimelineEntry[];
  interviewLink: string | null;
  interviewLocation: string | null;
  interviewTz: string | null;
};

export type RecruitmentFormDoc = {
  id: string;
  teamId: string;
  positionId: string | null;
  title: string;
  intro: string;
  closesAt: string | null;
  cap: number | null;
  fields: {
    key: string;
    label: string;
    type: string;
    options?: string[];
    required?: boolean;
    id?: string;
  }[];
  isOpen: boolean;
  publicToken: string;
};
