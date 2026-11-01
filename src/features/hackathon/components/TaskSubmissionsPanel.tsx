"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { buttonClass, fieldClass, labelClass, tableCell, tableHead, tableRow } from "@/src/lib/ui";
import { formatExactSecond } from "@/src/lib/datetime";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import {
  getSubmissionDownloadUrlAction,
  reviewTaskSubmissionAction,
} from "../actions/taskSubmissions.action";
import type { TaskSubmissionRow, TaskSubmissionStatus } from "../taskSubmissions.types";
import { isSafeInlinePreview } from "../taskSubmissions.types";

type TrackOpt = { id: string; name: string };
type PhaseOpt = { id: string; name: string; trackId: string };
type TaskOpt = { id: string; title: string; trackId: string; phaseId: string | null };

export function TaskSubmissionsPanel({
  eventId,
  timeZone,
  tracks,
  phases,
  tasks,
  rows,
  dashHref,
}: {
  eventId: string;
  timeZone: string;
  tracks: TrackOpt[];
  phases: PhaseOpt[];
  tasks: TaskOpt[];
  rows: TaskSubmissionRow[];
  dashHref: string;
}) {
  const [trackId, setTrackId] = useState("all");
  const [phaseId, setPhaseId] = useState("all");
  const [taskId, setTaskId] = useState("all");
  const [status, setStatus] = useState("all");
  const [teamQ, setTeamQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selected, setSelected] = useState<TaskSubmissionRow | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [points, setPoints] = useState("");
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const filteredPhases = useMemo(
    () => phases.filter((p) => trackId === "all" || p.trackId === trackId),
    [phases, trackId],
  );
  const filteredTasks = useMemo(
    () =>
      tasks.filter(
        (t) =>
          (trackId === "all" || t.trackId === trackId) &&
          (phaseId === "all" || t.phaseId === phaseId || (phaseId === "none" && !t.phaseId)),
      ),
    [tasks, trackId, phaseId],
  );

  const visible = useMemo(() => {
    const q = teamQ.trim().toLowerCase();
    const fromMs = from ? Date.parse(from) : null;
    const toMs = to ? Date.parse(to) : null;
    return rows.filter((r) => {
      if (trackId !== "all" && r.trackId !== trackId) return false;
      if (phaseId !== "all" && phaseId !== "none" && r.phaseId !== phaseId) return false;
      if (phaseId === "none" && r.phaseId) return false;
      if (taskId !== "all" && r.taskId !== taskId) return false;
      if (status !== "all" && r.status !== status) return false;
      if (q && !r.teamName.toLowerCase().includes(q)) return false;
      const at = Date.parse(r.submittedAt);
      if (fromMs != null && Number.isFinite(fromMs) && at < fromMs) return false;
      if (toMs != null && Number.isFinite(toMs) && at > toMs) return false;
      return true;
    });
  }, [rows, trackId, phaseId, taskId, status, teamQ, from, to]);

  function openRow(row: TaskSubmissionRow) {
    setSelected(row);
    setNote(row.reviewNote || "");
    setPoints(row.pointsAwarded != null ? String(row.pointsAwarded) : "");
    setPreviewUrl(null);
    setMsg(null);
    const kind = isSafeInlinePreview(row.mime);
    if (row.filePath && (kind === "image" || kind === "pdf" || kind === "text")) {
      startTransition(async () => {
        const res = await getSubmissionDownloadUrlAction({ eventId, submissionId: row.id });
        if (res.ok) setPreviewUrl(res.data.url);
      });
    }
  }

  function review(next: TaskSubmissionStatus) {
    if (!selected) return;
    startTransition(async () => {
      const res = await reviewTaskSubmissionAction({
        eventId,
        submissionId: selected.id,
        status: next,
        reviewNote: note,
        pointsAwarded: points.trim() === "" ? null : Number(points),
      });
      if (!res.ok) {
        setMsg(res.error.message);
        return;
      }
      setMsg("Saved.");
      setSelected({
        ...selected,
        status: next,
        reviewNote: note,
        pointsAwarded: points ? Number(points) : null,
      });
    });
  }

  function download() {
    if (!selected?.filePath) return;
    startTransition(async () => {
      const res = await getSubmissionDownloadUrlAction({ eventId, submissionId: selected.id });
      if (res.ok) window.open(res.data.url, "_blank", "noopener,noreferrer");
      else setMsg(res.error.message);
    });
  }

  function exportCsv() {
    const header = [
      "team",
      "competition",
      "phase",
      "task",
      "status",
      "submitted_at",
      "link",
      "file",
      "points",
    ];
    const lines = [
      header.join(","),
      ...visible.map((r) =>
        [
          r.teamName,
          r.trackName,
          r.phaseName || "",
          r.taskTitle,
          r.status,
          r.submittedAt,
          r.linkUrl || "",
          r.fileName || "",
          r.pointsAwarded ?? "",
        ]
          .map((c) => `"${String(c).replace(/"/g, '""')}"`)
          .join(","),
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "task-submissions.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const previewKind = selected ? isSafeInlinePreview(selected.mime) : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={buttonClass(trackId === "all" ? "primary" : "secondary", "sm")}
          onClick={() => {
            setTrackId("all");
            setPhaseId("all");
            setTaskId("all");
          }}
        >
          All
        </button>
        {tracks.map((t) => (
          <button
            key={t.id}
            type="button"
            className={buttonClass(trackId === t.id ? "primary" : "secondary", "sm")}
            onClick={() => {
              setTrackId(t.id);
              setPhaseId("all");
              setTaskId("all");
            }}
          >
            {t.name}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex flex-col gap-1">
          <label className={labelClass} htmlFor="sub-phase">
            Phase
          </label>
          <select
            id="sub-phase"
            className={fieldClass}
            value={phaseId}
            onChange={(e) => {
              setPhaseId(e.target.value);
              setTaskId("all");
            }}
          >
            <option value="all">All phases</option>
            <option value="none">No phase</option>
            {filteredPhases.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelClass} htmlFor="sub-task">
            Task
          </label>
          <select
            id="sub-task"
            className={fieldClass}
            value={taskId}
            onChange={(e) => setTaskId(e.target.value)}
          >
            <option value="all">All tasks</option>
            {filteredTasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelClass} htmlFor="sub-status">
            Status
          </label>
          <select
            id="sub-status"
            className={fieldClass}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="submitted">Submitted</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="late">Late</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelClass} htmlFor="sub-team">
            Team search
          </label>
          <input
            id="sub-team"
            className={fieldClass}
            value={teamQ}
            onChange={(e) => setTeamQ(e.target.value)}
            placeholder="Night Shift"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelClass} htmlFor="sub-from">
            From
          </label>
          <input
            id="sub-from"
            type="datetime-local"
            className={fieldClass}
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelClass} htmlFor="sub-to">
            To
          </label>
          <input
            id="sub-to"
            type="datetime-local"
            className={fieldClass}
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          className={buttonClass("secondary", "sm")}
          onClick={exportCsv}
          disabled={!visible.length}
        >
          Export CSV
        </button>
      </div>

      {!visible.length ? (
        <p className="text-sm text-ink-soft">No task submissions match these filters.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-3xl">
            <thead>
              <tr>
                <th className={tableHead}>Team</th>
                <th className={tableHead}>Competition</th>
                <th className={tableHead}>Phase</th>
                <th className={tableHead}>Task</th>
                <th className={tableHead}>Type</th>
                <th className={tableHead}>Submitted</th>
                <th className={tableHead}>Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr
                  key={r.id}
                  className={`${tableRow} cursor-pointer hover:bg-muted/40`}
                  onClick={() => openRow(r)}
                >
                  <td className={tableCell}>{r.teamName}</td>
                  <td className={tableCell}>{r.trackName}</td>
                  <td className={tableCell}>{r.phaseName || "—"}</td>
                  <td className={tableCell}>
                    <Link
                      href={`${dashHref}/tasks?track=${r.trackId}&task=${r.taskId}`}
                      className="hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {r.taskTitle}
                    </Link>
                  </td>
                  <td className={tableCell}>
                    {r.filePath ? "File" : r.linkUrl ? "Link" : r.textAnswer ? "Text" : "—"}
                  </td>
                  <td className={`${tableCell} tabular-nums text-xs`}>
                    {formatExactSecond(r.submittedAt, timeZone)}
                  </td>
                  <td className={tableCell}>
                    <StatusBadge status={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? selected.taskTitle : "Submission"}
        description={
          selected
            ? `${selected.teamName} · ${formatExactSecond(selected.submittedAt, timeZone)}`
            : undefined
        }
        maxWidth="2xl"
      >
        {selected ? (
          <div className="space-y-4">
            {msg ? <p className="text-sm text-ink-soft">{msg}</p> : null}
            {selected.textAnswer ? (
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg border border-line bg-paper p-3 text-sm text-ink">
                {selected.textAnswer}
              </pre>
            ) : null}
            {selected.linkUrl ? (
              <p className="text-sm">
                <a
                  href={selected.linkUrl}
                  className="text-ink underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {selected.linkUrl}
                </a>
              </p>
            ) : null}
            {selected.filePath ? (
              <div className="space-y-2">
                {previewKind === "image" && previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt=""
                    className="max-h-80 w-auto rounded-lg border border-line"
                  />
                ) : null}
                {previewKind === "pdf" && previewUrl ? (
                  <iframe
                    title="PDF preview"
                    src={previewUrl}
                    className="h-80 w-full rounded-lg border border-line"
                  />
                ) : null}
                {previewKind === "text" && previewUrl ? (
                  <p className="text-xs text-ink-soft">
                    Text file ready — use Download (attachment).
                  </p>
                ) : null}
                {!previewKind ? (
                  <p className="text-sm text-ink-soft">
                    This file type is not previewed inline. Download with attachment disposition.
                  </p>
                ) : null}
                <button
                  type="button"
                  className={buttonClass("secondary", "sm")}
                  onClick={download}
                  disabled={pending}
                >
                  Download {selected.fileName || "file"}
                </button>
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className={labelClass} htmlFor="rev-note">
                  Review note
                </label>
                <textarea
                  id="rev-note"
                  className={fieldClass}
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelClass} htmlFor="rev-pts">
                  Points awarded
                </label>
                <input
                  id="rev-pts"
                  className={fieldClass}
                  type="number"
                  min={0}
                  value={points}
                  onChange={(e) => setPoints(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={buttonClass("primary", "sm")}
                disabled={pending}
                onClick={() => review("accepted")}
              >
                Accept
              </button>
              <button
                type="button"
                className={buttonClass("secondary", "sm")}
                disabled={pending}
                onClick={() => review("rejected")}
              >
                Reject
              </button>
              <button
                type="button"
                className={buttonClass("secondary", "sm")}
                disabled={pending}
                onClick={() => review("late")}
              >
                Mark late
              </button>
              <button
                type="button"
                className={buttonClass("secondary", "sm")}
                disabled={pending}
                onClick={() => review("submitted")}
              >
                Reset to submitted
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
