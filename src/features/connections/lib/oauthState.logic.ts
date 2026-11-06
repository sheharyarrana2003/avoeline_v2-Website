/** Pure OAuth state gate for C6 threat tests (mirrors oauth.service callback). */

export type OAuthStateGateInput = {
  usedAt: string | null | undefined;
  expiresAt: string;
  stateUserId: string;
  actorId: string;
  nowMs?: number;
};

export type OAuthStateGateResult =
  { ok: true } | { ok: false; reason: "used" | "expired" | "user_mismatch" };

export function oauthStateGate(input: OAuthStateGateInput): OAuthStateGateResult {
  if (input.usedAt) return { ok: false, reason: "used" };
  const now = input.nowMs ?? Date.now();
  if (new Date(input.expiresAt).getTime() < now) return { ok: false, reason: "expired" };
  if (String(input.stateUserId) !== String(input.actorId)) {
    return { ok: false, reason: "user_mismatch" };
  }
  return { ok: true };
}

/** True when missing required scopes should block enabling capabilities. */
export function scopeDowngradeBlocks(missing: string[]): boolean {
  return missing.length > 0;
}
