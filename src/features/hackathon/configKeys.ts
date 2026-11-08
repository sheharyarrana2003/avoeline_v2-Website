export type ConfigFieldType = "number" | "datetime" | "text" | "boolean";

export type ConfigField = { name: string; label: string; type: ConfigFieldType; help?: string };

export type HackathonConfigKey = {
  key: string;
  label: string;
  /** What turning it on changes for participants. */
  effect: string;
  fields?: ConfigField[];
  /** Stored and shown, but nothing is enforced by the app. */
  toggleOnly?: boolean;
};

export const HACKATHON_CONFIG_KEYS: readonly HackathonConfigKey[] = [
  {
    key: "live_scoreboard",
    label: "Live scoreboard",
    effect: "Participants see a live Scoreboard tab for their competition only (not other tracks).",
  },
  {
    key: "ctf_flags",
    label: "CTF flags",
    effect: "Tasks with a flag accept flag submissions, checked on the server.",
  },
  {
    key: "task_hints",
    label: "Task hints",
    effect:
      "Participants can reveal a task's hint; the penalty is taken off the points when solved.",
    fields: [{ name: "penalty", label: "Points deducted per revealed hint", type: "number" }],
  },
  {
    key: "per_task_timer",
    label: "Per-task timer",
    effect:
      "A task's time limit starts when the team opens it; late submissions are flagged or rejected.",
    fields: [
      { name: "defaultMinutes", label: "Default time limit (minutes)", type: "number" },
      {
        name: "latePolicy",
        label: "Late policy (flag or reject)",
        type: "text",
        help: "Use flag (default) or reject.",
      },
    ],
  },
  {
    key: "hackathon_timer",
    label: "Event countdown",
    effect: "Shows a countdown and refuses task submissions after it ends.",
    fields: [
      { name: "startsAt", label: "Countdown starts", type: "datetime" },
      {
        name: "endsAt",
        label: "Countdown ends",
        type: "datetime",
        help: "Set an end time for the whole-hackathon countdown. Leave blank to rely on phase windows only.",
      },
    ],
  },
  {
    key: "random_tasks",
    label: "Random task pool",
    effect: "Tasks marked random are dealt out per team instead of shown to everyone.",
    fields: [{ name: "count", label: "Random tasks per team", type: "number" }],
  },
  {
    key: "task_categories",
    label: "Task categories",
    effect: "Participants can filter tasks by category.",
    fields: [
      {
        name: "categories",
        label: "Categories (comma-separated)",
        type: "text",
        help: "Example: web, crypto, forensics",
      },
    ],
  },
  {
    key: "docker_sandboxing",
    label: "Docker sandboxing",
    effect: "Not active yet — infrastructure is not provisioned.",
    toggleOnly: true,
  },
  {
    key: "day_wise_calendar",
    label: "Day-wise calendar",
    effect: "Marks the track as scheduled by day; the CTF arena schedule is managed separately.",
    toggleOnly: true,
  },
  {
    key: "day_wise_tasks",
    label: "Day-wise task release",
    effect: "Tasks inside a phase appear only while that phase is open.",
  },
  {
    key: "link_submissions",
    label: "Require submission links",
    effect: "Submissions must include a link; domains can be allowlisted.",
    fields: [
      { name: "requireDemo", label: "Also require a demo video link", type: "boolean" },
      {
        name: "allowedDomains",
        label: "Allowed domains (comma-separated)",
        type: "text",
        help: "Example: github.com, gitlab.com. Empty = any https link.",
      },
    ],
  },
  {
    key: "daily_shifts",
    label: "Daily staff shifts",
    effect: "Not active yet — shift planning UI is not wired.",
    toggleOnly: true,
  },
  {
    key: "team_attendance",
    label: "Team attendance",
    effect: "Client heartbeat writes activity pings; gaps are flagged for organizer review.",
    fields: [{ name: "intervalMinutes", label: "Check-in interval (minutes)", type: "number" }],
  },
  {
    key: "activity_check_interval",
    label: "Activity check",
    effect: "Minutes between expected heartbeats (with team attendance).",
    fields: [{ name: "minutes", label: "Minutes between checks", type: "number" }],
  },
  {
    key: "anti_cheat_tab_close",
    label: "Tab-close / focus monitoring",
    effect:
      "Browser visibility and blur events are logged as flagged signals for organizer review. Monitoring and warn only — this is not an OS or browser lockdown and never auto-punishes.",
  },
  {
    key: "phased_structure",
    label: "Phased structure",
    effect: "Tasks attached to a phase are listed only while the phase is open.",
  },
  {
    key: "phase_lock_no_revisit",
    label: "Lock closed phases",
    effect:
      "UI lock messaging for closed phases. Open/close windows always refuse submits regardless of this toggle.",
  },
  {
    key: "allow_resubmission",
    label: "Allow resubmission",
    effect:
      "Teams may submit more than once for the same task. Off = server rejects a second submission row (default on).",
  },
  {
    key: "team_collaboration",
    label: "Team collaboration",
    effect: "Any team member can already submit flags for the team from their own ticket.",
    toggleOnly: true,
  },
] as const;

export function configKeyMeta(key: string): HackathonConfigKey | undefined {
  return HACKATHON_CONFIG_KEYS.find((k) => k.key === key);
}
