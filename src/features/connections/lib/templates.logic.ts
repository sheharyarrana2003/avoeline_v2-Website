/** Pure template body builders for C5 (unit-testable). */

export type TemplateKind = "run_of_show" | "sponsor_tracker" | "mou_draft";

export function templateTitle(kind: TemplateKind, eventTitle: string): string {
  const base =
    kind === "run_of_show"
      ? "Run of show"
      : kind === "sponsor_tracker"
        ? "Sponsor tracker"
        : "MoU draft";
  return `${base} — ${eventTitle}`.slice(0, 180);
}

export type RunOfShowAgendaLine = {
  date: string;
  startTime: string;
  endTime: string;
  title: string;
  location?: string;
};

export function runOfShowBody(opts: {
  eventTitle: string;
  startDate: string;
  endDate: string;
  venue: string;
  agendaLines?: RunOfShowAgendaLine[];
}): string {
  const lines = [
    `Run of show — ${opts.eventTitle}`,
    "",
    `Dates: ${opts.startDate} – ${opts.endDate}`,
    `Venue: ${opts.venue || "TBD"}`,
    "",
  ];

  if (opts.agendaLines?.length) {
    lines.push("Agenda (from platform)", "");
    let currentDate = "";
    for (const item of opts.agendaLines) {
      if (item.date !== currentDate) {
        currentDate = item.date;
        lines.push(`Day — ${item.date}`);
      }
      const when = [item.startTime, item.endTime].filter(Boolean).join(" – ");
      const loc = item.location ? ` @ ${item.location}` : "";
      lines.push(`- ${when}: ${item.title}${loc}`);
    }
    lines.push("");
  } else {
    lines.push(
      "Timeline",
      "1. Doors / registration",
      "2. Opening remarks",
      "3. Main programme",
      "4. Breaks / networking",
      "5. Closing",
      "",
      "Notes",
      "- No agenda sessions yet. Add them under Agenda, then recreate this template.",
      "",
    );
  }

  return lines.join("\n");
}

export function mouDraftBody(opts: { eventTitle: string; organizerName: string }): string {
  return [
    "Memorandum of Understanding (draft)",
    "",
    `Event: ${opts.eventTitle}`,
    `Organizer: ${opts.organizerName || "Organizer"}`,
    "",
    "1. Purpose",
    "This draft MoU outlines cooperation for the event above. Replace placeholders before sharing.",
    "",
    "2. Roles",
    "- Organizer: programme, venue, attendee communications.",
    "- Counterparty: [describe contribution].",
    "",
    "3. Term",
    "Effective from [date] until [date] or completion of the event.",
    "",
    "4. Signatures",
    "Organizer: ______________________  Date: __________",
    "Counterparty: ___________________  Date: __________",
  ].join("\n");
}

export function sponsorTrackerHeaders(): string[] {
  return ["Sponsor / partner", "Tier", "Cash / in-kind", "Amount", "Status", "Contact", "Notes"];
}
