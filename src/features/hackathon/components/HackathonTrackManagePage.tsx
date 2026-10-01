import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Download, Gavel, Trophy, Users } from "lucide-react";
import { Card, CardBody } from "@/src/shared_components/ui/Card";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { MetricTile } from "@/src/shared_components/ui/MetricTile";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { ConfirmSubmit } from "@/src/shared_components/ui/ConfirmDialog";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import { buttonClass, fieldClass, tableCell, tableHead, tableRow } from "@/src/lib/ui";
import { formatDate, formatDateMedium } from "@/src/lib/datetime";
import { formatCurrency } from "@/src/lib/money";
import { CERTIFICATES_BUCKET, getSignedUrl } from "@/data/supabase";
import { assertOwnedEvent } from "@/src/features/events/ownership";
import { getEventOrganizations } from "@/src/features/organizations/organizations.service";
import { getTrack, judgesForTrack, listTeams } from "@/src/features/hackathon/hackathon.service";
import { judgingReady, rankTeams, rubricMax } from "@/src/features/hackathon/judging";
import { Leaderboard } from "@/src/features/hackathon/components/Leaderboard";
import { LiveRefresh } from "@/src/features/hackathon/components/LiveRefresh";
import { AdvanceRoundForm, RubricForm } from "@/src/features/hackathon/components/JudgingForms";
import { advanceRound, saveRubric } from "@/src/features/hackathon/actions/judging.action";
import {
    deadlinePassed,
    meetsMinimum,
    rosterLocked,
    rosterProgress,
    submissionStatus,
    teamSkills,
    trackSponsor,
} from "@/src/features/hackathon/types";
import { removeMember, removeTeam, setFeeStatus, setTeamUnlocked } from "@/src/features/hackathon/actions/roster.action";
import { listTasksForTrack, listPhasesForTrack, getHackathonConfig, taskHints } from "@/src/features/hackathon/tasks.service";
import { deleteHackathonTask, saveHackathonTask } from "@/src/features/hackathon/actions/tasks.action";
import { HackathonConfigPanel } from "@/src/features/hackathon/components/ConfigToggleRow";
import { TeamCreator } from "@/src/features/teams/components/TeamCreator";
import { Input } from "@/components/ui/Input";
import { HACKATHON_KIND_LABELS, hackathonDashPath, isCtfKind } from "@/src/features/hackathon/kinds";

/**
 * One track: its teams, their rosters, their submissions, and the two decisions
 * only the organizer can make -- unlocking a roster past the lock date, and
 * confirming the entry fee.
 *
 * Private files are signed at render rather than stored as URLs: a signed link
 * expires within the hour, so a stored one would be dead by the time anybody
 * clicked it. Same reasoning as certificates and exports.
 */
