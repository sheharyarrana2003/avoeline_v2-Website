"use client";

import { useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { List, Plus, GanttChart } from "lucide-react";
import AgendaHeader from "@/src/features/agendas/components/AgendaHeader";
import AgendaTimeline from "@/src/features/agendas/components/AgendaTimeline";
import { AgendaItemModal } from "@/src/features/agendas/components/AgendaItemModal";
import { AgendaDay, Session } from "@/src/services/models/agenda.model";
import { buttonClass } from "@/src/lib/ui";
import { deleteAgendaItemAction } from "../actions/agendaItem.action";

interface AgendaClientContentProps {
  id: string;
  organizer_id: string;
  days: AgendaDay[];
  sessionsByDay: Record<string, Session[]>;
  speakers: { speakerId: string; name: string }[];
  tracks: { id: string; name: string }[];
  attendeeTiers?: string[];
}

function AgendaContent({
  id,
  organizer_id,
  days,
  sessionsByDay,
  speakers,
  tracks,
  attendeeTiers = [],
}: AgendaClientContentProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeDate = searchParams.get("day") || days[0]?.date || "";
  const activeSessions = sessionsByDay[activeDate] || [];
  const allSessions = useMemo(() => Object.values(sessionsByDay).flat(), [sessionsByDay]);

  const [view, setView] = useState<"timeline" | "list">("timeline");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Session | null>(null);

  const openAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };
  const openEdit = (s: Session) => {
    setEditing(s);
    setModalOpen(true);
  };
  const onDelete = async (s: Session) => {
    if (!confirm(`Delete “${s.title}”?`)) return;
    const fd = new FormData();
    fd.set("eventId", id);
    fd.set("organizerId", organizer_id);
    fd.set("itemId", s.id);
    await deleteAgendaItemAction(fd);
    router.refresh();
  };

  return (
    <>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-lg border border-line p-0.5">
          <button
            type="button"
            className={`${buttonClass(view === "timeline" ? "secondary" : "ghost", "sm")} gap-1`}
            onClick={() => setView("timeline")}
          >
            <GanttChart size={14} aria-hidden />
            Timeline
          </button>
          <button
            type="button"
            className={`${buttonClass(view === "list" ? "secondary" : "ghost", "sm")} gap-1`}
            onClick={() => setView("list")}
          >
            <List size={14} aria-hidden />
            List
          </button>
        </div>
        <button type="button" className={buttonClass("primary", "sm")} onClick={openAdd}>
          <Plus size={14} aria-hidden />
          Add item
        </button>
      </div>

      <AgendaHeader
        id={id}
        organizer_id={organizer_id}
        days={days}
        sessionsByDay={sessionsByDay}
        activeDate={activeDate}
        onAdd={openAdd}
      />
      <AgendaTimeline sessions={activeSessions} view={view} onEdit={openEdit} onDelete={onDelete} />

      <AgendaItemModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
          router.refresh();
        }}
        eventId={id}
        organizerId={organizer_id}
        speakers={speakers}
        tracks={tracks}
        existing={allSessions}
        editing={editing}
        attendeeTiers={attendeeTiers}
      />
    </>
  );
}

export default function AgendaClientContent(props: AgendaClientContentProps) {
  return (
    <Suspense fallback={<div className="p-8 text-ink-soft">Loading agenda...</div>}>
      <AgendaContent {...props} />
    </Suspense>
  );
}
