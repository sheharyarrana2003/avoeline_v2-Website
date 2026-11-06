export type ConnectionOwnerType = "user" | "org";
export type ConnectionProvider = "google" | "microsoft";
export type ConnectionStatus =
  "active" | "needs_reconnect" | "revoked" | "blocked_by_admin" | "disabled";

export type ConnectionCapability =
  "email.send" | "calendar" | "meet" | "drive.files" | "sheets.sync";

export type CalendarEntityType =
  "interview" | "mentor_slot" | "judging_session" | "hackathon_session" | "agenda_item" | "event";

export type LinkedFileEntityType = "event" | "team" | "club" | "booking";

export type LinkedFileStatus = "ok" | "missing" | "no_access";

export type LinkedFilePublic = {
  id: string;
  title: string;
  mimeType: string;
  webUrl: string | null;
  iconUrl: string | null;
  entityType: LinkedFileEntityType;
  entityId: string;
  status: LinkedFileStatus;
  addedAt: string;
  addedBy: string | null;
  addedByName: string | null;
  providerModifiedAt: string | null;
  connectionId: string;
  providerFileId: string;
};

export type IntegrationCatalogEntry = {
  key: ConnectionCapability;
  name: string;
  benefit: string;
  allows: string[];
  never: string[];
  scopes: string[];
  tier: "non-sensitive" | "sensitive" | "restricted";
  planGate: string | null;
  /** C1: only email.send is active. */
  active: boolean;
};

export type ConnectionPublic = {
  id: string;
  ownerType: ConnectionOwnerType;
  ownerId: string;
  provider: ConnectionProvider;
  providerAccountId: string;
  providerEmail: string;
  displayName: string | null;
  avatarUrl: string | null;
  status: ConnectionStatus;
  grantedScopes: string[];
  connectedAt: string;
  lastUsedAt: string | null;
  lastError: string | null;
  dailyLimit?: number;
  perMinuteLimit?: number;
  isWorkspace?: boolean;
  quotaExhaustedUntil?: string | null;
  sendingPausedUntil?: string | null;
  capabilities: Array<{
    capability: ConnectionCapability;
    enabled: boolean;
    settings: Record<string, unknown>;
  }>;
  quotaRemaining?: number | null;
};

export type EmailSendKind =
  | "registration_received"
  | "registration_confirmed"
  | "ticket"
  | "access_code"
  | "custom"
  | "certificate"
  | "recruitment"
  | "interview"
  | "guest_invite"
  | "announcement"
  | string;

export type CapacitySnapshot = {
  connectionId: string;
  providerEmail: string;
  usedLast24h: number;
  providerDailyLimit: number;
  providerRemaining: number;
  planDailyCap: number;
  planDailyRemaining: number;
  planMonthlyCap: number;
  planMonthlyRemaining: number;
  maxPerSend: number;
  reserve: number;
  remainingNow: number;
  remainingBulk: number;
  nextFreeAt: string | null;
  nextMonthResetAt: string;
  timezone: string;
  blockedReason?: string | null;
};

export type PreviewScheduleChunk = {
  notBefore: string;
  count: number;
};

export type PreviewSendResult = {
  total: number;
  sendNow: number;
  schedule: PreviewScheduleChunk[];
  eta: string | null;
  blockedReason: string | null;
  capacity: CapacitySnapshot;
};

export type ResolvedSender = {
  connectionId: string;
  providerEmail: string;
  displayName: string | null;
  fromEmail: string;
  fromName: string | null;
};

export type ConnectionSendInput = {
  connectionId: string;
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: string | Buffer | Uint8Array;
    contentType?: string;
  }>;
};

export type ConnectionSendResult = {
  ok: boolean;
  error?: string;
  code?: "NO_CONNECTION" | "SEND_FAILED" | "INVALID" | "QUOTA" | "DISABLED" | "NEEDS_RECONNECT";
};
