/**
 * Judges and invite status (docs/22 O5).
 * Rubric / round-advance / public-leaderboard arithmetic removed (A7 / O0).
 */

export type JudgeInviteStatus = "invited" | "opened" | "accepted" | "declined";

export interface HackathonJudge {
  id: string;
  eventId: string;
  organizerId: string;
  name: string;
  email: string;
  /** Which tracks this judge scores. Empty means none yet. */
  trackIds: string[];
  /** Unguessable; the whole credential. Null once revoked. */
  inviteToken: string | null;
  invitedAt: string;
  lastScoredAt: string | null;
  /**
   * Invite lifecycle in `extra.inviteStatus`.
   * Legacy rows without the field count as invited.
   */
  inviteStatus: JudgeInviteStatus;
  inviteRespondedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
