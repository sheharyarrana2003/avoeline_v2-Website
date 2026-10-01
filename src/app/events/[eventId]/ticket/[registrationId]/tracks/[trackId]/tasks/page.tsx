import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Clock, Flag, Lightbulb, Trophy } from "lucide-react";
import { Card, CardBody } from "@/src/shared_components/ui/Card";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { buttonClass } from "@/src/lib/ui";
import { formatDateMedium } from "@/src/lib/datetime";
import { assertParticipant } from "@/src/features/events/ownership";
import { eventIsHackathon, getTrack, teamForRegistrationInTrack } from "@/src/features/hackathon/hackathon.service";
import {
  readTeamTaskState,
  taskCutoff,
  taskHints,
  teamCompletions,
  trackConfig,
  trackTaskScoreboard,
  visibleTasksForTeam,
} from "@/src/features/hackathon/tasks.service";
import { revealHint, startTask, submitTaskFlag } from "@/src/features/hackathon/actions/tasks.action";
import { LiveRefresh } from "@/src/features/hackathon/components/LiveRefresh";

export const metadata = { title: "Track tasks — Avoeline" };

/**
 * Participant task board, authorized by the ticket link like the team page.
 * Every switch on the organizer's Hackathon settings is applied here and
 * re-checked in the actions.
 */
