import type { JudgeInviteStatus } from "./judging";

export function normalizeJudgeInviteStatus(raw: unknown): JudgeInviteStatus {
  const s = String(raw || "").toLowerCase();
  if (s === "accepted" || s === "declined" || s === "invited" || s === "opened") return s;
  return "invited";
}

/** Opening the invite link: invited → opened; leave accepted/declined alone. */
export function statusAfterOpen(current: JudgeInviteStatus): JudgeInviteStatus {
  if (current === "invited") return "opened";
  return current;
}

/**
 * Resend rules: declined → invited again; accepted stays accepted;
 * invited/opened stay as-is (still awaiting response).
 */
export function statusAfterResend(current: JudgeInviteStatus): JudgeInviteStatus {
  if (current === "declined") return "invited";
  return current;
}

export function clampJudgePoints(points: number, taskMax: number): number {
  const max = Number.isFinite(taskMax) && taskMax > 0 ? taskMax : 0;
  if (!Number.isFinite(points) || points < 0) return 0;
  if (points > max) return max;
  return Math.round(points * 100) / 100;
}

export function meanJudgePoints(scores: number[]): number {
  if (!scores.length) return 0;
  const sum = scores.reduce((a, b) => a + b, 0);
  return Math.round((sum / scores.length) * 100) / 100;
}

export function applyJudgeInviteTemplate(
  template: string,
  vars: { name: string; link: string; eventTitle: string },
): string {
  return template
    .replaceAll("{{name}}", vars.name)
    .replaceAll("{{link}}", vars.link)
    .replaceAll("{{eventTitle}}", vars.eventTitle);
}
