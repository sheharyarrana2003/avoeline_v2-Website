"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, Check } from "lucide-react";
import type { ScoreboardDetailRow } from "../tasks.service";
import { tableCell, tableHead, tableRow } from "@/src/lib/ui";

function relative(iso: string | null, nowMs: number): string {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  const sec = Math.max(0, Math.round((nowMs - t) / 1000));
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.round(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.round(sec / 3600)}h ago`;
  return `${Math.round(sec / 86400)}d ago`;
}

function exact(iso: string | null, timeZone = "UTC"): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone,
      dateStyle: "medium",
      timeStyle: "medium",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function LiveScoreboardTable({
  rows,
  tasksHref,
  trackId,
  timeZone = "UTC",
}: {
  rows: ScoreboardDetailRow[];
  tasksHref: string;
  trackId: string;
  timeZone?: string;
}) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [nowMs, setNowMs] = useState<number | null>(null);
  useEffect(() => {
    setNowMs(Date.now());
  }, []);
  if (!rows.length) {
    return (
      <p className="text-sm text-ink-soft">
        No teams on this competition yet — the scoreboard fills as teams join and complete tasks.
      </p>
    );
  }

  const noSolves = rows.every((r) => r.points === 0 && r.solved === 0);

  function toggle(id: string) {
    setOpen((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  return (
    <div className="overflow-x-auto">
      {noSolves ? (
        <p className="mb-3 text-sm text-ink-soft">
          No task points yet — ranks still list every team with phases / tasks completed.
        </p>
      ) : null}
      <p className="mb-3 text-xs text-ink-soft">
        Ties broken by more tasks solved, then earlier last solve. Relative times show the exact
        stamp (to the second) on hover.
      </p>
      <table className="w-full min-w-3xl">
        <thead>
          <tr>
            <th className={tableHead}>Rank</th>
            <th className={tableHead}>1h</th>
            <th className={tableHead}>Team</th>
            <th className={tableHead}>Points</th>
            <th className={tableHead}>Tasks solved</th>
            <th className={tableHead}>Phases</th>
            <th className={tableHead}>Last submission</th>
            <th className={tableHead}>
              <span className="sr-only">Expand</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const expanded = open.has(row.teamId);
            const move = row.movement;
            const moveLabel =
              !move || move.direction === "same"
                ? "—"
                : move.direction === "up"
                  ? `▲${move.delta}`
                  : move.direction === "down"
                    ? `▼${Math.abs(move.delta)}`
                    : "new";
            const moveTitle =
              move?.priorRank != null
                ? `Was #${move.priorRank} one hour ago`
                : move?.direction === "new"
                  ? "Not ranked one hour ago"
                  : undefined;
            return (
              <Fragment key={row.teamId}>
                <tr
                  className={`${tableRow} cursor-pointer transition-colors`}
                  onClick={() => toggle(row.teamId)}
                >
                  <td className={tableCell}>{i + 1}</td>
                  <td className={`${tableCell} tabular-nums`} title={moveTitle}>
                    {moveLabel}
                  </td>
                  <td className={tableCell}>{row.teamName}</td>
                  <td className={`${tableCell} tabular-nums`}>{row.points}</td>
                  <td className={`${tableCell} tabular-nums`}>
                    {row.solved}/{row.taskTotal}
                  </td>
                  <td className={`${tableCell} tabular-nums`}>
                    {row.phasesDone}/{row.phaseTotal}
                  </td>
                  <td className={tableCell}>
                    <span title={exact(row.lastSolveAt, timeZone) || undefined}>
                      {nowMs == null
                        ? exact(row.lastSolveAt, timeZone) || "—"
                        : relative(row.lastSolveAt, nowMs)}
                    </span>
                  </td>
                  <td className={tableCell}>
                    <ChevronDown className={`h-4 w-4 transition ${expanded ? "rotate-180" : ""}`} />
                  </td>
                </tr>
                {expanded ? (
                  <tr>
                    <td colSpan={8} className="bg-muted/40 px-4 py-4">
                      {row.phases.length ? (
                        <div className="mb-4">
                          <p className="mb-2 text-2xs font-semibold uppercase text-ink-soft">
                            Phases
                          </p>
                          <ul className="space-y-1 text-sm">
                            {row.phases.map((p) => (
                              <li key={p.phaseId} className="flex items-center gap-2">
                                {p.complete ? (
                                  <Check className="h-3.5 w-3.5 text-ink" />
                                ) : (
                                  <span className="inline-block h-3.5 w-3.5 rounded-full border border-line" />
                                )}
                                <span>{p.name}</span>
                                {p.completedAt ? (
                                  <span
                                    className="text-xs text-ink-soft"
                                    title={exact(p.completedAt, timeZone)}
                                  >
                                    {exact(p.completedAt, timeZone)}
                                  </span>
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      <p className="mb-2 text-2xs font-semibold uppercase text-ink-soft">Tasks</p>
                      <table className="w-full">
                        <thead>
                          <tr>
                            <th className={tableHead}>Task</th>
                            <th className={tableHead}>Available</th>
                            <th className={tableHead}>Solved</th>
                            <th className={tableHead}>Earned</th>
                            <th className={tableHead}>Solved at</th>
                          </tr>
                        </thead>
                        <tbody>
                          {row.tasks.map((task) => (
                            <tr key={task.taskId} className={tableRow}>
                              <td className={tableCell}>
                                <Link
                                  href={`${tasksHref}?track=${trackId}&task=${task.taskId}`}
                                  className="font-medium hover:underline"
                                >
                                  {task.title}
                                </Link>
                                {task.firstBlood ? (
                                  <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-2xs uppercase text-ink">
                                    First blood
                                  </span>
                                ) : null}
                                {task.hintUsed ? (
                                  <span className="ml-1 text-2xs text-ink-soft">Hint used</span>
                                ) : null}
                              </td>
                              <td className={`${tableCell} tabular-nums`}>{task.points}</td>
                              <td className={tableCell}>{task.solved ? "Yes" : "No"}</td>
                              <td className={`${tableCell} tabular-nums`}>{task.earned}</td>
                              <td
                                className={tableCell}
                                title={exact(task.attemptedAt, timeZone) || undefined}
                              >
                                {task.attemptedAt ? exact(task.attemptedAt, timeZone) : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <p className="mt-2 text-2xs text-ink-faint">
                        Hint-used is stored as a flag on the team; the time the hint was revealed is
                        not recorded.
                      </p>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
