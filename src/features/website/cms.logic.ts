/** Pure helpers for W3 CMS (consent gates, notify cap, line diffs). */

export const LEGAL_NOTIFY_CAP = 100;

export type ConsentStatus = "pending" | "granted" | "revoked";

export function isPartnerPubliclyVisible(row: {
  consent_status: string;
  visible: boolean;
}): boolean {
  return row.consent_status === "granted" && row.visible === true;
}

export function canShowTestimonial(row: { consent_confirmed: boolean; visible: boolean }): boolean {
  return row.consent_confirmed === true && row.visible === true;
}

/** Reject making a testimonial visible without consent. */
export function assertTestimonialVisibility(
  consentConfirmed: boolean,
  visible: boolean,
): { ok: true } | { ok: false; error: string } {
  if (visible && !consentConfirmed) {
    return { ok: false, error: "Consent must be confirmed before a testimonial can be visible." };
  }
  return { ok: true };
}

export type NotifyCapResult<T> = {
  selected: T[];
  skipped: number;
  capped: boolean;
  cap: number;
};

/** Take at most `cap` recipients; leftover count is skipped. */
export function capNotifyRecipients<T>(
  recipients: T[],
  cap = LEGAL_NOTIFY_CAP,
): NotifyCapResult<T> {
  const limit = Math.max(0, Math.floor(cap));
  if (recipients.length <= limit) {
    return { selected: recipients, skipped: 0, capped: false, cap: limit };
  }
  return {
    selected: recipients.slice(0, limit),
    skipped: recipients.length - limit,
    capped: true,
    cap: limit,
  };
}

export type LineDiffOp =
  | { type: "equal"; line: string }
  | { type: "add"; line: string }
  | { type: "remove"; line: string };

/** Simple LCS-based line diff for legal version history. */
export function diffLines(before: string, after: string): LineDiffOp[] {
  const a = String(before ?? "").split(/\r?\n/);
  const b = String(after ?? "").split(/\r?\n/);
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ops: LineDiffOp[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      ops.push({ type: "equal", line: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ type: "remove", line: a[i] });
      i++;
    } else {
      ops.push({ type: "add", line: b[j] });
      j++;
    }
  }
  while (i < n) {
    ops.push({ type: "remove", line: a[i++] });
  }
  while (j < m) {
    ops.push({ type: "add", line: b[j++] });
  }
  return ops;
}

export function parseHighlightFeatures(raw: string): string[] {
  return String(raw ?? "")
    .split(/\n|,/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20);
}

export function parseTags(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of String(raw ?? "").split(/,/)) {
    const tag = part.trim().toLowerCase().slice(0, 40);
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
    if (out.length >= 20) break;
  }
  return out;
}