export default async function ParticipantTasksPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string; registrationId: string; trackId: string }>;
  searchParams: Promise<{ e?: string; ok?: string; category?: string }>;
}) {
  const { eventId, registrationId, trackId } = await params;
  const { e, ok, category } = await searchParams;

  const who = await assertParticipant(eventId, registrationId);
  if (!who || !(await eventIsHackathon(who.event))) notFound();
  const track = await getTrack(trackId);
  if (!track || track.eventId !== who.event.id) notFound();

  const team = await teamForRegistrationInTrack(registrationId, track.id);
  const teamHref = `/events/${eventId}/ticket/${registrationId}/team`;

  if (!team) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <EmptyState
          icon={<Flag className="h-5 w-5" />}
          title="Join a team first"
          description="Tasks are solved as a team. Create or join one for this track, then come back."
          action={<Link href={teamHref} className={buttonClass()}>Go to teams</Link>}
        />
      </main>
    );
  }

  const cfg = await trackConfig(track.id);
  const [allVisible, state, done, scoreboard] = await Promise.all([
    visibleTasksForTeam(track.id, team.id, cfg),
    readTeamTaskState(team.id),
    teamCompletions(team.id),
    cfg.on("live_scoreboard") ? trackTaskScoreboard(track.id) : Promise.resolve([]),
  ]);

  const categories = cfg.on("task_categories")
    ? [...new Set(allVisible.map((t) => t.category).filter((c): c is string => !!c))].sort()
    : [];
  const tasks = category && cfg.on("task_categories") ? allVisible.filter((t) => t.category === category) : allVisible;

  const cutoff = taskCutoff(cfg, track.submissionDeadline);
  const ended = cutoff ? Date.now() > Date.parse(cutoff) : false;
  const myPoints = [...done.values()].reduce((n, c) => n + (c.correct ? c.points : 0), 0);
  const base = `/events/${eventId}/ticket/${registrationId}/tracks/${track.id}/tasks`;

  const start = startTask.bind(null, eventId, registrationId);
  const hint = revealHint.bind(null, eventId, registrationId);
  const submit = submitTaskFlag.bind(null, eventId, registrationId);

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-10 sm:px-6">
      <Link href={teamHref} className="inline-flex items-center gap-1 text-xs text-ink-soft hover:text-ink">
        <ChevronLeft className="h-3.5 w-3.5" />
        Back to your team
      </Link>

      <div>
        <h1 className="font-display text-2xl text-ink">{track.name} · tasks</h1>
        <p className="mt-1 text-sm text-ink-soft">
          {team.name} · {myPoints} point{myPoints === 1 ? "" : "s"}
          {cutoff ? ` · ${ended ? "ended" : "ends"} ${formatDateMedium(cutoff)}` : ""}
        </p>
      </div>

      {e ? <FormFeedback error={e} /> : null}
      {ok ? <FormFeedback success={ok} /> : null}

      {categories.length ? (
        <nav className="flex flex-wrap gap-2 text-xs" aria-label="Task categories">
          <Link href={base} className={buttonClass(category ? "secondary" : "primary", "sm")}>All</Link>
          {categories.map((c) => (
            <Link key={c} href={`${base}?category=${encodeURIComponent(c)}`} className={buttonClass(category === c ? "primary" : "secondary", "sm")}>
              {c}
            </Link>
          ))}
        </nav>
      ) : null}

      {tasks.length === 0 ? (
        <EmptyState
          icon={<Flag className="h-5 w-5" />}
          title="No tasks open right now"
          description="Tasks appear when the organiser publishes them or their phase opens."
        />
      ) : (
        tasks.map((t) => {
          const completion = done.get(t.id);
          const solved = completion?.correct === true;
          const hints = taskHints(t);
          const revealed = state.hintsRevealed[t.id] === true;
          const timed = cfg.on("per_task_timer") && !!t.time_limit_minutes;
          const startedAt = state.taskStarts[t.id];
          const timeUp = timed && startedAt ? Date.now() > Date.parse(startedAt) + (t.time_limit_minutes ?? 0) * 60_000 : false;
          const takesFlag = cfg.on("ctf_flags") && !!t.flag_hash;
          const canSubmit = takesFlag && !solved && !ended && (!timed || (startedAt && !timeUp));

          return (
            <Card key={t.id} title={t.title}>
              <CardBody>
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge size="sm">{t.points ?? 0} pts</Badge>
                    {t.category ? <Badge size="sm" variant="outline">{t.category}</Badge> : null}
                    {solved ? <Badge size="sm" variant="success">solved · {completion?.points} pts</Badge> : null}
                    {timed ? (
                      <Badge size="sm" variant={timeUp ? "danger" : "neutral"} icon={<Clock className="h-3 w-3" />}>
                        {startedAt
                          ? timeUp
                            ? "time up"
                            : `until ${formatDateMedium(new Date(Date.parse(startedAt) + (t.time_limit_minutes ?? 0) * 60_000).toISOString())}`
                          : `${t.time_limit_minutes} min once started`}
                      </Badge>
                    ) : null}
                  </div>
                  {t.description ? <p className="whitespace-pre-line text-sm text-ink-soft">{t.description}</p> : null}

                  {cfg.on("task_hints") && hints.length ? (
                    revealed ? (
                      <p className="flex items-start gap-2 rounded-lg bg-muted px-3 py-2 text-sm text-ink">
                        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                        {hints[0]}
                      </p>
                    ) : !solved ? (
                      <form action={hint}>
                        <input type="hidden" name="taskId" value={t.id} />
                        <input type="hidden" name="trackId" value={track.id} />
                        <SubmitButton className={buttonClass("ghost", "sm")}>
                          Reveal hint
                          {cfg.num("task_hints", "penalty", 0) > 0 ? ` (−${cfg.num("task_hints", "penalty", 0)} pts)` : ""}
                        </SubmitButton>
                      </form>
                    ) : null
                  ) : null}

                  {timed && !startedAt && !solved && !ended ? (
                    <form action={start}>
                      <input type="hidden" name="taskId" value={t.id} />
                      <input type="hidden" name="trackId" value={track.id} />
                      <SubmitButton className={buttonClass("secondary", "sm")}>Start task</SubmitButton>
                    </form>
                  ) : null}

                  {canSubmit ? (
                    <form action={submit} className="flex flex-wrap items-end gap-2">
                      <input type="hidden" name="taskId" value={t.id} />
                      <input type="hidden" name="trackId" value={track.id} />
                      <Input id={`flag-${t.id}`} name="flag" label="Flag" autoComplete="off" wrapperClassName="flex-1 min-w-48" />
                      <SubmitButton className={buttonClass("primary", "md")}>Submit flag</SubmitButton>
                    </form>
                  ) : !takesFlag && !solved ? (
                    <p className="text-xs text-ink-soft">Hand this in through your project submission.</p>
                  ) : null}
                </div>
              </CardBody>
            </Card>
          );
        })
      )}

      {cfg.on("live_scoreboard") ? (
        <Card title="Scoreboard" action={<LiveRefresh />}>
          <CardBody>
            {scoreboard.length ? (
              <ol className="divide-y divide-line">
                {scoreboard.map((row, i) => (
                  <li
                    key={row.teamId}
                    className={`flex items-center justify-between py-2 text-sm ${row.teamId === team.id ? "font-semibold text-ink" : "text-ink-soft"}`}
                  >
                    <span className="flex items-center gap-2">
                      {i === 0 && row.points > 0 ? <Trophy className="h-4 w-4" aria-hidden="true" /> : <span className="w-4 text-right tabular-nums">{i + 1}</span>}
                      {row.teamName}
                    </span>
                    <span className="tabular-nums">
                      {row.points} pts · {row.solved} solved
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-ink-soft">No teams yet.</p>
            )}
          </CardBody>
        </Card>
      ) : null}
    </main>
  );
}
