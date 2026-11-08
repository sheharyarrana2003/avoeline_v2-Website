/**
 * docs/22 A2 — how each access type works.
 */
const ROWS: Array<{
  type: string;
  sees: string;
  registers: string;
  setup: string;
  gets: string;
}> = [
  {
    type: "Public",
    sees: "Everyone, listed and searchable",
    registers: "Anyone",
    setup: "Nothing",
    gets: "The same public link",
  },
  {
    type: "Private",
    sees: "Not listed — link only",
    registers: "Whitelist email or access code",
    setup: "Whitelist and/or a code",
    gets: "The same event link (checked at registration)",
  },
  {
    type: "Invite only",
    sees: "Not listed",
    registers: "Only their personal invite link",
    setup: "Invitees, expiry, single-use",
    gets: "Personal link …/e/<event>?invite=<token>",
  },
  {
    type: "Hybrid",
    sees: "Listed publicly",
    registers: "Anyone for open tiers; gated tiers need whitelist/code",
    setup: "Which tiers are gated + whitelist/code",
    gets: "Public link; gated tiers if they pass",
  },
  {
    type: "VIP / Tiered",
    sees: "Listed publicly",
    registers: "Anyone (tier assigned)",
    setup: "Tiers and optional guest list with tiers",
    gets: "Public link; tier decides price and agenda",
  },
];

export function HowAccessWorks() {
  return (
    <section className="rounded-xl border border-line bg-paper p-5 shadow-sm">
      <h2 className="font-display text-lg text-ink">How this works</h2>
      <p className="mt-1 text-sm text-ink-soft">
        Whitelist = permission to register. Invite link = a personal trackable key.
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[40rem] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-line text-2xs uppercase tracking-wide text-ink-soft">
              <th className="py-2 pr-3 font-medium">Type</th>
              <th className="py-2 pr-3 font-medium">Who can see</th>
              <th className="py-2 pr-3 font-medium">Who can register</th>
              <th className="py-2 pr-3 font-medium">You set up</th>
              <th className="py-2 font-medium">They get</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.type} className="border-b border-line/70 align-top">
                <td className="py-2.5 pr-3 font-medium text-ink">{row.type}</td>
                <td className="py-2.5 pr-3 text-ink-soft">{row.sees}</td>
                <td className="py-2.5 pr-3 text-ink-soft">{row.registers}</td>
                <td className="py-2.5 pr-3 text-ink-soft">{row.setup}</td>
                <td className="py-2.5 text-ink-soft">{row.gets}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
