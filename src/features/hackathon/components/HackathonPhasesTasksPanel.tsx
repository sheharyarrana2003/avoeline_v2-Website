"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { ConfirmSubmit } from "@/src/shared_components/ui/ConfirmDialog";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import { Card, CardBody } from "@/src/shared_components/ui/Card";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { Modal } from "@/components/ui/Modal";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import { Input } from "@/components/ui/Input";
import type { HackathonTrack } from "../types";
import type { PhaseRow, TaskRow } from "../tasks.service";
import { HACKATHON_KIND_LABELS, isCtfKind } from "../kinds";
import {
  assignTasksToPhase,
  deleteHackathonPhase,
  deleteHackathonTask,
  saveHackathonPhase,
  saveHackathonTask,
} from "../actions/tasks.action";
import { CtfAttachmentFields } from "./CtfAttachmentFields";

function toLocalInput(iso: unknown): string {
  const t = Date.parse(String(iso ?? ""));
  if (!Number.isFinite(t) || Number.isNaN(t)) return "";
  const d = new Date(t);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function rangeLabel(phase: PhaseRow): string {
  const open = toLocalInput(phase.opens_at || phase.starts_at);
  const close = toLocalInput(phase.closes_at || phase.ends_at);
  if (!open && !close) return "No window set";
  return `${open || "Open"} → ${close || "Open-ended"}`;
}

function TaskFields({
  track,
  prefix,
  maxAttachmentMb,
}: {
  track: HackathonTrack;
  prefix: string;
  maxAttachmentMb: number;
}) {
  const ctf = isCtfKind(track.kind);
  return (
    <>
      <Input id={`${prefix}-title`} name="title" label="Title" required />
      <Input id={`${prefix}-points`} name="points" type="number" min={0} label="Points" />
      <Input
        id={`${prefix}-desc`}
        name="description"
        label={ctf ? "Description" : "Brief"}
        wrapperClassName="sm:col-span-2"
      />
      {ctf ? <Input id={`${prefix}-flag`} name="flag" label="Flag (hashed on save)" /> : null}
      {ctf ? <CtfAttachmentFields prefix={prefix} maxAttachmentMb={maxAttachmentMb} /> : null}
    </>
  );
}

export function HackathonPhasesTasksPanel({
  eventId,
  organizerId,
  tracks,
  phases,
  tasks,
  error,
  ok,
  maxAttachmentMb = 10,
  initialTrackFilter = "all",
  initialTaskId = "",
  submittedByTrack = {},
}: {
  eventId: string;
  organizerId: string;
  tracks: HackathonTrack[];
  phases: PhaseRow[];
  tasks: TaskRow[];
  error?: string;
  ok?: string;
  maxAttachmentMb?: number;
  initialTrackFilter?: string;
  initialTaskId?: string;
  submittedByTrack?: Record<string, number>;
}) {
  const tasksPath = `/organizer/${organizerId}/events/${eventId}/tasks`;
  const [trackFilter, setTrackFilter] = useState(initialTrackFilter || "all");
  const [q, setQ] = useState("");
  const [openKeys, setOpenKeys] = useState<Set<string>>(() => new Set());
  const [phaseModal, setPhaseModal] = useState(false);
  const [taskModal, setTaskModal] = useState<{ track: HackathonTrack; phaseId?: string } | null>(
    null,
  );
  const firstMatch = useRef<HTMLElement | null>(null);

  const needle = q.trim().toLowerCase();
  const searching = !!needle;

  const matchTask = (t: TaskRow) =>
    !needle || t.title.toLowerCase().includes(needle) || t.id === initialTaskId;
  const matchPhase = (p: PhaseRow) => {
    if (!needle && !initialTaskId) return true;
    if (p.name.toLowerCase().includes(needle)) return true;
    return tasks.some((t) => t.phase_id === p.id && (matchTask(t) || t.id === initialTaskId));
  };

  useEffect(() => {
    firstMatch.current = null;
    if (!searching && !initialTaskId) {
      setOpenKeys(new Set());
      return;
    }
    const next = new Set<string>();
    for (const p of phases) {
      if (matchPhase(p)) {
        next.add(`phase:${p.id}`);
        if (trackFilter === "all") next.add(`track:${p.track_id}`);
      }
    }
    for (const t of tracks) {
      const independent = tasks.filter(
        (task) => task.track_id === t.id && !task.phase_id && matchTask(task),
      );
      if (independent.length && (searching || independent.some((x) => x.id === initialTaskId))) {
        next.add(`indep:${t.id}`);
        if (trackFilter === "all") next.add(`track:${t.id}`);
      }
    }
    setOpenKeys(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- expand from search / deep-link only
  }, [q, initialTaskId, trackFilter]);

  useEffect(() => {
    firstMatch.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [openKeys]);

  function toggle(key: string) {
    setOpenKeys((prev) => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });
  }

  const visibleTracks = trackFilter === "all" ? tracks : tracks.filter((t) => t.id === trackFilter);

  const pills = (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        className={buttonClass(trackFilter === "all" ? "primary" : "secondary", "sm")}
        onClick={() => setTrackFilter("all")}
      >
        All competitions
      </button>
      {tracks.map((t) => (
        <button
          key={t.id}
          type="button"
          className={buttonClass(trackFilter === t.id ? "primary" : "secondary", "sm")}
          onClick={() => setTrackFilter(t.id)}
        >
          {t.name}
        </button>
      ))}
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search phases and tasks"
        aria-label="Search phases and tasks"
        className={fieldClass + " max-w-sm"}
      />
      <button
        type="button"
        className={buttonClass("primary", "sm")}
        onClick={() => setPhaseModal(true)}
      >
        <Plus className="h-3.5 w-3.5" />
        Add Phase
      </button>
    </div>
  );

  function PhaseBody({ phase, track }: { phase: PhaseRow; track: HackathonTrack | undefined }) {
    const trackTasks = tasks.filter((t) => t.track_id === phase.track_id);
    const inPhase = trackTasks.filter((t) => t.phase_id === phase.id);
    return (
      <div className="space-y-4 border-t border-line px-4 py-4">
        <form action={assignTasksToPhase} className="space-y-2">
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="organizerId" value={organizerId} />
          <input type="hidden" name="phaseId" value={phase.id} />
          <input type="hidden" name="returnTo" value={tasksPath} />
          <p className="text-xs font-semibold uppercase text-ink-soft">Tasks in this phase</p>
          {trackTasks.length ? (
            trackTasks.map((task) => (
              <label
                key={task.id}
                id={`task-${task.id}`}
                className="flex items-center gap-2 text-sm text-ink"
              >
                <input
                  type="checkbox"
                  name="taskIds"
                  value={task.id}
                  defaultChecked={task.phase_id === phase.id}
                />
                {task.title}
                {!task.phase_id ? <span className="text-ink-faint">(independent)</span> : null}
              </label>
            ))
          ) : (
            <p className="text-sm text-ink-soft">No tasks on this competition yet.</p>
          )}
          {trackTasks.length ? (
            <SubmitButton className={buttonClass("secondary", "sm")}>Save checklist</SubmitButton>
          ) : null}
        </form>
        {inPhase.map((task) => (
          <p key={task.id} className="text-sm text-ink">
            {task.title} <span className="text-ink-soft">· {task.points ?? 0} pts</span>
          </p>
        ))}
        {track ? (
          <button
            type="button"
            className={buttonClass("secondary", "sm")}
            onClick={() => setTaskModal({ track, phaseId: phase.id })}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Task
          </button>
        ) : null}
        <form action={deleteHackathonPhase}>
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="organizerId" value={organizerId} />
          <input type="hidden" name="phaseId" value={phase.id} />
          <input type="hidden" name="returnTo" value={tasksPath} />
          <ConfirmSubmit
            tone="danger"
            title={`Remove ${phase.name}?`}
            description="Tasks in this phase become independent."
            confirmLabel="Remove phase"
            className="text-2xs uppercase text-ink-faint hover:text-ink"
          >
            Remove phase
          </ConfirmSubmit>
        </form>
      </div>
    );
  }

  function IndependentBody({ track }: { track: HackathonTrack }) {
    const independent = tasks.filter((t) => t.track_id === track.id && !t.phase_id);
    return (
      <div className="space-y-3 border-t border-line px-4 py-4">
        <button
          type="button"
          className={buttonClass("secondary", "sm")}
          onClick={() => setTaskModal({ track })}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Independent Task
        </button>
        {independent.length ? (
          <ul className="divide-y divide-line border-y border-line">
            {independent.map((task) => (
              <li
                key={task.id}
                id={`task-${task.id}`}
                className="flex items-center justify-between py-2 text-sm"
              >
                <span>
                  {task.title} <span className="text-ink-soft">· {task.points ?? 0} pts</span>
                </span>
                <form action={deleteHackathonTask}>
                  <input type="hidden" name="trackId" value={track.id} />
                  <input type="hidden" name="eventId" value={eventId} />
                  <input type="hidden" name="organizerId" value={organizerId} />
                  <input type="hidden" name="taskId" value={task.id} />
                  <input type="hidden" name="returnTo" value={tasksPath} />
                  <ConfirmSubmit
                    tone="danger"
                    title={`Delete ${task.title}?`}
                    description="Completions for this task are removed."
                    confirmLabel="Delete"
                    className="text-2xs uppercase text-ink-faint hover:text-ink"
                  >
                    Delete
                  </ConfirmSubmit>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-ink-soft">No independent tasks on this competition.</p>
        )}
      </div>
    );
  }

  function PhaseRowCard({ phase, dim }: { phase: PhaseRow; dim?: boolean }) {
    const track = tracks.find((t) => t.id === phase.track_id);
    const inPhase = tasks.filter((t) => t.phase_id === phase.id);
    const hit = searching && matchPhase(phase);
    const key = `phase:${phase.id}`;
    const open = openKeys.has(key);
    return (
      <div
        ref={
          hit && !firstMatch.current
            ? (el) => {
                firstMatch.current = el;
              }
            : undefined
        }
        className={`rounded-xl border border-line bg-paper ${dim && searching && !hit ? "opacity-40" : ""}`}
      >
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
          onClick={() => toggle(key)}
          aria-expanded={open}
        >
          <span>
            <span className="block text-sm font-medium text-ink">{phase.name}</span>
            <span className="text-xs text-ink-soft">{rangeLabel(phase)}</span>
          </span>
          <span className="text-xs tabular-nums text-ink-soft">
            {inPhase.length}/{tasks.filter((t) => t.track_id === phase.track_id).length} tasks
          </span>
        </button>
        {open ? <PhaseBody phase={phase} track={track} /> : null}
      </div>
    );
  }

  const list = useMemo(() => {
    if (trackFilter !== "all") {
      const track = tracks.find((t) => t.id === trackFilter);
      if (!track) return null;
      const trackPhases = phases.filter((p) => p.track_id === track.id);
      return (
        <div className="space-y-2">
          {trackPhases.map((p) => (
            <PhaseRowCard key={p.id} phase={p} dim />
          ))}
          <div
            className={`rounded-xl border border-line bg-paper ${searching && !tasks.some((t) => t.track_id === track.id && !t.phase_id && matchTask(t)) ? "opacity-40" : ""}`}
          >
            <button
              type="button"
              className="flex w-full items-center justify-between px-4 py-3 text-left"
              onClick={() => toggle(`indep:${track.id}`)}
              aria-expanded={openKeys.has(`indep:${track.id}`)}
            >
              <span className="text-sm font-medium text-ink">Independent tasks</span>
              <span className="text-xs text-ink-soft">
                {tasks.filter((t) => t.track_id === track.id && !t.phase_id).length}
              </span>
            </button>
            {openKeys.has(`indep:${track.id}`) ? <IndependentBody track={track} /> : null}
          </div>
        </div>
      );
    }
    return (
      <div className="space-y-2">
        {visibleTracks.map((track) => {
          const trackPhases = phases.filter((p) => p.track_id === track.id);
          const trackTasks = tasks.filter((t) => t.track_id === track.id);
          const hit =
            searching &&
            (track.name.toLowerCase().includes(needle) ||
              trackPhases.some(matchPhase) ||
              trackTasks.some(matchTask));
          const key = `track:${track.id}`;
          const open = openKeys.has(key);
          return (
            <div
              key={track.id}
              className={`rounded-xl border border-line bg-paper ${searching && !hit ? "opacity-40" : ""}`}
            >
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                onClick={() => toggle(key)}
                aria-expanded={open}
              >
                <span>
                  <span className="block text-sm font-medium text-ink">{track.name}</span>
                  <span className="text-xs text-ink-soft">{HACKATHON_KIND_LABELS[track.kind]}</span>
                </span>
                <span className="text-xs tabular-nums text-ink-soft">
                  {trackPhases.length} phases · {trackTasks.length} tasks
                  {submittedByTrack[track.id] != null
                    ? ` · ${submittedByTrack[track.id]} submitted`
                    : ""}
                </span>
              </button>
              {open ? (
                <div className="space-y-2 border-t border-line p-3">
                  {trackPhases.map((p) => (
                    <PhaseRowCard key={p.id} phase={p} />
                  ))}
                  <div className="rounded-xl border border-line">
                    <button
                      type="button"
                      className="flex w-full items-center justify-between px-4 py-3 text-left"
                      onClick={() => toggle(`indep:${track.id}`)}
                    >
                      <span className="text-sm font-medium text-ink">Independent tasks</span>
                      <span className="text-xs text-ink-soft">
                        {trackTasks.filter((t) => !t.phase_id).length}
                      </span>
                    </button>
                    {openKeys.has(`indep:${track.id}`) ? <IndependentBody track={track} /> : null}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackFilter, tracks, phases, tasks, openKeys, q, submittedByTrack]);

  return (
    <div className="space-y-6">
      {error ? <FormFeedback error={error} /> : null}
      {ok ? <FormFeedback success={ok} /> : null}
      {pills}
      <Card title="Phases & tasks">
        <CardBody className="space-y-3">{list}</CardBody>
      </Card>

      <Modal
        open={phaseModal}
        onClose={() => setPhaseModal(false)}
        title="Add a phase"
        description="Window when this phase is open."
        maxWidth="lg"
      >
        <form action={saveHackathonPhase} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="organizerId" value={organizerId} />
          <input type="hidden" name="returnTo" value={tasksPath} />
          <div className="sm:col-span-2">
            <label htmlFor="phase-track" className={labelClass}>
              Competition
            </label>
            <select
              id="phase-track"
              name="trackId"
              className={fieldClass}
              defaultValue={trackFilter !== "all" ? trackFilter : (tracks[0]?.id ?? "")}
            >
              {tracks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} · {HACKATHON_KIND_LABELS[t.kind]}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink sm:col-span-2">
            <input type="checkbox" name="allTracks" />
            Apply this phase to every competition
          </label>
          <Input id="phase-name" name="name" label="Phase name" required />
          <div>
            <label htmlFor="phase-opens" className={labelClass}>
              Opens
            </label>
            <input id="phase-opens" name="opensAt" type="datetime-local" className={fieldClass} />
          </div>
          <div>
            <label htmlFor="phase-closes" className={labelClass}>
              Closes
            </label>
            <input id="phase-closes" name="closesAt" type="datetime-local" className={fieldClass} />
          </div>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <button
              type="button"
              className={buttonClass("ghost", "sm")}
              onClick={() => setPhaseModal(false)}
            >
              Cancel
            </button>
            <SubmitButton className={buttonClass()}>Save phase</SubmitButton>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!taskModal}
        onClose={() => setTaskModal(null)}
        title={taskModal?.phaseId ? "Add a task" : "Add independent task"}
        description={
          taskModal
            ? `${taskModal.track.name} · ${HACKATHON_KIND_LABELS[taskModal.track.kind]}`
            : undefined
        }
        maxWidth="lg"
        className="max-h-[90vh] overflow-y-auto"
      >
        {taskModal ? (
          <form action={saveHackathonTask} className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="trackId" value={taskModal.track.id} />
            <input type="hidden" name="eventId" value={eventId} />
            <input type="hidden" name="organizerId" value={organizerId} />
            {taskModal.phaseId ? (
              <input type="hidden" name="phaseId" value={taskModal.phaseId} />
            ) : null}
            <input type="hidden" name="returnTo" value={tasksPath} />
            <TaskFields
              track={taskModal.track}
              prefix={`modal-${taskModal.phaseId || taskModal.track.id}`}
              maxAttachmentMb={maxAttachmentMb}
            />
            <div className="flex justify-end gap-2 sm:col-span-2">
              <button
                type="button"
                className={buttonClass("ghost", "sm")}
                onClick={() => setTaskModal(null)}
              >
                Cancel
              </button>
              <SubmitButton className={buttonClass()}>
                {taskModal.phaseId ? "Add task" : "Add independent task"}
              </SubmitButton>
            </div>
          </form>
        ) : null}
      </Modal>
    </div>
  );
}