export default async function TrackDetailPage({
    params,
    searchParams,
}: {
    params: Promise<{ organizer_id: string; eventId: string; trackId: string }>;
    searchParams: Promise<{ e?: string }>;
}) {
    const { organizer_id, eventId, trackId } = await params;
    const { e } = await searchParams;

    const event = await assertOwnedEvent(eventId);
    if (!event) notFound();

    const track = await getTrack(trackId);
    if (!track || track.eventId !== event.id) notFound();

    const [teams, orgs, judges, tasks, configRows, phases] = await Promise.all([
        listTeams(track.id),
        getEventOrganizations(event.id),
        judgesForTrack(event.id, track.id),
        listTasksForTrack(track.id),
        getHackathonConfig(track.id),
        listPhasesForTrack(track.id),
    ]);
    const sponsor = trackSponsor(orgs, track.id);
    const ctf = isCtfKind(track.kind);
    const base = `${hackathonDashPath(organizer_id, eventId)}/competitions`;

    const rulesUrl = track.rulesPath
        ? await getSignedUrl(CERTIFICATES_BUCKET, track.rulesPath, 3600, track.rulesName || "rules.pdf").catch(() => "")
        : "";

    // Signed per team, in one pass, so the table can offer real downloads.
    const deckUrls = new Map<string, string>();
    await Promise.all(
        teams
            .filter((t) => t.submission.deckPath)
            .map(async (t) => {
                const url = await getSignedUrl(
                    CERTIFICATES_BUCKET,
                    t.submission.deckPath,
                    3600,
                    t.submission.deckName || `${t.name}-deck`,
                ).catch(() => "");
                if (url) deckUrls.set(t.id, url);
            }),
    );

    const submitted = teams.filter((t) => t.submission.submittedAt).length;
    const locked = rosterLocked(track, { unlockedByOrganizer: false });
    const closed = deadlinePassed(track);

    const ranked = rankTeams(teams, track.rubric, track.currentRound, judges.length);
    const inRound = ranked.length;

    return (
        <div className="space-y-8">
            <div>
                <Link href={base} className="inline-flex items-center gap-1 text-xs text-ink-soft hover:text-ink">
                    <ChevronLeft className="h-3.5 w-3.5" />
                    All tracks
                </Link>
                <h2 className="mt-2 font-display text-xl text-ink">
                    {track.name}{" "}
                    <span className="text-base font-normal text-ink-soft">{HACKATHON_KIND_LABELS[track.kind]}</span>
                </h2>
                {track.description ? <p className="mt-1 max-w-3xl text-sm text-ink-soft">{track.description}</p> : null}
                {track.rulesText ? <p className="mt-2 max-w-3xl whitespace-pre-wrap text-sm text-ink">{track.rulesText}</p> : null}
            </div>

            {e ? <FormFeedback error={e} /> : null}

            <Card title="Tasks">
                <CardBody>
                    <div className="space-y-6">
                        <form action={saveHackathonTask} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            <input type="hidden" name="trackId" value={track.id} />
                            <input type="hidden" name="eventId" value={eventId} />
                            <input type="hidden" name="organizerId" value={organizer_id} />
                            <Input id="task-title" name="title" label="Title" required />
                            <Input id="task-category" name="category" label="Category" helperText="Used by the category filter." />
                            <Input id="task-points" name="points" type="number" min={0} label="Points" />
                            <Input
                                id="task-desc"
                                name="description"
                                label={ctf ? "Description" : "Brief"}
                                wrapperClassName="sm:col-span-2 lg:col-span-3"
                            />
                            {ctf ? (
                            <Input id="task-flag" name="flag" label="Flag (hashed on save)" helperText="Needs CTF flags on." />
                            ) : null}
                            <Input id="task-hint" name="hint" label="Hint" helperText="Needs task hints on." />
                            <Input
                                id="task-limit"
                                name="timeLimit"
                                type="number"
                                min={0}
                                label="Time limit (minutes)"
                                helperText="Needs per-task timer on."
                            />
                            <label className="flex flex-col gap-1.5 text-2xs font-medium uppercase tracking-wider text-ink-soft">
                                Phase
                                <select name="phaseId" className={fieldClass} defaultValue="">
                                    <option value="">No phase (always listed)</option>
                                    {phases.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="flex items-center gap-2 self-end pb-2.5 text-sm text-ink">
                                <input type="checkbox" name="isRandom" />
                                In the random pool
                            </label>
                            <div className="flex items-end">
                                <SubmitButton className={buttonClass()}>Add task</SubmitButton>
                            </div>
                        </form>

                        {tasks.length ? (
                            <ul className="divide-y divide-line border-y border-line">
                                {tasks.map((t) => (
                                    <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm">
                                        <span className="text-ink">
                                            {t.title}
                                            <span className="text-ink-soft">
                                                {" "}
                                                · {t.points ?? 0} pts
                                                {t.category ? ` · ${t.category}` : ""}
                                                {t.flag_hash ? " · flag" : ""}
                                                {taskHints(t).length ? " · hint" : ""}
                                                {t.time_limit_minutes ? ` · ${t.time_limit_minutes} min` : ""}
                                                {t.is_random ? " · random" : ""}
                                                {t.phase_id ? ` · ${phases.find((p) => p.id === t.phase_id)?.name ?? "phase"}` : ""}
                                            </span>
                                        </span>
                                        <form action={deleteHackathonTask}>
                                            <input type="hidden" name="trackId" value={track.id} />
                                            <input type="hidden" name="eventId" value={eventId} />
                                            <input type="hidden" name="organizerId" value={organizer_id} />
                                            <input type="hidden" name="taskId" value={t.id} />
                                            <ConfirmSubmit
                                                tone="danger"
                                                title={`Delete ${t.title}?`}
                                                description="Its completions and assignments are removed too."
                                                confirmLabel="Delete"
                                                className="text-2xs uppercase text-ink-faint hover:text-ink"
                                            >
                                                Delete
                                            </ConfirmSubmit>
                                        </form>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-ink-soft">No tasks yet. Participants open them from their ticket&apos;s team page.</p>
                        )}
                    </div>
                </CardBody>
            </Card>

            <section id="settings" className="scroll-mt-24 space-y-4">
                <h3 className="font-display text-lg text-ink">Hackathon settings</h3>
                <p className="text-sm text-ink-soft">
                    Per-track toggles. Docker sandboxing is stored only — it does not start machines.
                </p>
                <HackathonConfigPanel
                    trackId={track.id}
                    eventId={eventId}
                    organizerId={organizer_id}
                    kind={track.kind}
                    rows={configRows as { config_key: string; enabled: boolean; config_value: unknown }[]}
                />
            </section>

            <section className="grid grid-cols-2 gap-y-8 border-y border-line py-8 sm:grid-cols-5 sm:divide-x sm:divide-line">
                <MetricTile
                    label="Teams"
                    value={`${teams.length}`}
                    icon={<Users className="h-4 w-4" />}
                    sublabel={`${teams.reduce((n, t) => n + t.members.length, 0)} participants`}
                />
                <MetricTile label="Submitted" value={`${submitted}`} sublabel={closed ? "Deadline passed" : "Deadline open"} />
                <MetricTile
                    label="Entry fee"
                    value={track.fee > 0 ? formatCurrency(track.fee, track.currency) : "Free"}
                    sublabel={track.fee > 0 ? "Per team, confirmed by you" : "No fee to confirm"}
                />
                <MetricTile
                    label="Roster"
                    value={locked ? "Locked" : "Open"}
                    sublabel={track.rosterLockDate ? `Locks ${formatDate(track.rosterLockDate)}` : "No lock date set"}
                />
                <MetricTile
                    label="Round"
                    value={`${track.currentRound}`}
                    icon={<Trophy className="h-4 w-4" />}
                    sublabel={
                        judgingReady(track)
                            ? `${judges.length} judge${judges.length === 1 ? "" : "s"} · ${inRound} team${inRound === 1 ? "" : "s"} in`
                            : "No rubric yet"
                    }
                />
            </section>

            <Card title="Track details">
                <CardBody>
                    <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                        <Fact label="Team size" value={`${track.minTeamSize} to ${track.maxTeamSize}`} />
                        <Fact
                            label="Submission deadline"
                            value={track.submissionDeadline ? formatDate(track.submissionDeadline) : "Not set"}
                        />
                        <Fact label="Dedicated sponsor" value={sponsor?.name ?? "None"} />
                        <Fact
                            label="Rules or problem statement"
                            value={
                                rulesUrl ? (
                                    <a href={rulesUrl} className="inline-flex items-center gap-1.5 font-medium text-ink hover:underline">
                                        <Download size={13} aria-hidden="true" />
                                        {track.rulesName || "Download"}
                                    </a>
                                ) : (
                                    "None uploaded"
                                )
                            }
                        />
                        {track.prizePool ? <Fact label="Prize pool" value={track.prizePool} wide /> : null}
                    </dl>
                </CardBody>
            </Card>

            <Card title={`Judging — round ${track.currentRound}`}>
                <CardBody>
                    <div className="grid gap-8 lg:grid-cols-2">
                        <div>
                            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
                                <Gavel className="h-4 w-4" aria-hidden="true" />
                                Rubric
                            </h3>
                            <RubricForm
                                trackId={track.id}
                                rubric={track.rubric}
                                action={saveRubric.bind(null, eventId)}
                            />
                        </div>

                        <div>
                            <h3 className="mb-3 text-sm font-semibold text-ink">Judges on this track</h3>
                            {judges.length ? (
                                <ul className="divide-y divide-line border-y border-line">
                                    {judges.map((judge) => (
                                        <li key={judge.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2.5">
                                            <span className="text-sm text-ink">
                                                {judge.name}
                                                <span className="text-ink-soft"> · {judge.email}</span>
                                            </span>
                                            <span className="text-xs text-ink-soft">
                                                {judge.lastScoredAt
                                                    ? `scored ${formatDateMedium(judge.lastScoredAt)}`
                                                    : "not scored yet"}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-ink-soft">
                                    No judges assigned to this track yet. Invite them from the Hackathon tab.
                                </p>
                            )}

                            {judgingReady(track) && inRound > 0 ? (
                                <div className="mt-6 border-t border-line pt-4">
                                    <AdvanceRoundForm
                                        trackId={track.id}
                                        round={track.currentRound}
                                        teamsInRound={inRound}
                                        action={advanceRound.bind(null, eventId)}
                                    />
                                </div>
                            ) : null}
                        </div>
                    </div>
                </CardBody>
            </Card>

            <Card
                title="Leaderboard"
                action={<LiveRefresh />}
            >
                <CardBody>
                    <p className="pb-3 text-xs text-ink-soft">
                        Round {track.currentRound}, ranked by the average of the judges&apos; totals out of{" "}
                        {rubricMax(track.rubric) || "—"}. Averaged rather than summed, so a team scored by two
                        judges is comparable with one scored by three.
                    </p>
                    <Leaderboard
                        ranked={ranked}
                        rubric={track.rubric}
                        round={track.currentRound}
                        showJudges
                        emptyHint={
                            judgingReady(track)
                                ? "No team in this round has been scored yet."
                                : "Publish a rubric above, then invite judges, and scores appear here."
                        }
                    />
                </CardBody>
            </Card>

            <TeamCreator
                contextType="hackathon_track"
                parentRef={track.id}
                eventId={event.id}
                trackId={track.id}
            />

            <Card title="Teams">
                <CardBody>
                    {teams.length === 0 ? (
                        <EmptyState
                            size="sm"
                            icon={<Users className="h-5 w-5" />}
                            title="No teams yet"
                            description="Participants form teams from their ticket link. Share the event's registration link and they will appear here."
                        />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-4xl">
                                <thead>
                                    <tr>
                                        <th className={tableHead}>Team</th>
                                        <th className={tableHead}>Members</th>
                                        <th className={tableHead}>Join code</th>
                                        <th className={tableHead}>Submission</th>
                                        {track.fee > 0 ? <th className={tableHead}>Fee</th> : null}
                                        <th className={tableHead}>Roster</th>
                                        <th className={`${tableHead} pr-0 text-right`}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {teams.map((team) => {
                                        const progress = rosterProgress(team);
                                        const deckUrl = deckUrls.get(team.id);
                                        const short = meetsMinimum(track, team);
                                        return (
                                            <tr key={team.id} className={tableRow}>
                                                <td className={tableCell}>
                                                    <p className="font-medium text-ink">{team.name}</p>
                                                    <p className="text-xs text-ink-soft">
                                                        {progress.label}
                                                        {short ? "" : ` · below the minimum of ${track.minTeamSize}`}
                                                    </p>
                                                    {teamSkills(team).length ? (
                                                        <p className="mt-1 text-2xs uppercase text-ink-faint">
                                                            {teamSkills(team).join(" · ")}
                                                        </p>
                                                    ) : null}
                                                </td>
                                                <td className={tableCell}>
                                                    <ul className="space-y-1">
                                                        {team.members.map((m) => (
                                                            <li key={m.registrationId} className="flex items-center gap-2">
                                                                <span className="text-sm text-ink">
                                                                    {m.name}
                                                                    {m.isOwner ? (
                                                                        <span className="text-ink-soft"> · owner</span>
                                                                    ) : null}
                                                                </span>
                                                                <form action={removeMember.bind(null, eventId)}>
                                                                    <input type="hidden" name="teamId" value={team.id} />
                                                                    <input
                                                                        type="hidden"
                                                                        name="registrationId"
                                                                        value={m.registrationId}
                                                                    />
                                                                    <ConfirmSubmit
                                                                        tone="danger"
                                                                        title={`Remove ${m.name} from ${team.name}?`}
                                                                        description={
                                                                            team.members.length === 1
                                                                                ? "They are the last member, so the team is removed with them."
                                                                                : "They can rejoin with the team's join code if the roster is open."
                                                                        }
                                                                        confirmLabel="Remove"
                                                                        className="text-2xs uppercase text-ink-faint hover:text-ink"
                                                                    >
                                                                        Remove
                                                                    </ConfirmSubmit>
                                                                </form>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </td>
                                                <td className={`${tableCell} font-mono text-sm`}>{team.joinCode}</td>
                                                <td className={tableCell}>
                                                    <StatusBadge status={submissionStatus(team)} size="sm" />
                                                    {team.submission.submittedAt ? (
                                                        <p className="mt-1 text-xs text-ink-soft tabular-nums">
                                                            {formatDateMedium(team.submission.submittedAt)}
                                                        </p>
                                                    ) : null}
                                                    <div className="mt-1 flex flex-col gap-0.5 text-xs">
                                                        {team.submission.repoUrl ? (
                                                            <a
                                                                href={team.submission.repoUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-ink hover:underline"
                                                            >
                                                                Repository
                                                            </a>
                                                        ) : null}
                                                        {team.submission.demoVideoUrl ? (
                                                            <a
                                                                href={team.submission.demoVideoUrl}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-ink hover:underline"
                                                            >
                                                                Demo video
                                                            </a>
                                                        ) : null}
                                                        {deckUrl ? (
                                                            <a href={deckUrl} className="text-ink hover:underline">
                                                                Pitch deck
                                                            </a>
                                                        ) : null}
                                                    </div>
                                                </td>
                                                {track.fee > 0 ? (
                                                    <td className={tableCell}>
                                                        <StatusBadge status={team.feeStatus} size="sm" />
                                                        <form
                                                            action={setFeeStatus.bind(null, eventId)}
                                                            className="mt-1.5"
                                                        >
                                                            <input type="hidden" name="teamId" value={team.id} />
                                                            <input
                                                                type="hidden"
                                                                name="feeStatus"
                                                                value={team.feeStatus === "fee_paid" ? "fee_pending" : "fee_paid"}
                                                            />
                                                            <SubmitButton
                                                                pendingText="Saving…"
                                                                className="text-2xs uppercase text-ink-faint hover:text-ink"
                                                            >
                                                                {team.feeStatus === "fee_paid" ? "Mark unpaid" : "Mark paid"}
                                                            </SubmitButton>
                                                        </form>
                                                    </td>
                                                ) : null}
                                                <td className={tableCell}>
                                                    <StatusBadge
                                                        status={rosterLocked(track, team) ? "locked" : "roster_open"}
                                                        size="sm"
                                                    />
                                                    {locked ? (
                                                        <form
                                                            action={setTeamUnlocked.bind(null, eventId)}
                                                            className="mt-1.5"
                                                        >
                                                            <input type="hidden" name="teamId" value={team.id} />
                                                            <input
                                                                type="hidden"
                                                                name="unlocked"
                                                                value={team.unlockedByOrganizer ? "false" : "true"}
                                                            />
                                                            <SubmitButton
                                                                pendingText="Saving…"
                                                                className="text-2xs uppercase text-ink-faint hover:text-ink"
                                                            >
                                                                {team.unlockedByOrganizer ? "Re-lock" : "Unlock"}
                                                            </SubmitButton>
                                                        </form>
                                                    ) : null}
                                                </td>
                                                <td className={`${tableCell} pr-0 text-right`}>
                                                    <form action={removeTeam.bind(null, eventId)}>
                                                        <input type="hidden" name="teamId" value={team.id} />
                                                        <ConfirmSubmit
                                                            tone="danger"
                                                            title={`Remove ${team.name}?`}
                                                            description="The team, its roster and its submission are deleted. This cannot be undone."
                                                            confirmLabel="Remove team"
                                                            className={buttonClass("destructive", "sm")}
                                                        >
                                                            Remove
                                                        </ConfirmSubmit>
                                                    </form>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardBody>
            </Card>
        </div>
    );
}

function Fact({ label, value, wide }: { label: string; value: React.ReactNode; wide?: boolean }) {
    return (
        <div className={wide ? "sm:col-span-2" : undefined}>
            <dt className="text-2xs font-medium uppercase text-ink-soft">{label}</dt>
            <dd className="mt-1 text-sm text-ink">{value}</dd>
        </div>
    );
}
