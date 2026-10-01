import { notFound, redirect } from "next/navigation";
import { Clock, Flag, Lightbulb, Trophy } from "lucide-react";
import { Card, CardBody } from "@/src/shared_components/ui/Card";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import { formatDateMedium } from "@/src/lib/datetime";
import { eventIsHackathon, getTrack, listTeamsOfEvent } from "@/src/features/hackathon/hackathon.service";
import { requireCompeteRegistration } from "@/src/features/hackathon/competeSession";
import { HackathonCountdown } from "@/src/features/hackathon/components/HackathonCountdown";
import {
    listPhasesForTrack,
    phaseIsOpen,
    phaseWindow,
    readTeamTaskState,
    taskCutoff,
    taskHints,
    teamCompletions,
    trackConfig,
    trackTaskScoreboard,
    visibleTasksForTeam,
} from "@/src/features/hackathon/tasks.service";
import { revealHint, startTask, submitTaskFlag, submitTaskWork } from "@/src/features/hackathon/actions/tasks.action";
import { LiveRefresh } from "@/src/features/hackathon/components/LiveRefresh";
import { getPublicEvent } from "@/src/features/registration/registration.service";

export const metadata = { title: "Compete — Avoeline" };

export default async function CompeteDashboardPage({
    params,
    searchParams,
}: {
    params: Promise<{ eventId: string }>;
    searchParams: Promise<{ e?: string; ok?: string; category?: string }>;
}) {
    const { eventId } = await params;
    const { e, ok, category } = await searchParams;
    const event = await getPublicEvent(eventId);
    if (!event || !(await eventIsHackathon(event))) notFound();

    const session = await requireCompeteRegistration(eventId);
    if (!session) redirect(`/events/${eventId}/enter`);

    const teams = await listTeamsOfEvent(eventId);
    const team = teams.find((t) => t.id === session.teamId);
    if (!team) redirect(`/events/${eventId}/enter`);
    const track = await getTrack(team.trackId);
    if (!track) notFound();

    const cfg = await trackConfig(track.id);
    const [allVisible, state, done, scoreboard, phases] = await Promise.all([
        visibleTasksForTeam(track.id, team.id, cfg),
        readTeamTaskState(team.id),
        teamCompletions(team.id),
        cfg.on("live_scoreboard") ? trackTaskScoreboard(track.id) : Promise.resolve([]),
        listPhasesForTrack(track.id),
    ]);

    const categories = cfg.on("task_categories")
        ? [...new Set(allVisible.map((t) => t.category).filter((c): c is string => !!c))].sort()
        : [];
    const tasks = category && cfg.on("task_categories") ? allVisible.filter((t) => t.category === category) : allVisible;
    const cutoff = taskCutoff(cfg, track.submissionDeadline);
    const ended = cutoff ? Date.now() > Date.parse(cutoff) : false;
    const myPoints = [...done.values()].reduce((n, c) => n + (c.correct ? c.points : 0), 0);
    const base = `/events/${eventId}/compete`;
    const start = startTask.bind(null, eventId, session.registration.registrationId);
    const hint = revealHint.bind(null, eventId, session.registration.registrationId);
    const submit = submitTaskFlag.bind(null, eventId, session.registration.registrationId);
    const work = submitTaskWork.bind(null, eventId, session.registration.registrationId);

    return (
        <main className="mx-auto w-full max-w-3xl space-y-8 px-4 py-10 sm:px-6">
            <div>
                <h1 className="font-display text-2xl text-ink">{event.title}</h1>
                <p className="mt-1 text-sm text-ink-soft">
                    {team.name} · {track.name} · {myPoints} point{myPoints === 1 ? "" : "s"}
                </p>
                {cutoff && cfg.on("hackathon_timer") ? <HackathonCountdown endsAt={cutoff} /> : null}
            </div>

            {e ? <FormFeedback error={e} /> : null}
            {ok ? <FormFeedback success={ok} /> : null}

            {phases.length ? (
                <section>
                    <h2 className="font-display text-base text-ink">Phases</h2>
                    <ul className="mt-3 space-y-2">
                        {phases.map((p) => {
                            const { open, close } = phaseWindow(p);
                            return (
                                <li key={p.id} className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                                    <span className="text-ink">{p.name}</span>
                                    <span className="text-xs text-ink-soft">
                                        {phaseIsOpen(p) ? "Open" : "Closed"}
                                        {open ? ` · ${formatDateMedium(open)}` : ""}
                                        {close ? ` – ${formatDateMedium(close)}` : ""}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                </section>
            ) : null}

            {cfg.on("live_scoreboard") ? (
                <section>
                    <h2 className="flex items-center gap-2 font-display text-base text-ink">
                        <Trophy className="h-4 w-4" aria-hidden="true" />
                        Scoreboard
                    </h2>
                    <LiveRefresh seconds={15} />
                    <ol className="mt-3 space-y-1 text-sm">
                        {scoreboard.slice(0, 20).map((row, i) => (
                            <li key={row.teamId} className={row.teamId === team.id ? "font-medium text-ink" : "text-ink-soft"}>
                                {i + 1}. {row.teamName} · {row.points} pts · {row.solved} solved
                            </li>
                        ))}
                    </ol>
                </section>
            ) : null}

            {categories.length ? (
                <nav className="flex flex-wrap gap-2 text-xs" aria-label="Task categories">
                    <a href={base} className={buttonClass(category ? "secondary" : "primary", "sm")}>All</a>
                    {categories.map((c) => (
                        <a key={c} href={`${base}?category=${encodeURIComponent(c)}`} className={buttonClass(category === c ? "primary" : "secondary", "sm")}>
                            {c}
                        </a>
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
                    const canSubmitFlag = takesFlag && !solved && !ended && (!timed || (startedAt && !timeUp));
                    const canSubmitWork = !takesFlag && !solved && !ended && (!timed || (startedAt && !timeUp));

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
                                                <input type="hidden" name="returnTo" value={base} />
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
                                            <input type="hidden" name="returnTo" value={base} />
                                            <SubmitButton className={buttonClass("secondary", "sm")}>Start task</SubmitButton>
                                        </form>
                                    ) : null}

                                    {canSubmitFlag ? (
                                        <form action={submit} className="flex flex-wrap items-end gap-2">
                                            <input type="hidden" name="taskId" value={t.id} />
                                            <input type="hidden" name="trackId" value={track.id} />
                                            <input type="hidden" name="returnTo" value={base} />
                                            <Input id={`flag-${t.id}`} name="flag" label="Flag" autoComplete="off" wrapperClassName="flex-1 min-w-48" />
                                            <SubmitButton className={buttonClass("primary", "md")}>Submit flag</SubmitButton>
                                        </form>
                                    ) : null}

                                    {canSubmitWork ? (
                                        <form action={work} className="space-y-3">
                                            <input type="hidden" name="taskId" value={t.id} />
                                            <input type="hidden" name="trackId" value={track.id} />
                                            <input type="hidden" name="returnTo" value={base} />
                                            <div className="flex flex-col gap-1.5">
                                                <label htmlFor={`url-${t.id}`} className={labelClass}>Link</label>
                                                <input id={`url-${t.id}`} name="submissionUrl" type="url" className={fieldClass} placeholder="https://" />
                                            </div>
                                            <div className="flex flex-col gap-1.5">
                                                <label htmlFor={`file-${t.id}`} className={labelClass}>File (max 1MB)</label>
                                                <input id={`file-${t.id}`} name="artifact" type="file" className="text-sm" />
                                            </div>
                                            <SubmitButton className={buttonClass("primary", "md")}>Submit work</SubmitButton>
                                        </form>
                                    ) : null}
                                </div>
                            </CardBody>
                        </Card>
                    );
                })
            )}
        </main>
    );
}
