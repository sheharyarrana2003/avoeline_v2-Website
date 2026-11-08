"use client";

import { useMemo, useState } from "react";
import { compareAgendaDayKeys, comparePublicAgendaItems } from "@/src/features/agendas/agendaSort";
import { formatDateMedium, formatTime } from "@/src/lib/datetime";
import type { PublicAgendaItem } from "@/src/features/events/types";

function Avatar({ name, url }: { name: string; url?: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt="" className="h-6 w-6 rounded-full object-cover" title={name} />
    );
  }
  return (
    <span
      title={name}
      className="flex h-6 w-6 items-center justify-center rounded-full border border-line bg-muted text-2xs text-ink-soft"
    >
      {initials || "?"}
    </span>
  );
}

export function PublicAgenda({ items }: { items: PublicAgendaItem[] }) {
  const dayEntries = useMemo(() => {
    if (!items.length) return [] as [string, PublicAgendaItem[]][];
    const byDate = new Map<string, PublicAgendaItem[]>();
    for (const item of items) {
      const key = item.date || "Schedule";
      const list = byDate.get(key) ?? [];
      list.push(item);
      byDate.set(key, list);
    }
    return [...byDate.entries()].sort(([da], [db]) => {
      if (da === "Schedule" && db !== "Schedule") return 1;
      if (db === "Schedule" && da !== "Schedule") return -1;
      return compareAgendaDayKeys(da, db);
    });
  }, [items]);

  const [activeDay, setActiveDay] = useState(dayEntries[0]?.[0] ?? "");
  const [view, setView] = useState<"timeline" | "list">("timeline");

  if (!items.length) return null;

  const currentKey = dayEntries.some(([d]) => d === activeDay)
    ? activeDay
    : (dayEntries[0]?.[0] ?? "");
  const sessions = [...(dayEntries.find(([d]) => d === currentKey)?.[1] ?? [])].sort(
    comparePublicAgendaItems,
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-display text-lg text-ink">Agenda</h2>
        <div className="flex gap-1 text-2xs">
          <button
            type="button"
            className={`rounded-md px-2 py-1 ${view === "timeline" ? "bg-muted font-medium text-ink" : "text-ink-soft"}`}
            onClick={() => setView("timeline")}
          >
            Timeline
          </button>
          <button
            type="button"
            className={`rounded-md px-2 py-1 ${view === "list" ? "bg-muted font-medium text-ink" : "text-ink-soft"}`}
            onClick={() => setView("list")}
          >
            List
          </button>
        </div>
      </div>

      {dayEntries.length > 1 ? (
        <div className="no-scrollbar flex gap-4 overflow-x-auto border-b border-line">
          {dayEntries.map(([date], index) => {
            const active = date === currentKey;
            return (
              <button
                key={date}
                type="button"
                onClick={() => setActiveDay(date)}
                className={`whitespace-nowrap border-b-2 pb-2 text-sm ${
                  active ? "border-ink font-medium text-ink" : "border-transparent text-ink-soft"
                }`}
              >
                Day {index + 1}
                {date !== "Schedule" ? ` · ${formatDateMedium(date) || date}` : ""}
              </button>
            );
          })}
        </div>
      ) : null}

      {view === "list" ? (
        <ul className="divide-y divide-line rounded-2xl border border-line">
          {sessions.map((s) => (
            <li key={s.id} className="px-4 py-3">
              <p className="text-2xs tabular-nums text-ink-soft">
                {[formatTime(s.startTime), formatTime(s.endTime)].filter(Boolean).join(" – ")}
                {s.type ? ` · ${s.type}` : ""}
              </p>
              <p className="mt-0.5 font-display text-base text-ink">{s.title}</p>
              {s.location ? <p className="mt-0.5 text-xs text-ink-soft">{s.location}</p> : null}
              <SpeakerRow item={s} />
            </li>
          ))}
        </ul>
      ) : (
        <ol className="mt-1 space-y-0 border-l border-line pl-5">
          {sessions.map((s) => (
            <li key={s.id} className="relative pb-5 last:pb-0">
              <span
                className="absolute -left-[1.4rem] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-ink bg-paper"
                aria-hidden="true"
              />
              <p className="text-2xs tabular-nums text-ink-soft">
                {[formatTime(s.startTime), formatTime(s.endTime)].filter(Boolean).join(" – ")}
                {s.type ? (
                  <span className="ml-1 rounded-full border border-line px-1.5 py-0.5 text-2xs uppercase">
                    {s.type}
                  </span>
                ) : null}
              </p>
              <p className="mt-0.5 font-display text-base text-ink">{s.title}</p>
              {s.location ? <p className="mt-0.5 text-xs text-ink-soft">{s.location}</p> : null}
              {s.trackName ? (
                <p className="mt-0.5 text-xs text-ink-soft">Competition: {s.trackName}</p>
              ) : null}
              <SpeakerRow item={s} />
              {s.description ? (
                <p className="mt-1 whitespace-pre-line text-sm text-ink-soft">{s.description}</p>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function SpeakerRow({ item }: { item: PublicAgendaItem }) {
  const speakers =
    item.speakers?.length > 0
      ? item.speakers
      : item.speakerNames.map((name, i) => ({ id: `${i}`, name, photoUrl: "" }));
  if (!speakers.length) return null;
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
      {speakers.map((s) => (
        <Avatar key={s.id} name={s.name} url={s.photoUrl} />
      ))}
      <span className="text-xs text-ink-soft">{speakers.map((s) => s.name).join(", ")}</span>
    </div>
  );
}
