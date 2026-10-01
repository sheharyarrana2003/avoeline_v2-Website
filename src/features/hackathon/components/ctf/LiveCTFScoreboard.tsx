"use client";

import React, { useState } from "react";
import { Trophy, CheckCircle } from "lucide-react";
import type { CTFScoreboardEntry } from "../../ctf.service";
import { formatDateMedium } from "@/src/lib/datetime";

export interface LiveCTFScoreboardProps {
  scoreboard: CTFScoreboardEntry[];
  trackName: string;
}

export function LiveCTFScoreboard({ scoreboard, trackName }: LiveCTFScoreboardProps) {
  const [selectedTeam, setSelectedTeam] = useState<CTFScoreboardEntry | null>(null);

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-400 font-bold text-xs text-amber-950 shadow-xs ring-2 ring-amber-300">
            🥇 1
          </span>
        );
      case 2:
        return (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-300 font-bold text-xs text-slate-800 shadow-xs ring-2 ring-slate-200">
            🥈 2
          </span>
        );
      case 3:
        return (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-600 font-bold text-xs text-white shadow-xs ring-2 ring-amber-500">
            🥉 3
          </span>
        );
      default:
        return (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted font-mono font-semibold text-xs text-ink-soft">
            #{rank}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-line pb-4 sm:flex-row sm:items-center">
        <div>
          <h3 className="text-lg font-bold text-ink flex items-center gap-2">
            <Trophy className="text-amber-500" size={20} />
            Live CTF & Hackathon Scoreboard
          </h3>
          <p className="text-xs text-ink-soft">
            Real-time rankings for {trackName}. Ranked by total score, with earlier last solve timestamp as tie-breaker.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Live Updating
          </span>
        </div>
      </div>

      {scoreboard.length === 0 ? (
        <div className="rounded-2xl border border-line bg-paper p-8 text-center">
          <Trophy className="mx-auto text-ink-faint mb-2" size={32} />
          <h4 className="font-semibold text-ink">Scoreboard is empty</h4>
          <p className="text-xs text-ink-soft mt-1">
            As teams submit correct flags and complete challenge milestones, scores will populate here.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-paper">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-line bg-muted/40 text-ink-soft">
              <tr>
                <th className="p-3.5 font-semibold w-16">Rank</th>
                <th className="p-3.5 font-semibold">Team Name</th>
                <th className="p-3.5 font-semibold">Challenges Solved</th>
                <th className="p-3.5 font-semibold">Last Solve Time (Tie-Breaker)</th>
                <th className="p-3.5 text-right font-semibold">Total Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-ink">
              {scoreboard.map((entry) => (
                <tr
                  key={entry.teamId}
                  onClick={() => setSelectedTeam(entry)}
                  className="hover:bg-muted/20 cursor-pointer transition"
                >
                  <td className="p-3.5">{getRankBadge(entry.rank)}</td>
                  <td className="p-3.5">
                    <span className="font-bold text-ink text-sm">{entry.teamName}</span>
                    <span className="block text-2xs text-ink-soft font-mono">ID: {entry.teamId.slice(0, 8)}</span>
                  </td>
                  <td className="p-3.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold">{entry.solvesCount} solves</span>
                      <div className="flex gap-0.5">
                        {entry.solvedChallenges.slice(0, 5).map((s, idx) => (
                          <span
                            key={idx}
                            title={`${s.title} (+${s.points} pts)`}
                            className="h-2 w-2 rounded-full bg-indigo-600"
                          />
                        ))}
                      </div>
                    </div>
                  </td>
                  <td className="p-3.5 text-ink-soft font-mono text-2xs">
                    {entry.lastSolveTime ? formatDateMedium(entry.lastSolveTime) : "—"}
                  </td>
                  <td className="p-3.5 text-right font-mono text-base font-bold text-indigo-600 dark:text-indigo-400">
                    {entry.totalPoints} pts
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Selected Team Solves Modal / Drill-down */}
      {selectedTeam ? (
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/20 p-5 dark:border-indigo-900/60 dark:bg-indigo-950/10">
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <div>
              <h4 className="font-bold text-ink">
                Solve Breakdown: {selectedTeam.teamName}
              </h4>
              <p className="text-2xs text-ink-soft">
                Rank #{selectedTeam.rank} · {selectedTeam.totalPoints} total points earned
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedTeam(null)}
              className="text-xs text-ink-soft hover:text-ink"
            >
              Close
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {selectedTeam.solvedChallenges.map((solve, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-xl border border-line bg-paper p-3 text-xs"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-emerald-600" />
                  <span className="font-semibold text-ink">{solve.title}</span>
                </div>
                <span className="font-mono font-bold text-indigo-600">+{solve.points} pts</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
