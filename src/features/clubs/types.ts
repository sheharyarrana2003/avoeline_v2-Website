import type { ModuleKey } from "@/src/features/permissions/moduleKeys";

export type ClubRequestType = "budget" | "event_approval" | "other";
export type ClubRequestStatus = "pending" | "approved" | "rejected";

export type ClubRequestRow = {
  id: string;
  orgId: string;
  title: string;
  details: string;
  requestType: ClubRequestType;
  status: ClubRequestStatus;
  requestedAmount: number | null;
  reviewNote: string;
  attachmentUrl: string | null;
  attachmentName: string | null;
  createdAt: string;
};

export type ClubRosterPerson = {
  id: string;
  teamId: string;
  userId: string | null;
  fullName: string;
  email: string;
  phone: string;
  memberCode: string;
  designation: string;
  isLead: boolean;
};

export type ClubTeamCard = {
  id: string;
  name: string;
  joinCode: string;
  memberCount: number;
  leadName: string;
  people: ClubRosterPerson[];
};

export type ClubModules = ModuleKey[];
