export const HACKATHON_KINDS = ["ctf", "business", "web_dev", "design", "data", "other"] as const;

export type HackathonKind = (typeof HACKATHON_KINDS)[number];

/** Display labels. Legacy DB kinds (business, web_dev, …) show as Competition. */
export const HACKATHON_KIND_LABELS: Record<HackathonKind, string> = {
  ctf: "CTF",
  business: "Competition",
  web_dev: "Competition",
  design: "Competition",
  data: "Competition",
  other: "Competition",
};

export function isHackathonKind(value: unknown): value is HackathonKind {
  return typeof value === "string" && (HACKATHON_KINDS as readonly string[]).includes(value);
}

/** Normalize to product kinds only: `ctf` | `other` (legacy kinds → other). */
export function parseHackathonKind(value: unknown): HackathonKind {
  return value === "ctf" ? "ctf" : "other";
}

export function isCtfKind(kind: unknown): boolean {
  return parseHackathonKind(kind) === "ctf";
}

export const CTF_CONFIG_KEYS = new Set([
  "ctf_flags",
  "task_categories",
  "docker_sandboxing",
  "anti_cheat_tab_close",
]);

export function hackathonDashPath(organizerId: string, eventId: string, suffix = ""): string {
  const base = `/organizer/${organizerId}/events/${eventId}`;
  return suffix ? `${base}${suffix.startsWith("/") ? suffix : `/${suffix}`}` : base;
}

export function hackathonTrackManagePath(
  organizerId: string,
  eventId: string,
  trackId: string,
): string {
  return hackathonDashPath(organizerId, eventId, `competitions/${trackId}`);
}

export function organizerHackathonCachePaths(
  organizerId: string,
  eventId: string,
  trackId?: string,
): string[] {
  const dash = hackathonDashPath(organizerId, eventId);
  const paths = [
    dash,
    `${dash}/competitions`,
    `${dash}/tasks`,
    `${dash}/submissions`,
    `${dash}/scoreboard`,
    `${dash}/settings`,
    `/organizer/${organizerId}/events/${eventId}/hackathon`,
  ];
  if (trackId) {
    paths.push(hackathonTrackManagePath(organizerId, eventId, trackId));
    paths.push(`/organizer/${organizerId}/events/${eventId}/hackathon/${trackId}`);
  }
  return paths;
}
