"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  Terminal,
  Layers,
  Box,
  Clock,
  CheckCircle2,
  RotateCcw,
  Activity,
  Lock,
  Unlock,
} from "lucide-react";
import type {
  CTFChallenge,
  HackathonPhase,
  TeamPhaseProgress,
  DockerSandboxInstance,
  HackathonDailySchedule,
  CTFFlagSubmission,
  HackathonTeam,
} from "../../types";
import {
  submitFlagAction,
  submitTeamPhaseAction,
  provisionSandboxAction,
  resetSandboxAction,
  reportAntiCheatAnomalyAction,
  recordAttendanceCheckInAction,
  submitDailyTaskAction,
} from "../../actions/ctf.action";
import { buttonClass, fieldClass } from "@/src/lib/ui";

export interface ParticipantArenaProps {
  eventId: string;
  trackId: string;
  team: HackathonTeam;
  registrationId: string;
  participantName: string;
  challenges: CTFChallenge[];
  phases: HackathonPhase[];
  phaseProgress: TeamPhaseProgress | null;
  sandboxes: DockerSandboxInstance[];
  schedules: HackathonDailySchedule[];
  submissions: CTFFlagSubmission[];
}

export function ParticipantArena({
  eventId,
  trackId,
  team,
  registrationId,
  participantName,
  challenges,
  phases,
  phaseProgress,
  sandboxes,
  schedules,
  submissions,
}: ParticipantArenaProps) {
  const [activeTab, setActiveTab] = useState<"challenges" | "phases" | "schedule" | "sandbox">("challenges");
  const [flagInputs, setFlagInputs] = useState<Record<string, string>>({});
  const [flagMessages, setFlagMessages] = useState<Record<string, { isCorrect?: boolean; msg: string }>>({});
  const [isPending, startTransition] = useTransition();

  // Phase deliverable state
  const [phaseNotes, setPhaseNotes] = useState("");
  const [phaseGithub, setPhaseGithub] = useState("");
  const [phaseDemo, setPhaseDemo] = useState("");

  // Daily task submission state
  const [dailyGithub, setDailyGithub] = useState("");
  const [dailyExternal, setDailyExternal] = useState("");
  const [dailyNotes, setDailyNotes] = useState("");

  // Check-in feedback
  const [checkInDone, setCheckInDone] = useState(false);
  const [checkInMsg, setCheckInMsg] = useState("");

  // Set of solved challenge IDs for this team
  const solvedChallengeIds = new Set(
    submissions.filter((s) => s.isCorrect && s.teamId === team.id).map((s) => s.challengeId)
  );

  const teamScore = submissions
    .filter((s) => s.isCorrect && s.teamId === team.id)
    .reduce((sum, s) => sum + s.pointsAwarded, 0);

  // -------------------------------------------------------------
  // Anti-Cheat Client Signal Observer
  // -------------------------------------------------------------
  useEffect(() => {
    let tabSwitchCount = 0;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        tabSwitchCount++;
        // Report anomaly if switched away
        reportAntiCheatAnomalyAction({
          eventId,
          trackId,
          teamId: team.id,
          teamName: team.name,
          registrationId,
          participantName,
          anomalyType: "tab_switch",
          severity: tabSwitchCount > 3 ? "medium" : "low",
          details: `Participant switched away from arena (Tab switch #${tabSwitchCount}).`,
        });
      }
    };

    const handleWindowBlur = () => {
      reportAntiCheatAnomalyAction({
        eventId,
        trackId,
        teamId: team.id,
        teamName: team.name,
        registrationId,
        participantName,
        anomalyType: "window_blur",
        severity: "low",
        details: "Participant blurred window focus during active session.",
      });
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [eventId, trackId, team.id, team.name, registrationId, participantName]);

  // -------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------
  const handleFlagSubmit = (challengeId: string) => {
    const candidate = flagInputs[challengeId] || "";
    if (!candidate.trim()) return;

    startTransition(async () => {
      const res = await submitFlagAction({
        challengeId,
        eventId,
        trackId,
        teamId: team.id,
        teamName: team.name,
        registrationId,
        flagCandidate: candidate,
      });

      setFlagMessages((prev) => ({
        ...prev,
        [challengeId]: {
          isCorrect: res.isCorrect,
          msg: res.message || "",
        },
      }));

      if (res.isCorrect) {
        setFlagInputs((prev) => ({ ...prev, [challengeId]: "" }));
      }
    });
  };

  const handleLaunchSandbox = (challengeId: string, challengeTitle: string) => {
    startTransition(async () => {
      await provisionSandboxAction({
        teamId: team.id,
        challengeId,
        challengeTitle,
        eventId,
        trackId,
      });
    });
  };

  const handleResetSandbox = (sandboxId: string) => {
    startTransition(async () => {
      await resetSandboxAction(sandboxId, eventId);
    });
  };

  const handlePhaseSubmit = (phaseNumber: number) => {
    startTransition(async () => {
      const res = await submitTeamPhaseAction({
        teamId: team.id,
        eventId,
        trackId,
        phaseNumber,
        notes: phaseNotes,
        githubUrl: phaseGithub,
        deliverableUrl: phaseDemo,
      });

      alert(res.message);
    });
  };

  const handleAttendanceCheckIn = () => {
    startTransition(async () => {
      const currentHour = new Date().getHours();
      const slot = `Hour ${currentHour}:00 Check-in`;
      const res = await recordAttendanceCheckInAction({
        eventId,
        trackId,
        teamId: team.id,
        teamName: team.name,
        registrationId,
        participantName,
        windowSlot: slot,
      });

      setCheckInDone(true);
      setCheckInMsg(res.message || "Attendance recorded!");
    });
  };

  const handleDailyTaskSubmit = (taskId: string, dayNumber: number) => {
    startTransition(async () => {
      const res = await submitDailyTaskAction({
        taskId,
        dayNumber,
        teamId: team.id,
        githubUrl: dailyGithub,
        externalLink: dailyExternal,
        notes: dailyNotes,
        eventId,
      });

      alert(res.message);
    });
  };

  return (
    <div className="space-y-6 rounded-2xl border border-line bg-paper p-6 shadow-sm">
      {/* Team Header & Live Points */}
      <div className="flex flex-col justify-between gap-4 border-b border-line pb-5 sm:flex-row sm:items-center">
        <div>
          <span className="text-2xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Team & Collaboration Arena · Role Scoped
          </span>
          <h2 className="text-xl font-bold text-ink flex items-center gap-2">
            <span>{team.name}</span>
            <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-mono font-normal text-ink-soft">
              Code: {team.joinCode}
            </span>
          </h2>
          <p className="text-xs text-ink-soft mt-0.5">
            Active Participant: <span className="font-semibold text-ink">{participantName}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Hourly Attendance Pulse Button */}
          <button
            type="button"
            onClick={handleAttendanceCheckIn}
            disabled={isPending || checkInDone}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
              checkInDone
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 cursor-default"
                : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs"
            }`}
          >
            <Activity size={14} className={checkInDone ? "text-emerald-600" : "animate-pulse"} />
            {checkInDone ? "Checked-In Active" : "Hourly Check-in Pulse"}
          </button>

          {/* Points Badge */}
          <div className="rounded-xl border border-line bg-muted/30 px-3.5 py-1.5 text-right">
            <span className="block text-3xs font-bold uppercase text-ink-soft">Team Score</span>
            <span className="font-mono text-base font-bold text-indigo-600 dark:text-indigo-400">
              {teamScore} pts
            </span>
          </div>
        </div>
      </div>

      {checkInMsg ? (
        <div className="rounded-xl bg-emerald-50 p-2.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 size={14} />
          {checkInMsg}
        </div>
      ) : null}

      {/* Arena Navigation Tabs */}
      <div className="flex gap-2 border-b border-line pb-3">
        {[
          { id: "challenges", label: "CTF Challenges", icon: Terminal, badge: `${solvedChallengeIds.size}/${challenges.length}` },
          { id: "phases", label: "Phase Progression", icon: Layers, badge: `Phase ${phaseProgress?.currentPhaseNumber || 1}` },
          { id: "sandbox", label: "Docker Sandboxes", icon: Box, badge: "Premium" },
          { id: "schedule", label: "Daily Schedule & Tasks", icon: Clock },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as "challenges" | "phases" | "schedule" | "sandbox")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                isActive
                  ? "bg-ink text-white shadow-xs"
                  : "bg-surface text-ink hover:bg-muted"
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
              {tab.badge ? (
                <span
                  className={`rounded-full px-1.5 py-0.2 text-2xs ${
                    isActive ? "bg-white/20 text-white" : "bg-muted text-ink-soft"
                  }`}
                >
                  {tab.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* TAB 1: CTF CHALLENGES */}
      {activeTab === "challenges" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink-soft">
              Enter captured flags below. Solves immediately increment team score.
            </span>
            <span className="text-xs font-semibold text-emerald-600">
              {solvedChallengeIds.size} of {challenges.length} Solved
            </span>
          </div>

          {challenges.length === 0 ? (
            <p className="text-xs text-ink-soft py-6 text-center italic">
              No CTF challenges have been published for this track yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {challenges.map((challenge) => {
                const isSolved = solvedChallengeIds.has(challenge.id);
                const msg = flagMessages[challenge.id];
                const teamSandbox = sandboxes.find((s) => s.challengeId === challenge.id && s.teamId === team.id);

                return (
                  <div
                    key={challenge.id}
                    className={`rounded-2xl border p-4 transition ${
                      isSolved
                        ? "border-emerald-200 bg-emerald-50/20 dark:border-emerald-900/40 dark:bg-emerald-950/10"
                        : "border-line bg-surface hover:border-ink/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="rounded-md bg-muted px-2 py-0.5 text-2xs font-bold uppercase text-ink">
                            {challenge.category}
                          </span>
                          {challenge.timeLimitMinutes ? (
                            <span className="flex items-center gap-1 text-2xs text-ink-soft">
                              <Clock size={11} /> {challenge.timeLimitMinutes}m limit
                            </span>
                          ) : null}
                        </div>
                        <h4 className="font-bold text-ink text-sm mt-1.5">{challenge.title}</h4>
                      </div>

                      <div className="text-right">
                        <span className="font-mono text-sm font-bold text-indigo-600">
                          {challenge.points} pts
                        </span>
                        {isSolved ? (
                          <span className="block text-2xs font-bold text-emerald-600 flex items-center gap-1">
                            <CheckCircle2 size={11} /> Solved
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <p className="mt-2 text-xs text-ink-soft leading-relaxed">{challenge.description}</p>

                    {/* Docker Sandbox Launch for this challenge */}
                    {challenge.requiresDocker ? (
                      <div className="mt-3 rounded-xl border border-line bg-muted/40 p-3 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-ink flex items-center gap-1">
                            <Box size={14} className="text-indigo-600" /> Isolated Machine
                          </span>
                          {teamSandbox ? (
                            <span className="text-2xs font-semibold text-emerald-600">
                              Running on port {teamSandbox.portMappings[0]?.hostPort || 22}
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleLaunchSandbox(challenge.id, challenge.title)}
                              disabled={isPending}
                              className={buttonClass("primary", "sm")}
                            >
                              Launch Machine
                            </button>
                          )}
                        </div>
                        {teamSandbox ? (
                          <p className="mt-1 font-mono text-2xs text-ink-soft">
                            Endpoint: {teamSandbox.hostEndpoint} · User: {teamSandbox.credentials?.username}
                          </p>
                        ) : null}
                      </div>
                    ) : null}

                    {/* Flag Submission Input */}
                    <div className="mt-4 pt-3 border-t border-line/60">
                      {isSolved ? (
                        <div className="rounded-xl bg-emerald-100/60 p-2 text-center text-xs font-semibold text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                          ✓ Flag Verified! +{challenge.points} points awarded.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={flagInputs[challenge.id] || ""}
                              onChange={(e) =>
                                setFlagInputs((prev) => ({ ...prev, [challenge.id]: e.target.value }))
                              }
                              placeholder="FLAG{...}"
                              className={`flex-1 ${fieldClass}`}
                            />
                            <button
                              type="button"
                              onClick={() => handleFlagSubmit(challenge.id)}
                              disabled={isPending}
                              className={buttonClass("primary", "sm")}
                            >
                              Submit
                            </button>
                          </div>

                          {msg ? (
                            <p
                              className={`text-2xs font-semibold ${
                                msg.isCorrect ? "text-emerald-600" : "text-red-600"
                              }`}
                            >
                              {msg.msg}
                            </p>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      {/* TAB 2: PHASE PROGRESSION */}
      {activeTab === "phases" ? (
        <div className="space-y-6">
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/20 p-4 dark:border-indigo-900/50 dark:bg-indigo-950/10">
            <span className="font-bold text-xs text-indigo-900 dark:text-indigo-200 block">
              Sequential Milestone Rule
            </span>
            <p className="text-xs text-indigo-800/80 dark:text-indigo-300/80 mt-0.5">
              Each phase must be completed before the next unlocks. Once closed by the organizer, previous phases cannot be altered or revisited.
            </p>
          </div>

          <div className="space-y-4">
            {phases.map((phase) => {
              const isClosed = phase.isClosed;
              const isCompleted = phaseProgress?.completedPhaseNumbers?.includes(phase.phaseNumber);
              const isUnlocked =
                phase.phaseNumber === 1 ||
                (phaseProgress?.completedPhaseNumbers?.includes(phase.phaseNumber - 1) && !isClosed);

              return (
                <div
                  key={phase.id}
                  className={`rounded-2xl border p-5 transition ${
                    isClosed
                      ? "border-line bg-muted/40 opacity-75"
                      : isCompleted
                      ? "border-emerald-200 bg-emerald-50/20 dark:border-emerald-900/50"
                      : isUnlocked
                      ? "border-indigo-200 bg-paper shadow-xs"
                      : "border-line bg-muted/20 opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-ink font-bold text-xs text-white">
                        #{phase.phaseNumber}
                      </span>
                      <div>
                        <h4 className="font-bold text-ink text-sm">{phase.title}</h4>
                        {phase.deadline ? (
                          <span className="text-2xs text-ink-soft">Deadline: {phase.deadline}</span>
                        ) : null}
                      </div>
                    </div>

                    <div>
                      {isClosed ? (
                        <span className="flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800 dark:bg-red-950/60 dark:text-red-300">
                          <Lock size={12} /> Phase Closed
                        </span>
                      ) : isCompleted ? (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                          <CheckCircle2 size={12} /> Completed
                        </span>
                      ) : isUnlocked ? (
                        <span className="flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                          <Unlock size={12} /> Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-ink-soft">
                          <Lock size={12} /> Locked (Requires Phase {phase.phaseNumber - 1})
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="mt-3 text-xs text-ink-soft">{phase.description}</p>

                  {/* Submission Box if Active and Not Closed */}
                  {isUnlocked && !isClosed && !isCompleted ? (
                    <div className="mt-4 border-t border-line/60 pt-4 space-y-3">
                      <h5 className="text-xs font-bold text-ink">Submit Phase Deliverables</h5>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <input
                          placeholder="GitHub Repository URL"
                          value={phaseGithub}
                          onChange={(e) => setPhaseGithub(e.target.value)}
                          className={fieldClass}
                        />
                        <input
                          placeholder="Live Demo / Pitch Deck Link"
                          value={phaseDemo}
                          onChange={(e) => setPhaseDemo(e.target.value)}
                          className={fieldClass}
                        />
                      </div>
                      <textarea
                        rows={2}
                        placeholder="Notes or milestone explanation for judges..."
                        value={phaseNotes}
                        onChange={(e) => setPhaseNotes(e.target.value)}
                        className={fieldClass}
                      />
                      <button
                        type="button"
                        onClick={() => handlePhaseSubmit(phase.phaseNumber)}
                        disabled={isPending}
                        className={buttonClass("primary", "sm")}
                      >
                        Submit & Complete Phase {phase.phaseNumber}
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* TAB 3: DOCKER SANDBOX (PREMIUM) */}
      {activeTab === "sandbox" ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-2xl border border-indigo-200 bg-indigo-50/20 p-4 dark:border-indigo-900/50">
            <Box size={20} className="text-indigo-600 mt-0.5" />
            <div>
              <h4 className="font-bold text-xs text-ink">Per-Team Container Isolation</h4>
              <p className="text-xs text-ink-soft mt-0.5">
                Target machines are provisioned strictly in your team&apos;s sandbox. No other team shares your container instance or attack surface.
              </p>
            </div>
          </div>

          {sandboxes.filter((s) => s.teamId === team.id).length === 0 ? (
            <p className="text-xs text-ink-soft py-6 text-center italic">
              No active sandbox instances. Launch a machine from any challenge requiring Docker in the Challenges tab.
            </p>
          ) : (
            <div className="space-y-4">
              {sandboxes
                .filter((s) => s.teamId === team.id)
                .map((sb) => (
                  <div key={sb.id} className="rounded-2xl border border-line bg-surface p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono text-2xs text-indigo-600">{sb.id}</span>
                        <h5 className="font-bold text-ink text-sm">{sb.challengeTitle}</h5>
                      </div>
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-2xs font-bold uppercase text-emerald-800">
                        {sb.status}
                      </span>
                    </div>

                    <div className="rounded-xl border border-line bg-muted/40 p-3 font-mono text-2xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-ink-soft">Target URL:</span>
                        <span className="text-ink font-semibold">{sb.hostEndpoint}</span>
                      </div>
                      {sb.portMappings.map((pm, i) => (
                        <div key={i} className="flex justify-between">
                          <span className="text-ink-soft">{pm.protocol} Port:</span>
                          <span className="text-indigo-600 font-semibold">{pm.hostPort}</span>
                        </div>
                      ))}
                      {sb.credentials?.username ? (
                        <div className="flex justify-between border-t border-line/40 pt-1">
                          <span className="text-ink-soft">Credentials:</span>
                          <span className="text-ink">
                            {sb.credentials.username} : {sb.credentials.password}
                          </span>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-2xs text-ink-soft">Resets used: {sb.resetCount}</span>
                      <button
                        type="button"
                        onClick={() => handleResetSandbox(sb.id)}
                        disabled={isPending}
                        className={buttonClass("secondary", "sm")}
                      >
                        <RotateCcw size={12} /> Reset Environment
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      ) : null}

      {/* TAB 4: DAILY SCHEDULE & TASKS */}
      {activeTab === "schedule" ? (
        <div className="space-y-4">
          {schedules.length === 0 ? (
            <p className="text-xs text-ink-soft py-6 text-center italic">
              No daily schedules released yet. Check back during kickoff.
            </p>
          ) : (
            <div className="space-y-4">
              {schedules.map((sch) => (
                <div key={sch.id} className="rounded-2xl border border-line bg-surface p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-ink text-sm">
                      Day {sch.dayNumber}: {sch.title}
                    </h4>
                    {sch.date ? <span className="text-2xs text-ink-soft">{sch.date}</span> : null}
                  </div>

                  <p className="text-xs text-ink-soft">{sch.description}</p>

                  {sch.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="rounded-xl border border-indigo-200 bg-indigo-50/20 p-4 dark:border-indigo-900/50 space-y-2"
                    >
                      <span className="font-bold text-xs text-ink block">{task.title}</span>
                      <p className="text-xs text-ink-soft whitespace-pre-line">{task.instructions}</p>

                      <div className="mt-3 border-t border-line/60 pt-3 space-y-2">
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <input
                            placeholder="GitHub Repository URL"
                            value={dailyGithub}
                            onChange={(e) => setDailyGithub(e.target.value)}
                            className={fieldClass}
                          />
                          <input
                            placeholder="External Demo / Artifact URL"
                            value={dailyExternal}
                            onChange={(e) => setDailyExternal(e.target.value)}
                            className={fieldClass}
                          />
                        </div>
                        <input
                          placeholder="Submission notes or summary..."
                          value={dailyNotes}
                          onChange={(e) => setDailyNotes(e.target.value)}
                          className={fieldClass}
                        />
                        <button
                          type="button"
                          onClick={() => handleDailyTaskSubmit(task.id, sch.dayNumber)}
                          disabled={isPending}
                          className={buttonClass("primary", "sm")}
                        >
                          Submit Day {sch.dayNumber} Deliverable
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
