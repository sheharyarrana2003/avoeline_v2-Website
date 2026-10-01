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

export interface TeamDoc {
    id: string;
    contextType: TeamContextType;
    eventId?: string | null;
    trackId?: string | null;
    orgId?: string | null;
    name: string;
    joinCode: string;
    createdAt: string;
    createdBy?: string;
}

export type TeamMemberRole = "lead" | "member";

export type TeamPositionDoc = {
    id: string;
    teamId: string;
    title: string;
    permissions: string[];
};

export type StaffApplicant = {
    id: string;
    formId: string;
    teamId: string;
    responses: Record<string, unknown>;
    status: string;
    appliedAt: string;
};

export const EVENT_STAFF_POSITIONS = [
    "Registration Lead",
    "Marketing Lead",
    "Operations Lead",
    "Technical Lead",
    "Volunteer Coordinator",
] as const;

export interface TeamMemberDoc {
    id: string;
    teamId: string;
    userId: string;
    role: TeamMemberRole;
    joinedAt: string;
    user?: {
        name: string;
        email: string;
    };
}

export interface TeamWithMembers extends TeamDoc {
    members: TeamMemberDoc[];
}
