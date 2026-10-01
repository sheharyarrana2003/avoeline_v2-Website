"use client";

import { useState } from "react";
import { ConfirmSubmit } from "@/src/shared_components/ui/ConfirmDialog";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import { Card, CardBody } from "@/src/shared_components/ui/Card";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
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

function toLocalInput(iso: unknown): string {
  const t = Date.parse(String(iso ?? ""));
  if (!Number.isFinite(t) || Number.isNaN(t)) return "";
  const d = new Date(t);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function HackathonPhasesTasksPanel({
  eventId,
  organizerId,
  tracks,
  phases,
  tasks,
  error,
  ok,
}: {
  eventId: string;
  organizerId: string;
  tracks: HackathonTrack[];
  phases: PhaseRow[];
  tasks: TaskRow[];
  error?: string;
  ok?: string;
}) {
  const tasksPath = `/organizer/${organizerId}/events/${eventId}/tasks`;
  const [trackFilter, setTrackFilter] = useState("all");
  const [q, setQ] = useState("");
  const visibleTracks = trackFilter === "all" ? tracks : tracks.filter((t) => t.id === trackFilter);
  const needle = q.trim().toLowerCase();
  const phasesFiltered = phases.filter((p) => {
    if (trackFilter !== "all" && p.track_id !== trackFilter) return false;
    if (!needle) return true;
    const phaseHit = p.name.toLowerCase().includes(needle);
    const taskHit = tasks.some(
      (t) => t.phase_id === p.id && t.title.toLowerCase().includes(needle),
    );
    return phaseHit || taskHit;
  });
  const tasksByTrack = new Map<string, TaskRow[]>();
  for (const task of tasks) {
    if (needle && !task.title.toLowerCase().includes(needle) && !phases.some((p) => p.id === task.phase_id && p.name.toLowerCase().includes(needle))) {
      continue;
    }
    const list = tasksByTrack.get(task.track_id) ?? [];
    list.push(task);
    tasksByTrack.set(task.track_id, list);
  }

  return (
    <div className="space-y-10">
      {error ? <FormFeedback error={error} /> : null}
      {ok ? <FormFeedback success={ok} /> : null}

      <div className="flex flex-wrap gap-3">
        <select
          value={trackFilter}
          onChange={(e) => setTrackFilter(e.target.value)}
          className={fieldClass + " max-w-xs"}
          aria-label="Filter by competition"
        >
          <option value="all">All competitions</option>
          {tracks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search phases and tasks"
          className={fieldClass + " max-w-sm"}
        />
      </div>

      <Card title="Define a phase">
        <CardBody>
          <form action={saveHackathonPhase} className="grid gap-4 sm:grid-cols-2">
            <input type="hidden" name="eventId" value={eventId} />
            <input type="hidden" name="organizerId" value={organizerId} />
            <input type="hidden" name="returnTo" value={tasksPath} />
            <div className="sm:col-span-2">
              <label htmlFor="phase-track" className={labelClass}>
                Competition
              </label>
              <select id="phase-track" name="trackId" className={fieldClass} defaultValue={tracks[0]?.id ?? ""}>
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
            <div className="sm:col-span-2">
              <SubmitButton className={buttonClass()}>Save phase</SubmitButton>
            </div>
          </form>
        </CardBody>
      </Card>

      {phasesFiltered.map((phase) => {
        const track = tracks.find((t) => t.id === phase.track_id);
        const trackTasks = tasksByTrack.get(phase.track_id || "") ?? [];
        return (
          <Card key={phase.id} title={`${phase.name} · ${track?.name ?? "Competition"}`}>
            <CardBody>
              <p className="mb-4 text-xs text-ink-soft">
                {toLocalInput(phase.opens_at || phase.starts_at) || "No open time"} →{" "}
                {toLocalInput(phase.closes_at || phase.ends_at) || "No close time"}
              </p>
              <form action={assignTasksToPhase} className="space-y-2">
                <input type="hidden" name="eventId" value={eventId} />
                <input type="hidden" name="organizerId" value={organizerId} />
                <input type="hidden" name="phaseId" value={phase.id} />
                <input type="hidden" name="returnTo" value={tasksPath} />
                <p className="text-xs font-semibold uppercase text-ink-soft">Tasks in this phase</p>
                {trackTasks.length ? (
                  trackTasks.map((task) => (
                    <label key={task.id} className="flex items-center gap-2 text-sm text-ink">
                      <input type="checkbox" name="taskIds" value={task.id} defaultChecked={task.phase_id === phase.id} />
                      {task.title}
                      {!task.phase_id ? <span className="text-ink-faint">(independent)</span> : null}
                    </label>
                  ))
                ) : (
                  <p className="text-sm text-ink-soft">No tasks on this competition yet. Add one below.</p>
                )}
                {trackTasks.length ? (
                  <SubmitButton className={buttonClass("secondary", "sm")}>Save checklist</SubmitButton>
                ) : null}
              </form>
              {track ? (
                <form action={saveHackathonTask} className="mt-6 grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
                  <input type="hidden" name="trackId" value={track.id} />
                  <input type="hidden" name="eventId" value={eventId} />
                  <input type="hidden" name="organizerId" value={organizerId} />
                  <input type="hidden" name="phaseId" value={phase.id} />
                  <input type="hidden" name="returnTo" value={tasksPath} />
                  <p className="text-xs font-semibold uppercase text-ink-soft sm:col-span-2">Add a task to this phase</p>
                  <Input id={`phase-title-${phase.id}`} name="title" label="Title" required />
                  <Input id={`phase-points-${phase.id}`} name="points" type="number" min={0} label="Points" />
                  <Input
                    id={`phase-desc-${phase.id}`}
                    name="description"
                    label={isCtfKind(track.kind) ? "Description" : "Brief"}
                    wrapperClassName="sm:col-span-2"
                  />
                  {isCtfKind(track.kind) ? (
                    <Input id={`phase-flag-${phase.id}`} name="flag" label="Flag (hashed on save)" />
                  ) : null}
                  <div className="sm:col-span-2">
                    <SubmitButton className={buttonClass("secondary", "sm")}>Add task to phase</SubmitButton>
                  </div>
                </form>
              ) : null}
              <form action={deleteHackathonPhase} className="mt-4">
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
            </CardBody>
          </Card>
        );
      })}

      <Card title="Independent task">
        <CardBody>
          <p className="mb-4 text-sm text-ink-soft">
            Tasks with no phase stay visible whenever the competition is open. Attach them to a phase with the checklist above.
          </p>
          {visibleTracks.map((track) => {
            const ctf = isCtfKind(track.kind);
            const independent = (tasksByTrack.get(track.id) ?? []).filter((t) => !t.phase_id);
            return (
              <div key={track.id} className="mb-8 border-t border-line pt-6">
                <h3 className="mb-3 text-sm font-semibold text-ink">
                  {track.name} · {HACKATHON_KIND_LABELS[track.kind]}
                </h3>
                <form action={saveHackathonTask} className="mb-4 grid gap-3 sm:grid-cols-2">
                  <input type="hidden" name="trackId" value={track.id} />
                  <input type="hidden" name="eventId" value={eventId} />
                  <input type="hidden" name="organizerId" value={organizerId} />
                  <input type="hidden" name="returnTo" value={tasksPath} />
                  <Input id={`title-${track.id}`} name="title" label="Title" required />
                  <Input id={`points-${track.id}`} name="points" type="number" min={0} label="Points" />
                  <Input
                    id={`desc-${track.id}`}
                    name="description"
                    label={ctf ? "Description" : "Brief"}
                    wrapperClassName="sm:col-span-2"
                  />
                  {ctf ? <Input id={`flag-${track.id}`} name="flag" label="Flag (hashed on save)" /> : null}
                  <div className="sm:col-span-2">
                    <SubmitButton className={buttonClass("secondary", "sm")}>Add independent task</SubmitButton>
                  </div>
                </form>
                {independent.length ? (
                  <ul className="divide-y divide-line border-y border-line">
                    {independent.map((task) => (
                      <li key={task.id} className="flex items-center justify-between py-2 text-sm">
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
          })}
        </CardBody>
      </Card>
    </div>
  );
}
