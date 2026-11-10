/**
 * Typed upload allowlist (docs/23 N1 / A8).
 * Public display images → Supabase media (compressed). Private → FileStore.
 */

export const UPLOAD_KINDS = [
  "event_banner",
  "event_gallery",
  "sponsor_logo",
  "collaborator_logo",
  "partner_logo",
  "speaker_photo",
  "competition_image",
  "payment_proof",
  "submission_file",
  "task_attachment",
  "certificate_asset",
  "certificate_archive",
  "export_file",
] as const;

export type UploadKind = (typeof UPLOAD_KINDS)[number];

export type UploadStore = "supabase_public" | "filestore" | "filestore_fallback";

export type UploadActor = "organizer" | "public_registrant" | "participant";

export type UploadKindConfig = {
  kind: UploadKind;
  store: UploadStore;
  /** Primary bucket for supabase_public (media or sponsor-logos). */
  bucket: "media" | "sponsor-logos";
  folder: string;
  mimeAllow: readonly string[] | "image" | "image_or_pdf" | "documents";
  /** Soft target after compression (bytes). */
  maxBytes: number;
  /** Hard reject before processing. */
  hardMaxBytes: number;
  maxDimension?: number;
  /** Target encoded size budget (docs/23 A8). */
  budgetBytes?: number;
  who: readonly UploadActor[];
  /** Videos must be links only for these public kinds. */
  rejectVideo: boolean;
};

const IMAGE_PREFIX = "image/" as const;

/** docs/23 A8 budgets */
export const MEDIA_BUDGETS = {
  event_banner: 300 * 1024,
  event_gallery: 250 * 1024,
  logo: 100 * 1024,
  speaker_photo: 150 * 1024,
  competition_image: 250 * 1024,
} as const;

const PUBLIC_IMAGE: Pick<
  UploadKindConfig,
  "store" | "bucket" | "mimeAllow" | "rejectVideo" | "who" | "hardMaxBytes" | "maxDimension"
> = {
  store: "supabase_public",
  bucket: "media",
  mimeAllow: "image",
  rejectVideo: true,
  who: ["organizer"],
  hardMaxBytes: 12 * 1024 * 1024,
  maxDimension: 2400,
};

