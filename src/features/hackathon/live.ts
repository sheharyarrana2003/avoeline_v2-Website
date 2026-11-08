/**
 * Hackathon event settings (attachment cap + judging window).
 * Online mode / livestream / mentors / announcements removed (docs/22 A7 / O0).
 */

export interface HackathonSettings {
  eventId: string;
  /** CTF challenge/hint files. Default 10, hard cap 50. */
  maxAttachmentMb: number;
  /** Optional judging window for calendar sync (ISO local date/time strings). */
  judgingWindowStart?: string;
  judgingWindowEnd?: string;
  updatedAt: string;
}

export const EMPTY_SETTINGS: Omit<HackathonSettings, "eventId"> = {
  maxAttachmentMb: 10,
  judgingWindowStart: "",
  judgingWindowEnd: "",
  updatedAt: "",
};
