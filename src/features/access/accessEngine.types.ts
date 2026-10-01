export type AccessType = "public" | "private" | "invite_only" | "hybrid" | "vip_tiered";

export type InviteLinkStatus = "pending" | "opened" | "registered";

export interface InviteLinkDoc {
  id: string;
  eventId: string;
  email: string;
  token: string;
  status: InviteLinkStatus;
  expiresAt?: string;
  singleUse: boolean;
  createdAt: string | null;
  openedAt?: string | null;
  registeredAt?: string | null;
}

export interface WaitlistDoc {
  id: string;
  eventId: string;
  userId: string;
  position: number;
  createdAt: string | null;
  email?: string;
  name?: string;
}

export interface EventTierDoc {
  id: string;
  eventId: string;
  name: string;
  description: string;
  order: number;
}
