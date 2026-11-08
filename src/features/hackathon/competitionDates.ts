/**
 * Competition datetime ordering and payload building.
 * Pure — safe for vitest and Client Components.
 *
 * A7 / O0: only optional registration closes remains on the track.
 * Phases own opens/closes for participant work windows.
 */

import { fromEventLocalInput } from "@/src/lib/datetime";

export type CompetitionDateFields = {
  registrationClosesAt: string | null;
};

export type CompetitionDateOrderError = {
  field: keyof CompetitionDateFields;
  message: string;
};

/** Validate registration closes when set (single field — no ordering peers). */
export function validateCompetitionDateOrder(
  dates: CompetitionDateFields,
): CompetitionDateOrderError | null {
  const iso = dates.registrationClosesAt;
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) {
    return {
      field: "registrationClosesAt",
      message: "Registration closes is not a valid date and time.",
    };
  }
  return null;
}

/** Build UTC ISO fields from datetime-local form values in the event timezone. */
export function competitionDatesFromForm(
  form: {
    registrationClosesAt?: string;
  },
  timeZone: string,
): CompetitionDateFields {
  const parse = (v: string | undefined) => fromEventLocalInput(String(v ?? "").trim(), timeZone);
  return {
    registrationClosesAt: parse(form.registrationClosesAt),
  };
}

/** True when a value looks like a slash display date (must never be written to timestamptz). */
export function looksLikeSlashDate(value: string | null | undefined): boolean {
  if (!value) return false;
  return /^\d{1,2}\/\d{1,2}\/\d{4}/.test(value.trim());
}

export function assertUtcIsoPayload(dates: CompetitionDateFields): void {
  const v = dates.registrationClosesAt;
  if (!v) return;
  if (looksLikeSlashDate(v)) {
    throw new Error("Registration closes must be stored as UTC ISO, not a slash date.");
  }
  if (!/^\d{4}-\d{2}-\d{2}T/.test(v)) {
    throw new Error("Registration closes must be a UTC ISO timestamp.");
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
