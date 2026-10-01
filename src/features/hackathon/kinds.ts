export const HACKATHON_KINDS = ["ctf", "business", "web_dev", "design", "data", "other"] as const;

export type HackathonKind = (typeof HACKATHON_KINDS)[number];

export const HACKATHON_KIND_LABELS: Record<HackathonKind, string> = {
  ctf: "CTF",
  business: "Business",
  web_dev: "Web Dev",
  design: "Design",
  data: "Data",
  other: "Other",
};

export function isHackathonKind(value: unknown): value is HackathonKind {
  return typeof value === "string" && (HACKATHON_KINDS as readonly string[]).includes(value);
}

export function parseHackathonKind(value: unknown): HackathonKind {
  return isHackathonKind(value) ? value : "other";
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

export function hackathonTrackManagePath(organizerId: string, eventId: string, trackId: string): string {
  return hackathonDashPath(organizerId, eventId, `competitions/${trackId}`);
}

export function organizerHackathonCachePaths(organizerId: string, eventId: string, trackId?: string): string[] {
  const dash = hackathonDashPath(organizerId, eventId);
  const paths = [
    dash,
    `${dash}/competitions`,
    `${dash}/tasks`,
    `${dash}/teams`,
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
