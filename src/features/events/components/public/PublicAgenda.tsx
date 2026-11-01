import { formatDateMedium, formatTime } from "@/src/lib/datetime";
import type { PublicAgendaItem } from "@/src/features/events/types";

export function PublicAgenda({ items }: { items: PublicAgendaItem[] }) {
  if (!items.length) return null;

  const byDate = new Map<string, PublicAgendaItem[]>();
  for (const item of items) {
    const key = item.date || "Schedule";
    const list = byDate.get(key) ?? [];
    list.push(item);
    byDate.set(key, list);
  }

  return (
    <section className="space-y-6">
      <h2 className="font-display text-lg text-ink">Agenda</h2>
      {[...byDate.entries()].map(([date, sessions]) => (
        <div key={date}>
          <h3 className="text-2xs font-medium uppercase text-ink-soft">
            {date === "Schedule" ? date : formatDateMedium(date) || date}
          </h3>
          <ol className="mt-3 space-y-0 border-l border-line pl-5">
            {sessions.map((s) => (
              <li key={s.id} className="relative pb-5 last:pb-0">
                <span
                  className="absolute -left-[1.4rem] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-ink bg-paper"
                  aria-hidden="true"
                />
                <p className="text-2xs tabular-nums text-ink-soft">
                  {[formatTime(s.startTime), formatTime(s.endTime)].filter(Boolean).join(" – ")}
                  {s.type ? ` · ${s.type}` : ""}
                </p>
                <p className="mt-0.5 font-display text-base text-ink">{s.title}</p>
                {s.location ? <p className="mt-0.5 text-xs text-ink-soft">{s.location}</p> : null}
                {s.speakerNames.length ? (
                  <p className="mt-0.5 text-xs text-ink-soft">{s.speakerNames.join(", ")}</p>
                ) : null}
                {s.description ? (
                  <p className="mt-1 whitespace-pre-line text-sm text-ink-soft">{s.description}</p>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      ))}
    </section>
  );
}
