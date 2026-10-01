"use client";

import React, { useState } from "react";
import {
  Calendar,
  Clock,
  Plus,
  FileText,
  GitBranch,
  Globe,
  Paperclip,
} from "lucide-react";
import type { HackathonDailySchedule } from "../../types";
import { saveDailyScheduleAction } from "../../actions/ctf.action";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";

export interface DailyScheduleManagerProps {
  eventId: string;
  schedules: HackathonDailySchedule[];
}

export function DailyScheduleManager({ eventId, schedules }: DailyScheduleManagerProps) {
  const [selectedDay, setSelectedDay] = useState<number>(schedules[0]?.dayNumber || 1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isPending, setPending] = useState(false);

  const currentSchedule =
    schedules.find((s) => s.dayNumber === selectedDay) || schedules[0] || null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-line pb-4 sm:flex-row sm:items-center">
        <div>
          <h3 className="text-lg font-bold text-ink flex items-center gap-2">
            <Calendar className="text-indigo-600 dark:text-indigo-400" size={20} />
            Daily Calendar & Shift Scheduling
          </h3>
          <p className="text-xs text-ink-soft">
            Schedule multi-day hackathon shifts and release day-wise tasks with GitHub and external link requirements.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className={buttonClass("primary", "sm")}
        >
          <Plus size={14} /> Add Day Schedule
        </button>
      </div>

      {/* Day Selector Tabs */}
      <div className="flex flex-wrap gap-2">
        {schedules.map((sch) => (
          <button
            key={sch.dayNumber}
            type="button"
            onClick={() => setSelectedDay(sch.dayNumber)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
              selectedDay === sch.dayNumber
                ? "bg-ink text-white shadow-xs"
                : "bg-muted text-ink-soft hover:bg-muted-strong"
            }`}
          >
            <span>Day {sch.dayNumber}</span>
            {sch.date ? <span className="text-2xs font-normal opacity-80">({sch.date})</span> : null}
          </button>
        ))}
      </div>

      {/* Add Day Schedule Form */}
      {showAddModal ? (
        <div className="rounded-2xl border border-line bg-paper p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <h4 className="font-bold text-ink text-sm">Schedule Day & Task Release</h4>
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="text-xs text-ink-soft hover:text-ink"
            >
              Cancel
            </button>
          </div>

          <form
            action={async (formData) => {
              setPending(true);
              const res = await saveDailyScheduleAction(eventId, formData);
              setPending(false);
              if (res.success) {
                setShowAddModal(false);
              } else {
                alert(res.error || "Failed to save schedule");
              }
            }}
            className="mt-4 space-y-4"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Day Number *</label>
                <input
                  name="dayNumber"
                  type="number"
                  defaultValue={schedules.length + 1}
                  required
                  min={1}
                  className={fieldClass}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Date (DD/MM/YYYY)</label>
                <input name="date" placeholder="e.g. 15/10/2026" className={fieldClass} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Day Title</label>
                <input
                  name="title"
                  placeholder="e.g. Day 1: Kickoff & Core Architecture"
                  className={fieldClass}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Day Objectives Overview</label>
              <textarea
                name="description"
                rows={2}
                placeholder="Summary of today's key milestones and shifts..."
                className={fieldClass}
              />
            </div>

            {/* Task Release Section */}
            <div className="rounded-xl border border-line bg-muted/20 p-4 space-y-3">
              <h5 className="text-xs font-bold text-ink uppercase tracking-wider">
                Release Day Task Prompt
              </h5>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className={labelClass}>Task Title</label>
                  <input
                    name="taskTitle"
                    placeholder="e.g. Milestone 1: Deliver API Schema & Data Model"
                    className={fieldClass}
                  />
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className={labelClass}>Task Instructions</label>
                  <textarea
                    name="taskInstructions"
                    rows={2}
                    placeholder="Provide detailed prompts, specifications, or rubric requirements..."
                    className={fieldClass}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-4 pt-1">
                <label className="flex items-center gap-2 text-xs text-ink cursor-pointer">
                  <input
                    type="checkbox"
                    name="requireGithub"
                    value="true"
                    defaultChecked
                    className="h-4 w-4 rounded accent-indigo-600"
                  />
                  Require GitHub Repository Link
                </label>
                <label className="flex items-center gap-2 text-xs text-ink cursor-pointer">
                  <input
                    type="checkbox"
                    name="requireExternalLink"
                    value="true"
                    defaultChecked
                    className="h-4 w-4 rounded accent-indigo-600"
                  />
                  Require External Demo / Figma Link
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className={buttonClass("ghost", "sm")}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className={buttonClass("primary", "sm")}
              >
                {isPending ? "Saving..." : "Save Schedule"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {/* Schedule Detail View */}
      {currentSchedule ? (
        <div className="space-y-6">
          {/* Shifts Grid */}
          <div className="rounded-2xl border border-line bg-paper p-5">
            <h4 className="font-bold text-sm text-ink mb-3 flex items-center gap-2">
              <Clock size={16} className="text-indigo-600" />
              Day {currentSchedule.dayNumber} Shifts & Mentor Hours
            </h4>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {currentSchedule.shifts.map((shift) => (
                <div
                  key={shift.id}
                  className="rounded-xl border border-line bg-muted/40 p-3.5 space-y-1"
                >
                  <span className="font-semibold text-ink text-xs block">{shift.title}</span>
                  <p className="text-2xs font-mono text-indigo-600 dark:text-indigo-400">
                    {shift.startTime} – {shift.endTime}
                  </p>
                  {shift.leadMentorOrJudge ? (
                    <span className="text-2xs text-ink-soft block">
                      Lead: {shift.leadMentorOrJudge}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          {/* Released Tasks */}
          <div className="rounded-2xl border border-line bg-paper p-5">
            <h4 className="font-bold text-sm text-ink mb-3 flex items-center gap-2">
              <FileText size={16} className="text-indigo-600" />
              Released Tasks & Prompts (Any File Format Supported)
            </h4>

            {currentSchedule.tasks.length === 0 ? (
              <p className="text-xs text-ink-soft italic">No tasks released for this day yet.</p>
            ) : (
              <div className="space-y-3">
                {currentSchedule.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="rounded-xl border border-indigo-200 bg-indigo-50/20 p-4 dark:border-indigo-900/50 dark:bg-indigo-950/10 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-ink">{task.title}</span>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-2xs font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                        Live Task
                      </span>
                    </div>

                    <p className="text-xs text-ink-soft whitespace-pre-line">{task.instructions}</p>

                    <div className="flex flex-wrap gap-3 border-t border-line/50 pt-2 text-2xs text-ink-soft">
                      {task.requireGithub ? (
                        <span className="flex items-center gap-1 font-semibold text-ink">
                          <GitBranch size={12} /> GitHub Submission Enabled
                        </span>
                      ) : null}
                      {task.requireExternalLink ? (
                        <span className="flex items-center gap-1 font-semibold text-ink">
                          <Globe size={12} /> External Demo Link Enabled
                        </span>
                      ) : null}
                      <span className="flex items-center gap-1">
                        <Paperclip size={12} /> Any file formats accepted (PDF, ZIP, JSON, PCAP)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-line bg-paper p-8 text-center">
          <Calendar className="mx-auto text-ink-faint mb-2" size={32} />
          <h4 className="font-semibold text-ink">No daily schedules created</h4>
          <p className="text-xs text-ink-soft mt-1">
            Define multi-day schedules with shifts and day-wise task prompts.
          </p>
        </div>
      )}
    </div>
  );
}
