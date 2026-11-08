import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Card, CardBody } from "@/src/shared_components/ui/Card";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import { formatExactSecond } from "@/src/lib/datetime";
import { RichDescription } from "@/src/shared_components/ui/RichDescription";
import {
  eventIsHackathon,
  getTrack,
  listTeamsOfEvent,
} from "@/src/features/hackathon/hackathon.service";
import { requireCompeteRegistration } from "@/src/features/hackathon/competeSession";
import { getParticipantAccess } from "@/src/features/hackathon/participantAccess";
import { HackathonCountdown } from "@/src/features/hackathon/components/HackathonCountdown";
import { CompeteMonitoring } from "@/src/features/hackathon/components/CompeteMonitoring";
import { CompeteRulesGate } from "@/src/features/hackathon/components/CompeteRulesGate";
import {
  getEffectiveConfig,
  listPhasesForTrack,
  phaseIsOpen,
  phaseWindow,
  readTeamTaskState,
  taskCutoff,
  teamCompletions,
  trackTaskScoreboard,
  visibleTasksForTeam,
  taskOrganizerAttachment,
  taskOrganizerBrief,
  fileStoreProxyUrl,
} from "@/src/features/hackathon/tasks.service";
import { listTaskSubmissionsForEvent } from "@/src/features/hackathon/taskSubmissions.service";
import {
  revealHint,
  startTask,
  submitTaskFlag,
  submitTaskWork,
} from "@/src/features/hackathon/actions/tasks.action";
import { LiveRefresh } from "@/src/features/hackathon/components/LiveRefresh";
import { TaskWorkSubmit } from "@/src/features/hackathon/components/TaskWorkSubmit";
import { EventService } from "@/src/services/event.service";
import { HACKATHON_CONFIG_KEYS } from "@/src/features/hackathon/configKeys";

export const metadata = { title: "Compete — Avoeline" };

type Tab = "instructions" | "tasks" | "scoreboard" | "submissions" | "team";

