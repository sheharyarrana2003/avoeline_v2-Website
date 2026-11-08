import type { TaskSubmissionRow } from "./taskSubmissions.types";

/** Pure filter used by the panel + unit tests (matching rows only). */
export function filterSubmissionRows(
  rows: TaskSubmissionRow[],
  filters: {
    trackId?: string;
    phaseId?: string;
    taskId?: string;
    status?: string;
    teamQ?: string;
    from?: string;
    to?: string;
  },
): TaskSubmissionRow[] {
  const trackId = filters.trackId || "all";
  const phaseId = filters.phaseId || "all";
  const taskId = filters.taskId || "all";
  const status = filters.status || "all";
  const q = (filters.teamQ || "").trim().toLowerCase();
  const fromMs = filters.from ? Date.parse(filters.from) : null;
  const toMs = filters.to ? Date.parse(filters.to) : null;
  return rows.filter((r) => {
    if (trackId !== "all" && r.trackId !== trackId) return false;
    if (phaseId !== "all" && phaseId !== "none" && r.phaseId !== phaseId) return false;
    if (phaseId === "none" && r.phaseId) return false;
    if (taskId !== "all" && r.taskId !== taskId) return false;
    if (status !== "all" && r.status !== status) return false;
    if (q && !r.teamName.toLowerCase().includes(q)) return false;
    const at = Date.parse(r.submittedAt);
    if (fromMs != null && Number.isFinite(fromMs) && at < fromMs) return false;
    if (toMs != null && Number.isFinite(toMs) && at > toMs) return false;
    return true;
  });
}
