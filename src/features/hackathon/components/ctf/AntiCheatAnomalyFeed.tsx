"use client";

import React, { useState } from "react";
import {
  ShieldAlert,
  AlertTriangle,
  EyeOff,
  Clock,
  Zap,
  Info,
  Search,
} from "lucide-react";
import type { AntiCheatAnomaly, AnomalyType } from "../../types";
import { formatDateMedium } from "@/src/lib/datetime";

export interface AntiCheatAnomalyFeedProps {
  eventId: string;
  anomalies: AntiCheatAnomaly[];
}

export function AntiCheatAnomalyFeed({ anomalies }: AntiCheatAnomalyFeedProps) {
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = anomalies.filter((a) => {
    const typeMatch = filterType === "all" || a.anomalyType === filterType;
    const queryMatch =
      !searchQuery ||
      a.teamName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.details.toLowerCase().includes(searchQuery.toLowerCase());
    return typeMatch && queryMatch;
  });

  const getIcon = (type: AnomalyType) => {
    switch (type) {
      case "tab_switch":
      case "window_blur":
        return <EyeOff className="text-amber-500" size={16} />;
      case "inactivity":
        return <Clock className="text-blue-500" size={16} />;
      case "rapid_submissions":
        return <Zap className="text-red-500" size={16} />;
      default:
        return <AlertTriangle className="text-amber-500" size={16} />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-line pb-4 sm:flex-row sm:items-center">
        <div>
          <h3 className="text-lg font-bold text-ink flex items-center gap-2">
            <ShieldAlert className="text-indigo-600 dark:text-indigo-400" size={20} />
            Anti-Cheat Anomaly Detection Feed
          </h3>
          <p className="text-xs text-ink-soft">
            Heuristic signals tracking participant browser focus, prolonged inactivity, and rapid flag submission spikes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-xl border border-line bg-paper px-3 py-1.5 text-xs font-semibold text-ink">
            {anomalies.length} Signals Logged
          </span>
        </div>
      </div>

      {/* Heuristic framing banner */}
      <div className="flex items-start gap-3 rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 dark:border-indigo-900/50 dark:bg-indigo-950/20">
        <Info className="h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-400 mt-0.5" />
        <div className="text-xs">
          <span className="font-bold text-indigo-950 dark:text-indigo-200">
            Framed as Anomaly Detection, Not a Strict Guarantee
          </span>
          <p className="mt-0.5 text-indigo-900/80 dark:text-indigo-300/80 leading-relaxed">
            Browser focus changes and inactivity indicate behavioral outliers (e.g. researching external cheats, sharing flags, or idling). They assist organizers in auditing suspicious spikes, rather than issuing automated disqualifications.
          </p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: "all", label: "All Signals" },
            { id: "tab_switch", label: "Tab Switching" },
            { id: "inactivity", label: "Prolonged Inactivity" },
            { id: "rapid_submissions", label: "Rapid Flag Attempts" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterType(tab.id)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                filterType === tab.id
                  ? "bg-ink text-white"
                  : "bg-muted text-ink-soft hover:bg-muted-strong"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-ink-faint" size={14} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by team or event..."
            className="rounded-xl border border-line bg-paper pl-8 pr-3 py-1.5 text-xs text-ink outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Anomaly Feed List */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-line bg-paper p-8 text-center">
          <ShieldAlert className="mx-auto text-ink-faint mb-2" size={32} />
          <h4 className="font-semibold text-ink">No anomalies recorded</h4>
          <p className="text-xs text-ink-soft mt-1">
            Participant activity is clean with no suspicious signals detected so far.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((anomaly) => (
            <div
              key={anomaly.id}
              className="flex flex-col gap-2 rounded-2xl border border-line bg-paper p-4 text-xs transition hover:border-indigo-300 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-lg bg-muted p-2">{getIcon(anomaly.anomalyType)}</div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-ink">{anomaly.teamName}</span>
                    <span
                      className={`rounded-md px-1.5 py-0.5 font-semibold text-2xs uppercase ${
                        anomaly.severity === "high"
                          ? "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300"
                          : anomaly.severity === "medium"
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                          : "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                      }`}
                    >
                      {anomaly.severity} priority
                    </span>
                  </div>
                  <p className="mt-1 text-ink-soft">{anomaly.details}</p>
                </div>
              </div>

              <div className="shrink-0 text-right text-2xs text-ink-faint">
                <span>{formatDateMedium(anomaly.timestamp)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
