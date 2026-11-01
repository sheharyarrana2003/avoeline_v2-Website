export type TaskSubmissionStatus = "submitted" | "accepted" | "rejected" | "late";

export type TaskSubmissionRow = {
  id: string;
  teamId: string;
  teamName: string;
  trackId: string;
  trackName: string;
  phaseId: string | null;
  phaseName: string | null;
  taskId: string;
  taskTitle: string;
  submittedBy: string | null;
  textAnswer: string | null;
  linkUrl: string | null;
  filePath: string | null;
  fileName: string | null;
  fileSize: number | null;
  mime: string | null;
  submittedAt: string;
  status: TaskSubmissionStatus;
  reviewNote: string | null;
  pointsAwarded: number | null;
};

/** Safe MIME kinds for inline organizer preview — never HTML/SVG. */
export function isSafeInlinePreview(
  mime: string | null | undefined,
): "image" | "pdf" | "text" | null {
  const m = (mime || "").toLowerCase();
  if (m.startsWith("image/") && !m.includes("svg")) return "image";
  if (m === "application/pdf") return "pdf";
  if (m.startsWith("text/")) return "text";
  return null;
}
