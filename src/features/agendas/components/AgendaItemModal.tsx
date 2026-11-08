"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Modal } from "@/src/components/ui/Modal";
import { DateField } from "@/src/shared_components/DateField";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import { AGENDA_SESSION_TYPES, type AgendaSessionType } from "../agendaTypes";
import { findAgendaOverlaps, type OverlapSession } from "../agendaOverlap";
import { saveAgendaItemAction, type AgendaActionResult } from "../actions/agendaItem.action";
import type { Session } from "@/src/services/models/agenda.model";

type SpeakerOpt = { speakerId: string; name: string };
type TrackOpt = { id: string; name: string };

export function AgendaItemModal({
  open,
  onClose,
  eventId,
  organizerId,
  speakers,
  tracks,
  existing,
  editing,
  attendeeTiers = [],
}: {
  open: boolean;
  onClose: () => void;
  eventId: string;
  organizerId: string;
  speakers: SpeakerOpt[];
  tracks: TrackOpt[];
  existing: Session[];
  editing: Session | null;
  attendeeTiers?: string[];
}) {
  const [state, formAction] = useActionState<AgendaActionResult | null, FormData>(
    saveAgendaItemAction,
    null,
  );
  const [type, setType] = useState<AgendaSessionType>("Talk");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [selectedSpeakers, setSelectedSpeakers] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setType(editing.type);
      setDate(editing.date);
      setStartTime(to24(editing.startTime));
      setEndTime(to24(editing.endTime));
      setLocation(editing.location || "");
      setSelectedSpeakers(editing.speakerIds ?? editing.speakers.map((s) => s.id));
    } else {
      setType("Talk");
      setDate("");
      setStartTime("");
      setEndTime("");
      setLocation("");
      setSelectedSpeakers([]);
    }
  }, [open, editing]);

  useEffect(() => {
    if (state?.success) onClose();
  }, [state?.success, onClose]);

  const warnings = useMemo(() => {
    if (!date || !startTime || !endTime) return [];
    const candidate: OverlapSession = {
      id: editing?.id ?? "",
      title: editing?.title || "New session",
      date,
      startTime,
      endTime,
      location,
      speakerIds: selectedSpeakers,
    };
    const others: OverlapSession[] = existing.map((s) => ({
      id: s.id,
      title: s.title,
      date: s.date,
      startTime: to24(s.startTime) || s.startTime,
      endTime: to24(s.endTime) || s.endTime,
      location: s.location,
      speakerIds: s.speakerIds ?? s.speakers.map((x) => x.id),
    }));
    return findAgendaOverlaps(others, candidate);
  }, [date, startTime, endTime, location, selectedSpeakers, existing, editing]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit session" : "Add item"}
      maxWidth="xl"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" className={buttonClass("secondary")} onClick={onClose}>
            Cancel
          </button>
          <SubmitButton
            form="agenda-item-form"
            pendingText="Saving…"
            className={buttonClass("primary")}
          >
            {editing ? "Save changes" : "Add session"}
          </SubmitButton>
        </div>
      }
    >
      <form id="agenda-item-form" action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="eventId" value={eventId} />
        <input type="hidden" name="organizerId" value={organizerId} />
        {editing ? <input type="hidden" name="itemId" value={editing.id} /> : null}

        {state?.error ? <FormFeedback error={state.error} /> : null}

        {warnings.length ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-ink">
            <p className="font-medium">Overlap warnings (you can still save)</p>
            <ul className="mt-1 list-disc pl-4 text-xs text-ink-soft">
              {warnings.map((w, i) => (
                <li key={`${w.kind}-${w.withId}-${i}`}>{w.detail}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="agenda-title" className={labelClass}>
            Title
          </label>
          <input
            id="agenda-title"
            name="title"
            required
            defaultValue={editing?.title ?? ""}
            className={fieldClass}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="sessionType" className={labelClass}>
              Type
            </label>
            <select
              id="sessionType"
              name="sessionType"
              value={type}
              onChange={(e) => setType(e.target.value as AgendaSessionType)}
              className={fieldClass}
            >
              {AGENDA_SESSION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="agenda-date" className={labelClass}>
              Date
            </label>
            <DateField
              id="agenda-date"
              name="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={fieldClass}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="startTime" className={labelClass}>
              Start
            </label>
            <input
              id="startTime"
              name="startTime"
              type="time"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="endTime" className={labelClass}>
              End
            </label>
            <input
              id="endTime"
              name="endTime"
              type="time"
              required
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className={fieldClass}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="location" className={labelClass}>
              Location
            </label>
            <input
              id="location"
              name="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="room" className={labelClass}>
              Room
            </label>
            <input
              id="room"
              name="room"
              defaultValue={editing?.room ?? ""}
              className={fieldClass}
            />
          </div>
        </div>

        {type === "Competition" && tracks.length ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="trackId" className={labelClass}>
              Linked competition
            </label>
            <select
              id="trackId"
              name="trackId"
              defaultValue={editing?.trackId ?? ""}
              className={fieldClass}
            >
              <option value="">Select competition</option>
              {tracks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {speakers.length ? (
          <fieldset>
            <legend className={labelClass}>Speakers</legend>
            <ul className="mt-2 max-h-36 space-y-1 overflow-y-auto rounded-xl border border-line p-3 text-sm">
              {speakers.map((s) => (
                <li key={s.speakerId}>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="speakerIds"
                      value={s.speakerId}
                      checked={selectedSpeakers.includes(s.speakerId)}
                      onChange={() =>
                        setSelectedSpeakers((prev) =>
                          prev.includes(s.speakerId)
                            ? prev.filter((id) => id !== s.speakerId)
                            : [...prev, s.speakerId],
                        )
                      }
                      className="h-4 w-4 accent-current"
                    />
                    {s.name}
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        ) : null}

        {attendeeTiers.length ? (
          <fieldset>
            <legend className={labelClass}>Visible to tiers (optional)</legend>
            <div className="mt-2 flex flex-wrap gap-3">
              {attendeeTiers.map((t) => (
                <label key={t} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    name="tiers"
                    value={t}
                    defaultChecked={editing?.tiers?.includes(t)}
                    className="h-4 w-4 accent-current"
                  />
                  {t}
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="description" className={labelClass}>
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={editing?.description ?? ""}
            className={`${fieldClass} resize-none`}
          />
        </div>
      </form>
    </Modal>
  );
}

/** Best-effort convert display time to HH:mm for <input type="time">. */
function to24(value: string): string {
  const v = String(value || "").trim();
  if (/^\d{1,2}:\d{2}$/.test(v)) return v.padStart(5, "0");
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(v);
  if (!m) return "";
  let h = Number(m[1]);
  const min = m[2];
  const ap = m[3]!.toUpperCase();
  if (ap === "PM" && h < 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${min}`;
}
