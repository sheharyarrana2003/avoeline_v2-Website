/** Canonical agenda session types (docs/22 O4). */
export const AGENDA_SESSION_TYPES = [
  "Opening",
  "Talk",
  "Panel",
  "Workshop",
  "Competition",
  "Break",
  "Networking",
  "Closing",
  "Other",
] as const;

export type AgendaSessionType = (typeof AGENDA_SESSION_TYPES)[number];

const LEGACY_MAP: Record<string, AgendaSessionType> = {
  talk: "Talk",
  TALK: "Talk",
  workshop: "Workshop",
  WORKSHOP: "Workshop",
  panel: "Panel",
  PANEL: "Panel",
  networking: "Networking",
  NETWORKING: "Networking",
  break: "Break",
  BREAK: "Break",
  opening: "Opening",
  Opening: "Opening",
  competition: "Competition",
  Competition: "Competition",
  closing: "Closing",
  Closing: "Closing",
  other: "Other",
  Other: "Other",
  keynote: "Talk",
  qna: "Panel",
  registration: "Other",
};

export function normalizeAgendaType(raw: unknown): AgendaSessionType {
  const s = String(raw ?? "").trim();
  if ((AGENDA_SESSION_TYPES as readonly string[]).includes(s)) return s as AgendaSessionType;
  return LEGACY_MAP[s] ?? LEGACY_MAP[s.toLowerCase()] ?? "Other";
}

export function isAgendaSessionType(value: unknown): value is AgendaSessionType {
  return typeof value === "string" && (AGENDA_SESSION_TYPES as readonly string[]).includes(value);
}
