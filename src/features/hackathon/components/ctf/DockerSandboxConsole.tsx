"use client";

import React, { useState, useTransition } from "react";
import {
  Box,
  Server,
  RotateCcw,
  Shield,
  Clock,
  Terminal,
  Cpu,
} from "lucide-react";
import type { DockerSandboxInstance } from "../../types";
import { resetSandboxAction } from "../../actions/ctf.action";

export interface DockerSandboxConsoleProps {
  eventId: string;
  sandboxes: DockerSandboxInstance[];
}

export function DockerSandboxConsole({ eventId, sandboxes }: DockerSandboxConsoleProps) {
  const [isPending, startTransition] = useTransition();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const activeSandboxes = sandboxes.filter((s) => s.status === "running");
  const filtered = sandboxes.filter((s) => (statusFilter === "all" ? true : s.status === statusFilter));

  const handleReset = (sandboxId: string) => {
    startTransition(async () => {
      await resetSandboxAction(sandboxId, eventId);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-line pb-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-ink flex items-center gap-2">
              <Box className="text-indigo-600 dark:text-indigo-400" size={20} />
              Docker Sandboxing Orchestrator
            </h3>
            <span className="rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 px-2.5 py-0.5 text-2xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
              Premium Tier
            </span>
          </div>
          <p className="text-xs text-ink-soft">
            Per-team isolated Linux/Docker target environments to prevent cross-team exploitation and DoS interference.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-xl border border-line bg-paper px-3 py-1.5 text-xs text-ink">
            <Cpu size={14} className="text-indigo-600" />
            <span className="font-semibold">{activeSandboxes.length} Active Pods</span>
          </div>
        </div>
      </div>

      {/* Premium Tier Cost & Infrastructure Callout */}
      <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50/50 to-blue-50/30 p-5 dark:border-indigo-900/60 dark:from-indigo-950/20 dark:to-blue-950/10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-ink flex items-center gap-1.5">
              <Shield className="text-indigo-600" size={16} />
              Container Isolation & Cost Optimization
            </h4>
            <p className="text-xs text-ink-soft max-w-2xl leading-relaxed">
              Live exploitable containers consume real computing memory & CPU. Ephemeral port mapping, strict 60-minute TTL countdowns, and rate-limited team resets ensure maximum security without cloud runaway costs.
            </p>
          </div>
          <div className="flex shrink-0 gap-2 text-2xs font-semibold">
            <div className="rounded-xl border border-line bg-paper px-3 py-2 text-center">
              <span className="block text-ink-soft">Session TTL</span>
              <span className="text-sm font-bold text-ink">60 Mins</span>
            </div>
            <div className="rounded-xl border border-line bg-paper px-3 py-2 text-center">
              <span className="block text-ink-soft">Isolation</span>
              <span className="text-sm font-bold text-emerald-600">Per-Team</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {["all", "running", "stopped", "expired"].map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setStatusFilter(st)}
            className={`rounded-lg px-3 py-1 text-xs font-semibold capitalize transition ${
              statusFilter === st ? "bg-ink text-white" : "bg-muted text-ink-soft hover:bg-muted-strong"
            }`}
          >
            {st} ({st === "all" ? sandboxes.length : sandboxes.filter((s) => s.status === st).length})
          </button>
        ))}
      </div>

      {/* Sandboxes List */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-line bg-paper p-8 text-center">
          <Server className="mx-auto text-ink-faint mb-2" size={32} />
          <h4 className="font-semibold text-ink">No sandbox containers active</h4>
          <p className="text-xs text-ink-soft mt-1">
            When teams launch challenge machines from their arena, isolated container pods appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filtered.map((sb) => (
            <div
              key={sb.id}
              className="rounded-2xl border border-line bg-paper p-5 shadow-xs transition hover:border-indigo-300"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="inline-flex items-center gap-1 font-mono text-2xs font-semibold text-indigo-600 dark:text-indigo-400">
                    <Terminal size={12} /> {sb.id}
                  </span>
                  <h4 className="font-bold text-ink text-sm mt-0.5">{sb.challengeTitle}</h4>
                  <p className="text-xs text-ink-soft">Allocated to Team: {sb.teamId.slice(0, 8)}</p>
                </div>

                <span
                  className={`rounded-full px-2.5 py-0.5 text-2xs font-bold uppercase tracking-wider ${
                    sb.status === "running"
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                      : "bg-muted text-ink-soft"
                  }`}
                >
                  {sb.status}
                </span>
              </div>

              {/* Endpoint Details */}
              <div className="mt-4 rounded-xl border border-line bg-muted/30 p-3 font-mono text-2xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-ink-soft">Target Host:</span>
                  <span className="font-semibold text-ink">{sb.hostEndpoint || "10.244.0.12"}</span>
                </div>
                {sb.portMappings.map((pm, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span className="text-ink-soft">{pm.protocol} Port:</span>
                    <span className="font-semibold text-indigo-600">{pm.hostPort}</span>
                  </div>
                ))}
                {sb.credentials?.username ? (
                  <div className="flex justify-between border-t border-line/50 pt-1 mt-1">
                    <span className="text-ink-soft">SSH User:</span>
                    <span className="text-ink">{sb.credentials.username}</span>
                  </div>
                ) : null}
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-line/60 pt-3 text-xs">
                <span className="text-ink-soft flex items-center gap-1 text-2xs">
                  <Clock size={12} /> Resets: {sb.resetCount}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleReset(sb.id)}
                    disabled={isPending}
                    className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    <RotateCcw size={12} /> Reset Instance
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
