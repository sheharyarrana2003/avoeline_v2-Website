"use client";

import React, { useState } from "react";
import {
  Users,
  CheckCircle2,
  Clock,
  Activity,
  Search,
} from "lucide-react";
import type { TeamAttendanceCheckIn } from "../../types";
import { formatDateMedium } from "@/src/lib/datetime";

export interface AttendanceActivityTrackerProps {
  eventId: string;
  attendanceRecords: TeamAttendanceCheckIn[];
  totalTeamsCount: number;
}

export function AttendanceActivityTracker({
  attendanceRecords,
  totalTeamsCount,
}: AttendanceActivityTrackerProps) {
  const [windowFilter, setWindowFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const uniqueWindows = Array.from(new Set(attendanceRecords.map((r) => r.windowSlot))).filter(Boolean);

  const filtered = attendanceRecords.filter((r) => {
    const windowMatch = windowFilter === "all" || r.windowSlot === windowFilter;
    const searchMatch =
      !search ||
      r.teamName.toLowerCase().includes(search.toLowerCase()) ||
      r.participantName.toLowerCase().includes(search.toLowerCase());
    return windowMatch && searchMatch;
  });

  const uniqueTeamsCheckedIn = new Set(filtered.map((r) => r.teamId)).size;
  const attendanceRate = totalTeamsCount > 0 ? Math.round((uniqueTeamsCheckedIn / totalTeamsCount) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-line pb-4 sm:flex-row sm:items-center">
        <div>
          <h3 className="text-lg font-bold text-ink flex items-center gap-2">
            <Activity className="text-indigo-600 dark:text-indigo-400" size={20} />
            Periodic Check-in & Activity Tracking
          </h3>
          <p className="text-xs text-ink-soft">
            Real-time monitoring of team presence and hourly confirmation pulses across the event.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-line bg-paper px-3 py-1.5 text-xs text-ink">
            <Users size={14} className="text-indigo-600" />
            <span className="font-semibold">
              {uniqueTeamsCheckedIn} of {totalTeamsCount} Teams Active ({attendanceRate}%)
            </span>
          </div>
        </div>
      </div>

      {/* Metric Tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-paper p-4">
          <span className="text-2xs font-bold uppercase tracking-wider text-ink-soft">
            Total Check-in Pulses
          </span>
          <p className="mt-1 font-mono text-2xl font-bold text-ink">{attendanceRecords.length}</p>
          <span className="text-2xs text-ink-soft">Across all time windows</span>
        </div>

        <div className="rounded-2xl border border-line bg-paper p-4">
          <span className="text-2xs font-bold uppercase tracking-wider text-ink-soft">
            Active Participating Teams
          </span>
          <p className="mt-1 font-mono text-2xl font-bold text-emerald-600">
            {uniqueTeamsCheckedIn} <span className="text-sm font-normal text-ink-soft">/ {totalTeamsCount}</span>
          </p>
          <span className="text-2xs text-ink-soft">Confirmed hourly presence</span>
        </div>

        <div className="rounded-2xl border border-line bg-paper p-4">
          <span className="text-2xs font-bold uppercase tracking-wider text-ink-soft">
            Current Compliance Rate
          </span>
          <p className="mt-1 font-mono text-2xl font-bold text-indigo-600">{attendanceRate}%</p>
          <span className="text-2xs text-ink-soft">Attendance threshold active</span>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setWindowFilter("all")}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
              windowFilter === "all"
                ? "bg-ink text-white"
                : "bg-muted text-ink-soft hover:bg-muted-strong"
            }`}
          >
            All Windows ({attendanceRecords.length})
          </button>
          {uniqueWindows.map((win) => (
            <button
              key={win}
              type="button"
              onClick={() => setWindowFilter(win)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                windowFilter === win
                  ? "bg-ink text-white"
                  : "bg-muted text-ink-soft hover:bg-muted-strong"
              }`}
            >
              {win}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-ink-faint" size={14} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search teams or members..."
            className="rounded-xl border border-line bg-paper pl-8 pr-3 py-1.5 text-xs text-ink outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Check-ins Log */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-line bg-paper p-8 text-center">
          <Clock className="mx-auto text-ink-faint mb-2" size={32} />
          <h4 className="font-semibold text-ink">No check-in pulses recorded yet</h4>
          <p className="text-xs text-ink-soft mt-1">
            When teams click their hourly presence button in their arena, confirmed pulses appear here.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-paper">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-line bg-muted/40 text-ink-soft">
              <tr>
                <th className="p-3.5 font-semibold">Team</th>
                <th className="p-3.5 font-semibold">Participant</th>
                <th className="p-3.5 font-semibold">Check-in Slot</th>
                <th className="p-3.5 font-semibold">Timestamp</th>
                <th className="p-3.5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-ink">
              {filtered.map((record) => (
                <tr key={record.id} className="hover:bg-muted/20 transition">
                  <td className="p-3.5 font-semibold">{record.teamName}</td>
                  <td className="p-3.5 text-ink-soft">{record.participantName || "Member"}</td>
                  <td className="p-3.5">
                    <span className="rounded-md bg-muted px-2 py-0.5 text-2xs font-mono font-medium">
                      {record.windowSlot}
                    </span>
                  </td>
                  <td className="p-3.5 text-ink-soft">{formatDateMedium(record.checkedInAt)}</td>
                  <td className="p-3.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-2xs font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      <CheckCircle2 size={12} /> Confirmed Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
