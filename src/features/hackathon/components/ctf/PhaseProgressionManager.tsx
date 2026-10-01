"use client";

import React, { useState, useTransition } from "react";
import {
  Layers,
  Lock,
  Unlock,
  Plus,
  Clock,
  ShieldCheck,
} from "lucide-react";
import type { HackathonPhase } from "../../types";
import { lockPhaseAction, savePhaseAction } from "../../actions/ctf.action";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";

export interface PhaseProgressionManagerProps {
  eventId: string;
  tracks: { id: string; name: string }[];
  phases: HackathonPhase[];
}

export function PhaseProgressionManager({
  eventId,
  tracks,
  phases,
}: PhaseProgressionManagerProps) {
  const [selectedTrackId, setSelectedTrackId] = useState<string>(tracks[0]?.id || "");
  const [showAddForm, setShowAddForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ success?: boolean; msg?: string } | null>(null);

  const trackPhases = phases.filter((p) => (selectedTrackId ? p.trackId === selectedTrackId : true));

  const handleLockPhase = (phaseId: string, title: string) => {
    if (
      !confirm(
        `CRITICAL: Are you sure you want to permanently close and lock "${title}"?\n\nOnce closed, no participant or team can submit or modify deliverables for this phase.`
      )
    ) {
      return;
    }

    startTransition(async () => {
      const res = await lockPhaseAction(phaseId, eventId);
      if (res.success) {
        setFeedback({ success: true, msg: `"${title}" has been permanently closed and locked.` });
      } else {
        setFeedback({ success: false, msg: res.error });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-line pb-4 sm:flex-row sm:items-center">
        <div>
          <h3 className="text-lg font-bold text-ink flex items-center gap-2">
            <Layers className="text-indigo-600 dark:text-indigo-400" size={20} />
            Phase-Wise Progression Engine
          </h3>
          <p className="text-xs text-ink-soft">
            Enforce sequential completion. Closed phases are permanently locked against alterations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {tracks.length > 1 ? (
            <select
              value={selectedTrackId}
              onChange={(e) => setSelectedTrackId(e.target.value)}
              className={fieldClass}
            >
              {tracks.map((t) => (
                <option key={t.id} value={t.id}>
                  Track: {t.name}
                </option>
              ))}
            </select>
          ) : null}

          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className={buttonClass("primary", "sm")}
          >
            <Plus size={14} /> Add Phase
          </button>
        </div>
      </div>

      {feedback ? (
        <div
          className={`rounded-xl p-3 text-xs font-medium ${
            feedback.success
              ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300"
          }`}
        >
          {feedback.msg}
        </div>
      ) : null}

      {/* Strict Phase Rule Callout */}
      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
        <ShieldCheck className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
        <div className="text-xs">
          <span className="font-bold text-amber-900 dark:text-amber-200">
            Immutable Phase Progression Guard Active
          </span>
          <p className="mt-0.5 text-amber-800/90 dark:text-amber-300/90">
            Teams must complete deliverables for Phase N before unlocking Phase N+1. Once an organizer marks a phase as closed, write operations are permanently rejected server-side to guarantee audit integrity.
          </p>
        </div>
      </div>

      {/* Add Phase Form */}
      {showAddForm ? (
        <div className="rounded-2xl border border-line bg-paper p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <h4 className="font-bold text-ink text-sm">Add New Competition Phase</h4>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-xs text-ink-soft hover:text-ink"
            >
              Cancel
            </button>
          </div>

          <form
            action={async (formData) => {
              formData.set("trackId", selectedTrackId || tracks[0]?.id || "");
              const res = await savePhaseAction(eventId, formData);
              if (res.success) {
                setShowAddForm(false);
                setFeedback({ success: true, msg: "Phase created successfully!" });
              } else {
                setFeedback({ success: false, msg: res.error });
              }
            }}
            className="mt-4 space-y-4"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Phase Number</label>
                <input
                  name="phaseNumber"
                  type="number"
                  defaultValue={trackPhases.length + 1}
                  min={1}
                  required
                  className={fieldClass}
                />
              </div>

              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className={labelClass}>Phase Title *</label>
                <input
                  name="title"
                  required
                  placeholder="e.g. Phase 1: Ideation & System Architecture"
                  className={fieldClass}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Instructions & Objectives</label>
              <textarea
                name="description"
                rows={2}
                placeholder="What must teams accomplish before this phase ends?"
                className={fieldClass}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Deadline (Date & Time)</label>
                <input
                  name="deadline"
                  type="text"
                  placeholder="e.g. 2026-10-15 18:00"
                  className={fieldClass}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Deliverable Requirements (One per line)</label>
                <textarea
                  name="deliverableRequirements"
                  rows={2}
                  placeholder="GitHub Repository URL&#10;Architecture PDF Deck&#10;Demo Video"
                  className={fieldClass}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className={buttonClass("ghost", "sm")}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className={buttonClass("primary", "sm")}
              >
                {isPending ? "Saving..." : "Create Phase"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {/* Phases Timeline List */}
      {trackPhases.length === 0 ? (
        <div className="rounded-2xl border border-line bg-paper p-8 text-center">
          <Layers className="mx-auto text-ink-faint mb-2" size={32} />
          <h4 className="font-semibold text-ink">No phases configured yet</h4>
          <p className="text-xs text-ink-soft mt-1">
            Create sequential phases to establish structured progression through your hackathon.
          </p>
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className={`mt-4 ${buttonClass("primary", "sm")}`}
          >
            <Plus size={14} /> Add First Phase
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {trackPhases.map((phase) => (
            <div
              key={phase.id}
              className={`rounded-2xl border p-5 transition ${
                phase.isClosed
                  ? "border-line bg-muted/40 opacity-80"
                  : "border-indigo-200 bg-paper shadow-xs dark:border-indigo-900/60"
              }`}
            >
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-xl font-bold text-sm ${
                      phase.isClosed
                        ? "bg-muted text-ink-soft"
                        : "bg-indigo-600 text-white shadow-xs"
                    }`}
                  >
                    #{phase.phaseNumber}
                  </div>
                  <div>
                    <h4 className="font-bold text-ink">{phase.title}</h4>
                    {phase.deadline ? (
                      <p className="flex items-center gap-1 text-xs text-ink-soft">
                        <Clock size={12} /> Deadline: {phase.deadline}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {phase.isClosed ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800 dark:bg-red-950/60 dark:text-red-300">
                      <Lock size={12} /> Closed & Locked
                    </span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                        <Unlock size={12} /> In Progress
                      </span>
                      <button
                        type="button"
                        onClick={() => handleLockPhase(phase.id, phase.title)}
                        disabled={isPending}
                        className={buttonClass("destructive", "sm")}
                        title="Permanently lock this phase"
                      >
                        <Lock size={12} /> Lock Phase
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {phase.description ? (
                <p className="mt-3 text-xs text-ink-soft">{phase.description}</p>
              ) : null}

              {phase.deliverableRequirements && phase.deliverableRequirements.length > 0 ? (
                <div className="mt-3.5 border-t border-line/60 pt-3">
                  <span className="text-2xs font-bold uppercase tracking-wider text-ink-soft">
                    Required Deliverables:
                  </span>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {phase.deliverableRequirements.map((req, i) => (
                      <span
                        key={i}
                        className="rounded-md bg-muted px-2 py-0.5 text-2xs font-medium text-ink"
                      >
                        ✓ {req}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
