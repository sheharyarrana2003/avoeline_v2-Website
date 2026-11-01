/**
 * Canonical dashboard / staff permission keys (Phase 6).
 * Stored on team_positions.permissions and access_grants.permissions.
 * Plan modules stay in moduleKeys.ts — those are separate from these action keys.
 */

export const PERMISSION_GROUPS = [
  {
    id: "event",
    label: "Event dashboard",
    permissions: [
      { key: "events:view", label: "View event overview" },
      { key: "registrations:manage", label: "Manage attendees / registrations" },
      { key: "attendees:email", label: "Email attendees" },
      { key: "access:manage", label: "Manage access & invites" },
      { key: "agenda:manage", label: "Manage agenda" },
      { key: "speakers:manage", label: "Manage speakers" },
      { key: "vendors:manage", label: "Manage vendors" },
      { key: "sponsors:manage", label: "Manage sponsors" },
      { key: "expenses:manage", label: "Manage expenses" },
      { key: "certificates:manage", label: "Manage certificates" },
      { key: "exports:run", label: "Run exports" },
      { key: "teams:manage", label: "Manage staff teams" },
    ],
  },
  {
    id: "ops",
    label: "Operations",
    permissions: [
      { key: "check_in", label: "Check-in attendees" },
      { key: "view_applicants", label: "Review recruitment applicants" },
      { key: "manage_roster", label: "Manage team roster" },
      { key: "communications", label: "Send staff communications" },
    ],
  },
  {
    id: "hackathon",
    label: "Hackathon",
    permissions: [
      {
        key: "hackathon:manage",
        label: "Manage competitions, tasks, teams, submissions, settings",
      },
      { key: "hackathon:judge", label: "Score / judge submissions" },
    ],
  },
] as const;

export type PermissionKey = (typeof PERMISSION_GROUPS)[number]["permissions"][number]["key"];

export const ALL_PERMISSION_KEYS: PermissionKey[] = PERMISSION_GROUPS.flatMap((g) =>
  g.permissions.map((p) => p.key),
);

/** Event tab value → required permission (owner bypasses). */
export const TAB_PERMISSION: Record<string, PermissionKey | null> = {
  overview: "events:view",
  attendees: "registrations:manage",
  staff: "teams:manage",
  access: "access:manage",
  agenda: "agenda:manage",
  speakers: "speakers:manage",
  vendors: "vendors:manage",
  sponsors: "sponsors:manage",
  expenses: "expenses:manage",
  certificates: "certificates:manage",
  exports: "exports:run",
  competitions: "hackathon:manage",
  tasks: "hackathon:manage",
  teams: "hackathon:manage",
  submissions: "hackathon:manage",
  scoreboard: "hackathon:manage",
  settings: "hackathon:manage",
};

/** Legacy page_* / ops keys → Phase 6 catalog (runtime + migration). */
export const LEGACY_PERMISSION_MAP: Record<string, PermissionKey> = {
  page_attendees: "registrations:manage",
  page_access: "access:manage",
  page_expenses: "expenses:manage",
  page_competitions: "hackathon:manage",
  page_tasks: "hackathon:manage",
  page_teams: "hackathon:manage",
  page_submissions: "hackathon:manage",
  page_scoreboard: "hackathon:manage",
  page_settings: "hackathon:manage",
};

export function normalizePermissionKey(key: string): string {
  const k = String(key || "").trim();
  return LEGACY_PERMISSION_MAP[k] ?? k;
}

export function normalizePermissionList(keys: string[] | null | undefined): string[] {
  return [...new Set((keys ?? []).map(normalizePermissionKey).filter(Boolean))];
}

const REGISTRATION_LEAD: PermissionKey[] = [
  "registrations:manage",
  "access:manage",
  "check_in",
  "attendees:email",
];
const MARKETING_LEAD: PermissionKey[] = [
  "attendees:email",
  "communications",
  "sponsors:manage",
  "events:view",
];
const CHECK_IN_DESK: PermissionKey[] = ["check_in", "events:view"];
const VIEWER: PermissionKey[] = ["events:view"];

export const PERMISSION_PRESETS: Record<string, PermissionKey[]> = {
  "Registration lead": REGISTRATION_LEAD,
  "Marketing lead": MARKETING_LEAD,
  "Check-in desk": CHECK_IN_DESK,
  Viewer: VIEWER,
  "Competition Lead": ["hackathon:manage", "hackathon:judge", "exports:run"],
  "Operations Lead": [
    "events:view",
    "agenda:manage",
    "speakers:manage",
    "vendors:manage",
    "check_in",
  ],
  "Finance Lead": ["expenses:manage", "sponsors:manage", "exports:run"],
  // Title-case aliases used by EVENT_STAFF_POSITIONS / recruitment UI
  "Registration Lead": REGISTRATION_LEAD,
  "Marketing Lead": MARKETING_LEAD,
};

export type AccessGrantScopeType = "organizer" | "org" | "event";
