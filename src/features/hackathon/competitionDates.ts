/**
 * Competition / phase datetime ordering and payload building.
 * Pure — safe for vitest and Client Components.
 */

import { fromEventLocalInput } from "@/src/lib/datetime";

export type CompetitionDateFields = {
  registrationClosesAt: string | null;
  rosterLocksAt: string | null;
  opensAt: string | null;
  submissionDeadlineAt: string | null;
  closesAt: string | null;
};

export type CompetitionDateOrderError = {
  field: keyof CompetitionDateFields;
  message: string;
};

const ORDER: Array<{ key: keyof CompetitionDateFields; label: string }> = [
  { key: "registrationClosesAt", label: "Registration closes" },
  { key: "rosterLocksAt", label: "Roster locks" },
  { key: "opensAt", label: "Opens" },
  { key: "submissionDeadlineAt", label: "Submission deadline" },
  { key: "closesAt", label: "Closes" },
];

/** Validate registration_closes ≤ roster_locks ≤ opens ≤ submission_deadline ≤ closes (nulls skipped). */
export function validateCompetitionDateOrder(
  dates: CompetitionDateFields,
): CompetitionDateOrderError | null {
  let prevMs: number | null = null;
  let prevLabel = "";
  for (const { key, label } of ORDER) {
    const iso = dates[key];
    if (!iso) continue;
    const ms = Date.parse(iso);
    if (!Number.isFinite(ms)) {
      return { field: key, message: `${label} is not a valid date and time.` };
    }
    if (prevMs != null && ms < prevMs) {
      return {
        field: key,
        message: `${label} must be on or after ${prevLabel.toLowerCase()}.`,
      };
    }
    prevMs = ms;
    prevLabel = label;
  }
  return null;
}

/** Build UTC ISO fields from datetime-local form values in the event timezone. */
export function competitionDatesFromForm(
  form: {
    registrationClosesAt?: string;
    rosterLocksAt?: string;
    opensAt?: string;
    submissionDeadlineAt?: string;
    closesAt?: string;
  },
  timeZone: string,
): CompetitionDateFields {
  const parse = (v: string | undefined) => fromEventLocalInput(String(v ?? "").trim(), timeZone);
  return {
    registrationClosesAt: parse(form.registrationClosesAt),
    rosterLocksAt: parse(form.rosterLocksAt),
    opensAt: parse(form.opensAt),
    submissionDeadlineAt: parse(form.submissionDeadlineAt),
    closesAt: parse(form.closesAt),
  };
}

/** True when a value looks like a slash display date (must never be written to timestamptz). */
export function looksLikeSlashDate(value: string | null | undefined): boolean {
  if (!value) return false;
  return /^\d{1,2}\/\d{1,2}\/\d{4}/.test(value.trim());
}

export function assertUtcIsoPayload(dates: CompetitionDateFields): void {
  for (const { key, label } of ORDER) {
    const v = dates[key];
    if (!v) continue;
    if (looksLikeSlashDate(v)) {
      throw new Error(`${label} must be stored as UTC ISO, not a slash date.`);
    }
    if (!/^\d{4}-\d{2}-\d{2}T/.test(v)) {
      throw new Error(`${label} must be a UTC ISO timestamp.`);
    }
  }
}

/** Phase opens ≤ closes when both set. */
export function validatePhaseWindow(
  opensAt: string | null,
  closesAt: string | null,
): string | null {
  if (!opensAt || !closesAt) return null;
  const a = Date.parse(opensAt);
  const b = Date.parse(closesAt);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return "Phase times are not valid.";
  if (b < a) return "Phase closes must be on or after opens.";
  return null;
}
