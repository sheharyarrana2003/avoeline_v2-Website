import "server-only";

export type FileProvider = "drive" | "supabase";

export type FileCategory =
  | "payment_proof"
  | "submission"
  | "media"
  | "certificate"
  | "export"
  | "other"
  | "hackathon_phase"
  | "hackathon_task"
  | "hackathon_submission";

export type EventFolderKind =
  "payment_proofs" | "certificates" | "media" | "exports" | "submissions";

export type StoredFileRow = {
  id: string;
  provider: FileProvider;
  providerFileId: string;
  connectionId: string | null;
  name: string;
  size: number;
  mime: string;
  checksum: string;
  category: FileCategory;
  entityType: string;
  entityId: string;
  organizerId: string | null;
  eventId: string | null;
  needsPromote: boolean;
  promotedAt: string | null;
  uploadedAt: string;
  expiresAt: string | null;
  extra: Record<string, unknown>;
};

export type FilePutInput = {
  name: string;
  mime: string;
  bytes: Buffer | Uint8Array;
  checksum?: string;
  category: FileCategory;
  entityType: string;
  entityId: string;
  organizerId: string;
  eventId: string;
  /** A6 folder kind under the event root (required for Drive). */
  folderKind: EventFolderKind;
  /** Optional nested path under submissions: competition / team. */
  submissionPath?: { competition?: string; team?: string };
  connectionId?: string;
  actorId?: string;
  /** Prefer Drive; on failure write Supabase + needs_promote. Default true. */
  allowFallback?: boolean;
  /** Link into linked_files for Library. Default true for media/certs/exports. */
  linkLibrary?: boolean;
  expiresAt?: string | null;
  extra?: Record<string, unknown>;
};

export type FilePutResult = {
  fileId: string;
  provider: FileProvider;
  providerFileId: string;
  needsPromote: boolean;
  /** `file:{uuid}` for registration / payment paths. */
  storageRef: string;
  mime: string;
  size: number;
  name: string;
};

export type FileStreamResult = {
  body: ReadableStream<Uint8Array> | Buffer;
  mime: string;
  name: string;
  size: number | null;
};

export interface FileStore {
  put(input: FilePutInput): Promise<FilePutResult>;
  get(fileId: string): Promise<StoredFileRow | null>;
  stream(fileId: string): Promise<FileStreamResult>;
  delete(fileId: string): Promise<void>;
  link(opts: {
    storedFileId: string;
    entityType: string;
    entityId: string;
    actorId?: string;
  }): Promise<void>;
}

export type DriveHealthStatus = "active" | "needs_reconnect" | "full" | "blocked";

export type DriveHealthSnapshot = {
  status: DriveHealthStatus;
  message: string | null;
  needsPromoteCount: number;
  connectionId: string | null;
};
