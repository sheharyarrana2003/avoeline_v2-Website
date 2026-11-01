"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { safeAction, safeFail, safeOk } from "@/src/lib/safeAction";
import { assertEventActor } from "@/src/features/events/ownership";
import { staffCanAct } from "@/src/features/hackathon/staffEventAccess";
import { organizerHackathonCachePaths } from "../kinds";
import {
  reviewTaskSubmission,
  signedSubmissionDownload,
  type TaskSubmissionStatus,
} from "../taskSubmissions.service";
import { TABLES } from "@/data/collections";
import { HACKATHON_SUBMISSIONS_BUCKET, supabaseAdmin } from "@/data/supabase";
import { rateLimit } from "@/src/lib/rateLimit";
import { requireCompeteRegistration } from "../competeSession";

const statusSchema = z.enum(["submitted", "accepted", "rejected", "late"]);

export const reviewTaskSubmissionAction = safeAction({
  input: z.object({
    eventId: z.string().uuid(),
    submissionId: z.string().uuid(),
    status: statusSchema,
    reviewNote: z.string().max(2000).optional(),
    pointsAwarded: z.number().min(0).max(1_000_000).nullable().optional(),
  }),
  run: async (input) => {
    const event = await assertEventActor(input.eventId, "submissions");
    if (!event) return safeFail("FORBIDDEN", "You cannot review submissions for that event.");
    if (!(await staffCanAct(input.eventId, "submissions"))) {
      return safeFail("FORBIDDEN", "You cannot review submissions for that event.");
    }

    const { data: row } = await supabaseAdmin
      .from(TABLES.HACKATHON_TASK_SUBMISSIONS)
      .select("id, track_id")
      .eq("id", input.submissionId)
      .maybeSingle();
    if (!row) return safeFail("NOT_FOUND", "That submission was not found.");

    const { data: track } = await supabaseAdmin
      .from(TABLES.HACKATHON_TRACKS)
      .select("id, event_id")
      .eq("id", row.track_id)
      .maybeSingle();
    if (!track || String(track.event_id) !== event.id) {
      return safeFail("NOT_FOUND", "That submission was not found.");
    }
    if (!(await staffCanAct(input.eventId, "submissions", String(track.id)))) {
      return safeFail("FORBIDDEN", "You cannot review submissions for that competition.");
    }

    const result = await reviewTaskSubmission({
      id: input.submissionId,
      status: input.status as TaskSubmissionStatus,
      reviewNote: input.reviewNote,
      pointsAwarded: input.pointsAwarded ?? null,
    });
    if (!result.ok) return safeFail("UPDATE", result.message);

    for (const path of organizerHackathonCachePaths(event.organizerId, event.id)) {
      revalidatePath(path);
    }
    return safeOk({ id: input.submissionId });
  },
});

export const getSubmissionDownloadUrlAction = safeAction({
  input: z.object({
    eventId: z.string().uuid(),
    submissionId: z.string().uuid(),
  }),
  run: async (input) => {
    const event = await assertEventActor(input.eventId, "submissions");
    if (!event) return safeFail("FORBIDDEN", "You cannot download that file.");

    const { data: row } = await supabaseAdmin
      .from(TABLES.HACKATHON_TASK_SUBMISSIONS)
      .select("id, track_id, file_path, file_name")
      .eq("id", input.submissionId)
      .maybeSingle();
    if (!row?.file_path) return safeFail("NOT_FOUND", "No file on that submission.");

    const { data: track } = await supabaseAdmin
      .from(TABLES.HACKATHON_TRACKS)
      .select("event_id")
      .eq("id", row.track_id)
      .maybeSingle();
    if (!track || String(track.event_id) !== event.id) {
      return safeFail("NOT_FOUND", "No file on that submission.");
    }
    if (!(await staffCanAct(input.eventId, "submissions", String(row.track_id)))) {
      return safeFail("FORBIDDEN", "You cannot download that file.");
    }

    const url = await signedSubmissionDownload(String(row.file_path), row.file_name);
    if (!url) return safeFail("UPLOAD", "Could not prepare a download.");
    return safeOk({ url, fileName: row.file_name || "submission" });
  },
});

/** Participant: signed upload into private submissions bucket. */
export const requestTaskSubmissionUpload = safeAction({
  input: z.object({
    eventId: z.string().uuid(),
    fileName: z.string().min(1).max(200),
    contentType: z.string().min(3).max(120),
    fileSize: z
      .number()
      .int()
      .positive()
      .max(50 * 1024 * 1024),
  }),
  run: async (input) => {
    const session = await requireCompeteRegistration(input.eventId);
    if (!session) return safeFail("AUTH", "Sign in with your team access code first.");

    const limited = rateLimit(`task-upload:${input.eventId}:${session.teamId}`, 30, 60);
    if (!limited.ok) return safeFail("RATE_LIMIT", "Too many uploads. Try again shortly.");

    const { getHackathonSettings } = await import("../hackathon.service");
    const settings = await getHackathonSettings(input.eventId);
    const maxBytes = Math.max(1, settings.maxAttachmentMb || 10) * 1024 * 1024;
    if (input.fileSize > maxBytes) {
      return safeFail("VALIDATION", `Keep files under ${settings.maxAttachmentMb || 10}MB.`);
    }

    const safe =
      input.fileName
        .toLowerCase()
        .replace(/[^a-z0-9.-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(-80) || "file";
    const path = `tasks/${input.eventId}/${session.teamId}/${crypto.randomUUID()}-${safe}`;
    const { data, error } = await supabaseAdmin.storage
      .from(HACKATHON_SUBMISSIONS_BUCKET)
      .createSignedUploadUrl(path);
    if (error || !data) return safeFail("UPLOAD", "Could not prepare the upload.");

    return safeOk({
      path,
      bucket: HACKATHON_SUBMISSIONS_BUCKET,
      signedUrl: data.signedUrl,
      token: data.token,
    });
  },
});
