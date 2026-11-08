"use client";

import {
  CalendarClock,
  Coffee,
  Lightbulb,
  MapPin,
  Mic,
  MessageSquare,
  Users,
  Flag,
  DoorOpen,
  Trophy,
  CircleDot,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Session } from "@/src/services/models/agenda.model";
import type { AgendaSessionType } from "@/src/features/agendas/agendaTypes";
import { formatTime } from "@/src/lib/datetime";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { buttonClass } from "@/src/lib/ui";

const TYPE_ICON: Record<AgendaSessionType, LucideIcon> = {
  Opening: DoorOpen,
  Talk: Mic,
  Panel: MessageSquare,
  Workshop: Lightbulb,
  Competition: Trophy,
  Break: Coffee,
  Networking: Users,
  Closing: Flag,
  Other: CircleDot,
};

function Badge({ type }: { type: AgendaSessionType }) {
  const isAside = type === "Break" || type === "Networking";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-2xs font-bold uppercase ${
        isAside ? "border border-line-loud text-ink-soft" : "bg-gray-800 text-white"
      }`}
    >
      {type}
    </span>
  );
}

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
      <img src={url} alt="" className="h-7 w-7 rounded-full object-cover" title={name} />
    );
  }
  return (
    <span
      title={name}
      className="flex h-7 w-7 items-center justify-center rounded-full border border-line bg-muted text-2xs font-medium text-ink-soft"
    >
      {initials || "?"}
    </span>
  );
}

function SessionCard({
  session,
  isLast,
  view,
  onEdit,
  onDelete,
}: {
  session: Session;
  isLast: boolean;
  view: "timeline" | "list";
  onEdit?: (s: Session) => void;
  onDelete?: (s: Session) => void;
}) {
  const Icon = TYPE_ICON[session.type] ?? CircleDot;
  const timeLabel = [formatTime(session.startTime), formatTime(session.endTime)]
    .filter(Boolean)
    .join(" – ");
  const loc = [session.location, session.room].filter(Boolean).join(" · ");

  if (view === "list") {
    return (
      <li className="flex flex-wrap items-start justify-between gap-3 border-b border-line py-3 last:border-0">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge type={session.type} />
            <span className="text-2xs tabular-nums text-ink-soft">{timeLabel}</span>
          </div>
          <p className="mt-1 font-display text-base text-ink">{session.title}</p>
          {loc ? (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-soft">
              <MapPin className="h-3 w-3" aria-hidden />
              {loc}
            </p>
          ) : null}
          {session.trackName ? (
            <p className="mt-0.5 text-xs text-ink-soft">Competition: {session.trackName}</p>
          ) : null}
          {session.speakers.length ? (
            <div className="mt-2 flex items-center gap-1">
              {session.speakers.map((s) => (
                <Avatar key={s.id} name={s.name} url={s.avatarUrl} />
              ))}
              <span className="ml-1 text-xs text-ink-soft">
                {session.speakers.map((s) => s.name).join(", ")}
              </span>
            </div>
          ) : null}
        </div>
        {(onEdit || onDelete) && (
          <div className="flex gap-2">
            {onEdit ? (
              <button
                type="button"
                className={buttonClass("ghost", "sm")}
                onClick={() => onEdit(session)}
              >
                Edit
              </button>
            ) : null}
            {onDelete ? (
              <button
                type="button"
                className={buttonClass("destructive", "sm")}
                onClick={() => onDelete(session)}
              >
                Delete
              </button>
            ) : null}
          </div>
        )}
      </li>
    );
  }

  return (
    <div className="relative flex gap-5">
      <div className="flex w-11 shrink-0 flex-col items-center">
        <span
          aria-hidden="true"
          className="z-[1] flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line-loud bg-paper text-ink-soft"
        >
          <Icon className="h-5 w-5" />
        </span>
        {!isLast && <div className="w-px flex-1 bg-line" />}
      </div>

      <div className={`flex-1 rounded-2xl border border-line bg-paper p-5 ${isLast ? "" : "mb-6"}`}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge type={session.type} />
              <span className="text-2xs tabular-nums text-ink-soft">{timeLabel}</span>
            </div>
            <h3 className="mt-2 font-display text-lg text-ink">{session.title}</h3>
          </div>
          {(onEdit || onDelete) && (
            <div className="flex gap-2">
              {onEdit ? (
                <button
                  type="button"
                  className={buttonClass("ghost", "sm")}
                  onClick={() => onEdit(session)}
                >
                  Edit
                </button>
              ) : null}
              {onDelete ? (
                <button
                  type="button"
                  className={buttonClass("destructive", "sm")}
                  onClick={() => onDelete(session)}
                >
                  Delete
                </button>
              ) : null}
            </div>
          )}
        </div>
        {loc ? (
          <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-soft">
            <MapPin className="h-3.5 w-3.5" aria-hidden />
            {loc}
          </p>
        ) : null}
        {session.trackName ? (
          <p className="mt-1 text-xs text-ink-soft">Competition: {session.trackName}</p>
        ) : null}
        {session.speakers.length ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {session.speakers.map((s) => (
              <div key={s.id} className="flex items-center gap-1.5">
                <Avatar name={s.name} url={s.avatarUrl} />
                <span className="text-xs text-ink-soft">{s.name}</span>
              </div>
            ))}
          </div>
        ) : null}
        {session.description ? (
          <p className="mt-3 whitespace-pre-line text-sm text-ink-soft">{session.description}</p>
        ) : null}
      </div>
    </div>
  );
}

export default function AgendaTimeline({
  sessions,
  view = "timeline",
  onEdit,
  onDelete,
}: {
  sessions: Session[];
  view?: "timeline" | "list";
  onEdit?: (s: Session) => void;
  onDelete?: (s: Session) => void;
}) {
  if (!sessions.length) {
    return (
      <div className="py-12">
        <EmptyState
          icon={<CalendarClock size={28} />}
          title="Nothing scheduled this day"
          description="Add a session to build the run of show."
        />
      </div>
    );
  }

  if (view === "list") {
    return (
      <ul className="rounded-2xl border border-line bg-paper px-4">
        {sessions.map((s) => (
          <SessionCard
            key={s.id}
            session={s}
            isLast
            view="list"
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </ul>
    );
  }

  return (
    <div className="pt-6">
      {sessions.map((s, i) => (
        <SessionCard
          key={s.id}
          session={s}
          isLast={i === sessions.length - 1}
          view="timeline"
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