export const UPLOAD_KIND_CONFIG: Record<UploadKind, UploadKindConfig> = {
  event_banner: {
    ...PUBLIC_IMAGE,
    kind: "event_banner",
    folder: "banners",
    maxBytes: MEDIA_BUDGETS.event_banner,
    budgetBytes: MEDIA_BUDGETS.event_banner,
  },
  event_gallery: {
    ...PUBLIC_IMAGE,
    kind: "event_gallery",
    folder: "galleries",
    maxBytes: MEDIA_BUDGETS.event_gallery,
    budgetBytes: MEDIA_BUDGETS.event_gallery,
  },
  sponsor_logo: {
    ...PUBLIC_IMAGE,
    kind: "sponsor_logo",
    bucket: "sponsor-logos",
    folder: "sponsors",
    maxBytes: MEDIA_BUDGETS.logo,
    budgetBytes: MEDIA_BUDGETS.logo,
  },
  collaborator_logo: {
    ...PUBLIC_IMAGE,
    kind: "collaborator_logo",
    bucket: "sponsor-logos",
    folder: "collaborators",
    maxBytes: MEDIA_BUDGETS.logo,
    budgetBytes: MEDIA_BUDGETS.logo,
  },
  partner_logo: {
    ...PUBLIC_IMAGE,
    kind: "partner_logo",
    bucket: "sponsor-logos",
    folder: "partners",
    maxBytes: MEDIA_BUDGETS.logo,
    budgetBytes: MEDIA_BUDGETS.logo,
  },
  speaker_photo: {
    ...PUBLIC_IMAGE,
    kind: "speaker_photo",
    folder: "speakers",
    maxBytes: MEDIA_BUDGETS.speaker_photo,
    budgetBytes: MEDIA_BUDGETS.speaker_photo,
  },
  competition_image: {
    ...PUBLIC_IMAGE,
    kind: "competition_image",
    folder: "competitions",
    maxBytes: MEDIA_BUDGETS.competition_image,
    budgetBytes: MEDIA_BUDGETS.competition_image,
  },
  payment_proof: {
    kind: "payment_proof",
    store: "filestore",
    bucket: "media",
    folder: "payment_proofs",
    mimeAllow: "image_or_pdf",
    maxBytes: 5 * 1024 * 1024,
    hardMaxBytes: 8 * 1024 * 1024,
    maxDimension: 4096,
    who: ["public_registrant"],
    rejectVideo: true,
  },
  submission_file: {
    kind: "submission_file",
    store: "filestore",
    bucket: "media",
    folder: "submissions",
    mimeAllow: "documents",
    maxBytes: 50 * 1024 * 1024,
    hardMaxBytes: 50 * 1024 * 1024,
    who: ["participant", "organizer"],
    rejectVideo: false,
  },
  task_attachment: {
    kind: "task_attachment",
    store: "filestore",
    bucket: "media",
    folder: "submissions",
    mimeAllow: "documents",
    maxBytes: 50 * 1024 * 1024,
    hardMaxBytes: 50 * 1024 * 1024,
    who: ["organizer", "participant"],
    rejectVideo: false,
  },
  certificate_asset: {
    kind: "certificate_asset",
    store: "supabase_public",
    bucket: "media",
    folder: "certificates",
    mimeAllow: "image",
    maxBytes: 2 * 1024 * 1024,
    hardMaxBytes: 8 * 1024 * 1024,
    who: ["organizer"],
    rejectVideo: true,
  },
  certificate_archive: {
    kind: "certificate_archive",
    store: "filestore",
    bucket: "media",
    folder: "certificates",
    mimeAllow: "documents",
    maxBytes: 50 * 1024 * 1024,
    hardMaxBytes: 50 * 1024 * 1024,
    who: ["organizer"],
    rejectVideo: false,
  },
  export_file: {
    kind: "export_file",
    store: "filestore",
    bucket: "media",
    folder: "exports",
    mimeAllow: "documents",
    maxBytes: 50 * 1024 * 1024,
    hardMaxBytes: 50 * 1024 * 1024,
    who: ["organizer"],
    rejectVideo: false,
  },
};

export function isUploadKind(value: string): value is UploadKind {
  return (UPLOAD_KINDS as readonly string[]).includes(value);
}

export function getUploadKindConfig(kind: UploadKind): UploadKindConfig {
  return UPLOAD_KIND_CONFIG[kind];
}

export function mimeAllowedForKind(kind: UploadKind, mime: string): boolean {
  const cfg = UPLOAD_KIND_CONFIG[kind];
  const m = mime.toLowerCase().split(";")[0]!.trim();
  if (cfg.rejectVideo && m.startsWith("video/")) return false;
  if (cfg.mimeAllow === "image") return m.startsWith(IMAGE_PREFIX) && m !== "image/svg+xml";
  if (cfg.mimeAllow === "image_or_pdf") {
    return (m.startsWith(IMAGE_PREFIX) && m !== "image/svg+xml") || m === "application/pdf";
  }
  // documents: images, pdf, office, text — no executables
  if (m.startsWith("image/") && m !== "image/svg+xml") return true;
  if (m.startsWith("video/")) return !cfg.rejectVideo;
  return [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "text/plain",
    "text/csv",
  ].includes(m);
}

export function pathForUploadKind(opts: {
  kind: UploadKind;
  ownerId: string;
  eventId?: string | null;
  fileId: string;
  safeName: string;
}): string {
  const cfg = UPLOAD_KIND_CONFIG[opts.kind];
  const eventPart = opts.eventId ? `${opts.eventId}/` : "";
  return `${cfg.folder}/${eventPart}${opts.ownerId}/${opts.fileId}-${opts.safeName}`;
}

/** Default plan media quota (bytes) when plan has no explicit cap. */
export const DEFAULT_MEDIA_QUOTA_BYTES: Record<string, number> = {
  free: 200 * 1024 * 1024,
  starter: 500 * 1024 * 1024,
  pro: 2 * 1024 * 1024 * 1024,
  business: 5 * 1024 * 1024 * 1024,
};