export default async function CompeteDashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ e?: string; ok?: string; tab?: string; category?: string }>;
}) {
  const { eventId } = await params;
  const { e, ok, tab: tabRaw, category } = await searchParams;
  const [event, session] = await Promise.all([
    EventService.getEventByID(eventId),
    requireCompeteRegistration(eventId),
  ]);
  if (!event || !(await eventIsHackathon(event))) notFound();
  if (!session) redirect(`/events/${eventId}/enter`);

  const access = await getParticipantAccess({
    eventId,
    registrationId: session.registration.registrationId,
    teamId: session.teamId,
  });
  if (!access.allowed) {
    return (
      <main className="mx-auto w-full max-w-lg space-y-4 px-4 py-10 sm:px-6">
        <h1 className="font-display text-2xl text-ink">{access.title}</h1>
        <p className="text-sm text-ink-soft">{access.message}</p>
        <p className="text-sm font-medium text-ink">{access.nextAction}</p>
        {access.reasonCode === "competition_not_open" && access.opensAt ? (
          <HackathonCountdown endsAt={access.opensAt} label="Opens in" />
        ) : null}
        <Link href={`/events/${eventId}/enter`} className={buttonClass("secondary", "sm")}>
          Back to code entry
        </Link>
      </main>
    );
  }

  const teams = await listTeamsOfEvent(eventId);
  const team = teams.find((t) => t.id === session.teamId);
  if (!team) redirect(`/events/${eventId}/enter`);
  const track = await getTrack(team.trackId);
  if (!track) notFound();

  const cfg = await getEffectiveConfig(track.id);
  const timeZone = event.schedule?.timezone || "UTC";
  const scoreboardOn = cfg.on("live_scoreboard");
  const requestedTab: Tab =
    tabRaw === "instructions" ||
    tabRaw === "tasks" ||
    tabRaw === "scoreboard" ||
    tabRaw === "submissions" ||
    tabRaw === "team"
      ? tabRaw
      : "tasks";
  // Hide scoreboard when the setting is off (deep links fall back to tasks).
  const tab: Tab = requestedTab === "scoreboard" && !scoreboardOn ? "tasks" : requestedTab;

  const activeRules = HACKATHON_CONFIG_KEYS.filter((k) => cfg.on(k.key) && !k.toggleOnly).map(
    (k) => k.effect,
  );

  if (!team.rulesAcknowledgedAt) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <CompeteRulesGate
          eventId={eventId}
          rules={
            activeRules.length
              ? activeRules
              : ["Follow the organizer instructions and compete fairly with your team."]
          }
        />
      </main>
    );
  }

  const [allVisible, state, done, scoreboard, phases, mySubs] = await Promise.all([
    visibleTasksForTeam(track.id, team.id, cfg),
    readTeamTaskState(team.id),
    teamCompletions(team.id),
    // Always isolate to this team's competition (session track), never event-wide mix.
    scoreboardOn ? trackTaskScoreboard(track.id) : Promise.resolve([]),
    listPhasesForTrack(track.id),
    listTaskSubmissionsForEvent(eventId, { trackId: track.id }).then((rows) =>
      rows.filter((r) => r.teamId === team.id),
    ),
  ]);

  const categories = cfg.on("task_categories")
    ? [...new Set(allVisible.map((t) => t.category).filter((c): c is string => !!c))].sort()
    : [];
  const tasks =
    category && cfg.on("task_categories")
      ? allVisible.filter((t) => t.category === category)
      : allVisible;
  const cutoff = taskCutoff(cfg, track.submissionDeadlineAt || track.submissionDeadline);
  // eslint-disable-next-line react-hooks/purity -- server request-time deadline check
  const ended = cutoff ? Date.now() > Date.parse(cutoff) : false;
  const myPoints = [...done.values()].reduce((n, c) => n + (c.correct ? c.points : 0), 0);
  const base = `/events/${eventId}/compete`;
  const start = startTask.bind(null, eventId, session.registration.registrationId);
  const hint = revealHint.bind(null, eventId, session.registration.registrationId);
  const submit = submitTaskFlag.bind(null, eventId, session.registration.registrationId);
  const work = submitTaskWork.bind(null, eventId, session.registration.registrationId);

  const tabs: { id: Tab; label: string; href: string; show?: boolean }[] = [
    { id: "instructions", label: "Instructions", href: `${base}?tab=instructions` },
    { id: "tasks", label: "Phases & Tasks", href: `${base}?tab=tasks` },
    {
      id: "scoreboard",
      label: "Scoreboard",
      href: `${base}?tab=scoreboard`,
      show: scoreboardOn,
    },
    { id: "submissions", label: "Submissions", href: `${base}?tab=submissions` },
    { id: "team", label: "Team", href: `${base}?tab=team` },
  ];

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <header className="space-y-2">
        <h1 className="font-display text-2xl text-ink">{event.title}</h1>
        <p className="text-sm text-ink-soft">
          {team.name} · {track.name} ·{" "}
          {Math.max(team.members.length, team.memberRegistrationIds.length)} members · your points{" "}
          {myPoints}
        </p>
        {cutoff ? <HackathonCountdown endsAt={cutoff} label="Event timer" /> : null}
        <CompeteMonitoring
          eventId={eventId}
          activityOn={cfg.on("team_attendance") || cfg.on("activity_check_interval")}
          integrityOn={cfg.on("anti_cheat_tab_close")}
          intervalMinutes={
            cfg.num("activity_check_interval", "minutes", 0) ||
            cfg.num("team_attendance", "intervalMinutes", 60)
          }
        />
      </header>

      {activeRules.length ? (
        <Card title="Active rules">
          <CardBody>
            <ul className="list-disc space-y-1 pl-5 text-sm text-ink-soft">
              {activeRules.slice(0, 6).map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}

      <nav className="flex flex-wrap gap-2 border-b border-line pb-3">
        {tabs
          .filter((t) => t.show !== false)
          .map((t) => (
            <Link
              key={t.id}
              href={t.href}
              className={buttonClass(tab === t.id ? "primary" : "secondary", "sm")}
            >
              {t.label}
            </Link>
          ))}
      </nav>

      {e ? <FormFeedback error={e} /> : null}
      {ok ? <FormFeedback success={ok} /> : null}

      {tab === "instructions" ? (
        <Card title="Competition instructions">
          <CardBody className="space-y-3">
            {track.instructions || track.rulesText || track.instructionsFileName ? (
              <>
                {track.instructions ? <RichDescription html={track.instructions} /> : null}
                {track.rulesText ? (
                  <div>
                    <p className={labelClass}>Rules</p>
                    <p className="whitespace-pre-wrap text-sm text-ink">{track.rulesText}</p>
                  </div>
                ) : null}
                {track.instructionsFileName ? (
                  <p className="text-xs text-ink-soft">Attachment: {track.instructionsFileName}</p>
                ) : null}
              </>
            ) : (
              <EmptyState
                size="sm"
                title="No instructions yet"
                description="The organizer has not published competition instructions for this track."
              />
            )}
          </CardBody>
        </Card>
      ) : null}

      {tab === "team" ? (
        <Card title="Team">
          <CardBody>
            <p className="text-sm text-ink">
              {team.name} · roster{" "}
              {team.unlockedByOrganizer ? "unlocked by organizer" : "locked when schedule says"}
            </p>
            <ul className="mt-3 divide-y divide-line">
              {team.members.map((m) => (
                <li key={m.registrationId} className="flex justify-between py-2 text-sm">
                  <span>
                    {m.name || m.email}
                    {m.isOwner ? " · lead" : ""}
                  </span>
                  <span className="text-ink-soft">{m.email}</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}

      {tab === "scoreboard" ? (
        <Card title={`Scoreboard · ${track.name}`} action={<LiveRefresh />}>
          <CardBody>
            {!scoreboardOn ? (
              <EmptyState
                size="sm"
                title="Scoreboard is off"
                description="The organizer turned off the live scoreboard for this competition."
              />
            ) : !scoreboard.length ? (
              <EmptyState
                size="sm"
                title="No scores yet"
                description="Ranks for this competition appear as teams solve tasks."
              />
            ) : (
              <ol className="space-y-2">
                {scoreboard.slice(0, 50).map((row, i) => (
                  <li
                    key={row.teamId}
                    className={`flex justify-between rounded-lg px-3 py-2 text-sm ${
                      row.teamId === team.id ? "bg-muted font-medium text-ink" : "text-ink-soft"
                    }`}
                  >
                    <span>
                      {i + 1}. {row.teamName}
                      {row.teamId === team.id ? " (you)" : ""}
                    </span>
                    <span className="tabular-nums">
                      {row.points} pts · {row.solved} solved
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </CardBody>
        </Card>
      ) : null}

      {tab === "submissions" ? (
        <Card title="Our submissions">
          <CardBody>
            {!mySubs.length ? (
              <EmptyState
                size="sm"
                title="No submissions yet"
                description="Submit from Phases & Tasks."
              />
            ) : (
              <ul className="divide-y divide-line">
                {mySubs.map((s) => (
                  <li key={s.id} className="py-3 text-sm">
                    <p className="font-medium text-ink">{s.taskTitle}</p>
                    <p className="text-xs text-ink-soft">
                      {formatExactSecond(s.submittedAt, timeZone)} · {s.status}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      ) : null}

      {tab === "tasks" ? (
        <div className="space-y-6">
          <Card title="Phases">
            <CardBody>
              {phases.length ? (
                <ul className="space-y-2 text-sm">
                  {phases.map((p) => {
                    const open = phaseIsOpen(p);
                    const w = phaseWindow(p);
                    return (
                      <li key={p.id} className={open ? "text-ink" : "text-ink-soft"}>
                        {p.name}
                        {!open ? " · closed" : " · open"}
                        {w.open ? ` · from ${formatExactSecond(w.open, timeZone)}` : ""}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <EmptyState
                  size="sm"
                  title="No phases yet"
                  description="Tasks may still appear below if the organizer published them without phases."
                />
              )}
            </CardBody>
          </Card>

          {categories.length ? (
            <div className="flex flex-wrap gap-2">
              <Link
                href={`${base}?tab=tasks`}
                className={buttonClass(!category ? "primary" : "secondary", "sm")}
              >
                All
              </Link>
              {categories.map((c) => (
                <Link
                  key={c}
                  href={`${base}?tab=tasks&category=${encodeURIComponent(c)}`}
                  className={buttonClass(category === c ? "primary" : "secondary", "sm")}
                >
                  {c}
                </Link>
              ))}
            </div>
          ) : null}

          {ended ? (
            <p className="text-sm text-ink-soft">
              The event timer has ended. New submissions are closed.
            </p>
          ) : null}

          {!tasks.length ? (
            <EmptyState
              size="sm"
              title="No tasks available"
              description="Nothing is released for your competition yet. Check back when a phase opens."
            />
          ) : (
            <ul className="space-y-4">
              {tasks.map((task) => {
                const started = state.taskStarts[task.id];
                const completion = done.get(task.id);
                const phase = phases.find((p) => p.id === task.phase_id);
                const lockedPhase = phase && cfg.on("phase_lock_no_revisit") && !phaseIsOpen(phase);
                const disabled = ended || lockedPhase;
                return (
                  <li key={task.id} className="rounded-xl border border-line p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="text-sm font-medium text-ink">{task.title}</h3>
                      <span className="text-xs tabular-nums text-ink-soft">
                        {task.points ?? 0} pts
                      </span>
                    </div>
                    {task.description ? (
                      <p className="mt-1 whitespace-pre-wrap text-sm text-ink-soft">
                        {task.description}
                      </p>
                    ) : null}
                    {lockedPhase ? (
                      <p className="mt-2 text-xs text-ink-soft">
                        Closed phase — writes are locked.
                      </p>
                    ) : null}
                    {completion?.correct ? (
                      <p className="mt-2 text-xs text-ink">Solved · {completion.points} pts</p>
                    ) : null}
                    {!disabled && cfg.on("per_task_timer") && !started ? (
                      <form action={start} className="mt-3">
                        <input type="hidden" name="taskId" value={task.id} />
                        <input type="hidden" name="returnTo" value={`${base}?tab=tasks`} />
                        <SubmitButton className={buttonClass("secondary", "sm")}>
                          Start timer
                        </SubmitButton>
                      </form>
                    ) : null}
                    {!disabled && cfg.on("ctf_flags") && task.flag_hash ? (
                      <form action={submit} className="mt-3 flex gap-2">
                        <input type="hidden" name="taskId" value={task.id} />
                        <input type="hidden" name="returnTo" value={`${base}?tab=tasks`} />
                        <input
                          name="flag"
                          className={fieldClass}
                          placeholder="Flag"
                          autoComplete="off"
                        />
                        <SubmitButton className={buttonClass("primary", "sm")}>
                          Submit flag
                        </SubmitButton>
                      </form>
                    ) : null}
                    {!disabled && cfg.on("task_hints") ? (
                      <form action={hint} className="mt-2">
                        <input type="hidden" name="taskId" value={task.id} />
                        <input type="hidden" name="returnTo" value={`${base}?tab=tasks`} />
                        <SubmitButton className={buttonClass("ghost", "sm")}>
                          Reveal hint
                        </SubmitButton>
                      </form>
                    ) : null}
                    {!disabled && !(cfg.on("ctf_flags") && task.flag_hash) ? (
                      <TaskWorkSubmit
                        action={work}
                        eventId={eventId}
                        trackId={track.id}
                        taskId={task.id}
                        linkRequired={cfg.on("link_submissions")}
                        returnTo={`${base}?tab=tasks`}
                        brief={taskOrganizerBrief(task)}
                        attachmentUrl={fileStoreProxyUrl(taskOrganizerAttachment(task) || {})}
                        attachmentLabel={taskOrganizerAttachment(task)?.fileName ?? null}
                      />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </main>
  );
}
