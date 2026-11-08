import Link from "next/link";
import { notFound } from "next/navigation";
import { Flag, Users } from "lucide-react";
import { Card, CardBody } from "@/src/shared_components/ui/Card";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { MetricTile } from "@/src/shared_components/ui/MetricTile";
import { ConfirmSubmit } from "@/src/shared_components/ui/ConfirmDialog";
import { buttonClass, tableCell, tableHead, tableRow } from "@/src/lib/ui";
import { formatDate } from "@/src/lib/datetime";
import { formatCurrency } from "@/src/lib/money";
import { assertEventActor } from "@/src/features/events/ownership";
import { getEventOrganizations } from "@/src/features/organizations/organizations.service";
import {
  getHackathonSettings,
  listPrizesForTracks,
  listTeamsOfEvent,
  listTracks,
} from "@/src/features/hackathon/hackathon.service";
import { rosterLocked, trackSponsor } from "@/src/features/hackathon/types";
import { HackathonSettingsForm } from "@/src/features/hackathon/components/LiveForms";
import { saveHackathonSettings } from "@/src/features/hackathon/actions/live.action";
import { RegService } from "@/src/services/registeration.service";
import { occupyingHackathonRegs } from "@/src/features/registration/registration.service";
import { CompetitionModal } from "@/src/features/hackathon/components/CompetitionModal";
import { endTrack, removeTrack, saveTrack } from "@/src/features/hackathon/actions/tracks.action";
import { HACKATHON_KIND_LABELS, hackathonDashPath } from "@/src/features/hackathon/kinds";
import { HackathonEventConfigPanel } from "@/src/features/hackathon/components/ConfigToggleRow";
import {
  getEffectiveConfig,
  getHackathonConfigsForTracks,
  listPhasesForEvent,
  listTasksForEvent,
  trackTaskScoreboardDetail,
} from "@/src/features/hackathon/tasks.service";
import { listTaskSubmissionsForEvent } from "@/src/features/hackathon/taskSubmissions.service";
import { HackathonPhasesTasksPanel } from "@/src/features/hackathon/components/HackathonPhasesTasksPanel";
import { LiveRefresh } from "@/src/features/hackathon/components/LiveRefresh";
import { LiveScoreboardTable } from "@/src/features/hackathon/components/LiveScoreboardTable";
import { TaskSubmissionsPanel } from "@/src/features/hackathon/components/TaskSubmissionsPanel";
import { filterTracksForViewer, staffMayOpenTab } from "@/src/features/hackathon/staffEventAccess";

export type HackathonWorkspaceView =
  "competitions" | "tasks" | "scoreboard" | "settings" | "submissions";

export default async function HackathonWorkspace({
  params,
  searchParams,
  view,
}: {
  params: Promise<{ organizer_id: string; eventId: string }>;
  searchParams: Promise<{
    edit?: string;
    e?: string;
    ok?: string;
    tab?: string;
    track?: string;
    task?: string;
  }>;
  view: HackathonWorkspaceView;
}) {
  const { organizer_id, eventId } = await params;
  const { edit, e, ok, track: scoreTrack, task: deepTask } = await searchParams;

  const tab = view === "tasks" ? "tasks" : view;
  const event = await assertEventActor(eventId, tab);
  if (!event) notFound();
  if (!(await staffMayOpenTab(eventId, tab))) notFound();

  const [allTracks, teams, orgs, settings, regs] = await Promise.all([
    listTracks(eventId),
    listTeamsOfEvent(eventId),
    getEventOrganizations(eventId),
    getHackathonSettings(eventId),
    RegService.getRegsOfEvent(eventId),
  ]);
  const tracks = await filterTracksForViewer(eventId, event.organizerId, allTracks);

  const dash = hackathonDashPath(organizer_id, eventId);
  const base = `${dash}/competitions`;
  const eventTimeZone = event.schedule?.timezone || "UTC";
  const prizesByTrack = await listPrizesForTracks(tracks.map((t) => t.id));
  const requestedTrack = tracks.some((t) => t.id === scoreTrack) ? scoreTrack : "";
  const scoreTrackId = requestedTrack || tracks[0]?.id || "";
  const scoreboardCfg = scoreTrackId ? await getEffectiveConfig(scoreTrackId) : null;
  const liveScoreboardOn = scoreboardCfg?.on("live_scoreboard") ?? false;
  const [taskPhases, eventTasks, taskScoreboard, taskSubmissionRows] = await Promise.all([
    listPhasesForEvent(
      eventId,
      tracks.map((t) => t.id),
    ).catch(() => []),
    listTasksForEvent(
      eventId,
      tracks.map((t) => t.id),
    ).catch(() => []),
    view === "scoreboard" && scoreTrackId && liveScoreboardOn
      ? trackTaskScoreboardDetail(scoreTrackId)
      : Promise.resolve([]),
    view === "submissions"
      ? listTaskSubmissionsForEvent(eventId, { limit: 100 })
          .catch(() => [])
          .then((rows) => {
            const allowed = new Set(tracks.map((t) => t.id));
            return rows.filter((r) => allowed.has(r.trackId));
          })
      : Promise.resolve([]),
  ]);
  const sponsors = orgs
    .filter((o) => o.type === "sponsor")
    .map((o) => ({ id: o.id, name: o.name, tier: o.tier }));

  const visibleTeamList = teams.filter((t) => tracks.some((tr) => tr.id === t.trackId));
  const teamsByTrack = new Map<string, number>();
  const membersByTrack = new Map<string, number>();
  for (const team of visibleTeamList) {
    teamsByTrack.set(team.trackId, (teamsByTrack.get(team.trackId) ?? 0) + 1);
    membersByTrack.set(team.trackId, (membersByTrack.get(team.trackId) ?? 0) + team.members.length);
  }
  const liveLead = (team: (typeof teams)[number]) => {
    const owner = team.members.find((m) => m.isOwner);
    const ownerReg = owner
      ? regs.find((r) => r.registrationId === owner.registrationId)
      : undefined;
    return ownerReg?.status !== "cancelled" && ownerReg?.status !== "rejected";
  };
  const liveTeams = visibleTeamList.filter(liveLead);
  const livePeople = liveTeams.reduce(
    (n, t) =>
      n +
      t.members.filter((m) => {
        const r = regs.find((x) => x.registrationId === m.registrationId);
        return r && r.status !== "cancelled" && r.status !== "rejected";
      }).length,
    0,
  );
  const submitted = liveTeams.filter((t) => t.submission.submittedAt).length;
  const occupying = occupyingHackathonRegs(
    regs.filter((r) => r.status !== "cancelled" && r.status !== "rejected"),
    liveTeams,
  ).length;
  const trackCount = tracks.length;
  const submittedByTrack: Record<string, number> = {};
  for (const t of visibleTeamList) {
    if (t.submission.submittedAt)
      submittedByTrack[t.trackId] = (submittedByTrack[t.trackId] ?? 0) + 1;
  }

  const configsByTrack =
    view === "settings" ? await getHackathonConfigsForTracks(tracks.map((t) => t.id)) : new Map();
  const settingRows =
    view === "settings"
      ? tracks.map((track) => ({
          track,
          rows: configsByTrack.get(track.id) ?? [],
        }))
      : [];

  return (
    <div className="space-y-10">
      {e ? <FormFeedback error={e} /> : null}
      {ok ? <FormFeedback success={ok} /> : null}

      <section className="grid grid-cols-2 gap-y-8 border-b border-line pb-8 sm:grid-cols-4 sm:divide-x sm:divide-line">
        <MetricTile label="Tracks" value={`${trackCount}`} icon={<Flag className="h-4 w-4" />} />
        <MetricTile
          label="Team registrations"
          value={`${occupying}`}
          icon={<Users className="h-4 w-4" />}
          sublabel={`${liveTeams.length} teams · ${livePeople} people`}
        />
        <MetricTile
          label="Submitted"
          value={`${submitted}`}
          sublabel={
            liveTeams.length ? `of ${liveTeams.length} teams (project, not fee)` : "No teams yet"
          }
        />
      </section>

      {view === "submissions" ? (
        <Card title="Task submissions">
          <CardBody>
            <TaskSubmissionsPanel
              eventId={eventId}
              timeZone={eventTimeZone}
              tracks={tracks.map((t) => ({ id: t.id, name: t.name }))}
              phases={taskPhases.map((p) => ({
                id: p.id,
                name: p.name,
                trackId: String(p.track_id || ""),
              }))}
              tasks={eventTasks.map((t) => ({
                id: t.id,
                title: t.title,
                trackId: t.track_id,
                phaseId: t.phase_id,
              }))}
              rows={taskSubmissionRows}
              dashHref={dash}
            />
            {visibleTeamList.filter((t) => t.submission.submittedAt).length ? (
              <div className="mt-8 border-t border-line pt-6">
                <p className="mb-3 text-2xs font-semibold uppercase tracking-wider text-ink-soft">
                  Final project submissions
                </p>
                <ul className="divide-y divide-line">
                  {visibleTeamList
                    .filter((t) => t.submission.submittedAt)
                    .map((team) => (
                      <li key={team.id} className="py-3">
                        <p className="text-sm font-medium text-ink">{team.name}</p>
                        <p className="text-xs text-ink-soft">
                          {tracks.find((t) => t.id === team.trackId)?.name}
                        </p>
                      </li>
                    ))}
                </ul>
              </div>
            ) : null}
          </CardBody>
        </Card>
      ) : null}

      {view === "settings" ? (
        <div className="space-y-10">
          <Card title="Event settings">
            <CardBody>
              <HackathonSettingsForm
                settings={settings}
                action={saveHackathonSettings.bind(null, eventId)}
              />
            </CardBody>
          </Card>
          <Card title="Competition settings">
            <CardBody>
              <p className="mb-4 text-sm text-ink-soft">
                Each toggle can apply to every competition or to the ones you tick. CTF-only keys
                skip non-CTF tracks.
              </p>
              <HackathonEventConfigPanel
                eventId={eventId}
                organizerId={organizer_id}
                tracks={tracks}
                rowsByTrack={
                  new Map(
                    settingRows.map(({ track, rows }) => [
                      track.id,
                      rows as { config_key: string; enabled: boolean; config_value: unknown }[],
                    ]),
                  )
                }
                taskCountByTrack={
                  new Map(
                    tracks.map((t) => [
                      t.id,
                      eventTasks.filter((task) => task.track_id === t.id).length,
                    ]),
                  )
                }
              />
            </CardBody>
          </Card>
        </div>
      ) : null}

      {view === "scoreboard" ? (
        <Card title="Live scoreboard" action={liveScoreboardOn ? <LiveRefresh /> : undefined}>
          <CardBody>
            {tracks.length > 1 ? (
              <div className="mb-4 flex flex-wrap gap-2">
                {tracks.map((t) => (
                  <Link
                    key={t.id}
                    href={`${dash}/scoreboard?track=${t.id}`}
                    className={buttonClass(t.id === scoreTrackId ? "primary" : "secondary", "sm")}
                  >
                    {t.name}
                  </Link>
                ))}
              </div>
            ) : null}
            {!liveScoreboardOn ? (
              <p className="text-sm text-ink-soft">
                Live scoreboard is turned off for this competition. Enable it under Settings → Live
                scoreboard.
              </p>
            ) : (
              <>
                <p className="mb-3 text-xs text-ink-soft">
                  Task points from completions. ▲▼ shows rank change vs one hour ago. Updates every
                  15 seconds while this tab is open.
                </p>
                <LiveScoreboardTable
                  rows={taskScoreboard}
                  tasksHref={`${dash}/tasks`}
                  trackId={scoreTrackId}
                  timeZone={eventTimeZone}
                />
              </>
            )}
          </CardBody>
        </Card>
      ) : null}

      {view === "tasks" ? (
        <HackathonPhasesTasksPanel
          eventId={eventId}
          organizerId={organizer_id}
          tracks={tracks}
          phases={taskPhases}
          tasks={eventTasks.map(({ flag_hash, ...rest }) => rest)}
          maxAttachmentMb={settings.maxAttachmentMb}
          initialTrackFilter={requestedTrack || "all"}
          initialTaskId={deepTask || ""}
          submittedByTrack={submittedByTrack}
          error={undefined}
          ok={undefined}
        />
      ) : null}

      {view === "competitions" ? (
        <Card
          title="Competitions"
          action={
            <CompetitionModal
              action={saveTrack.bind(null, eventId)}
              track={null}
              sponsors={sponsors}
              currentSponsorId=""
              cancelHref={base}
              timeZone={eventTimeZone}
            />
          }
        >
          <CardBody>
            {tracks.length === 0 ? (
              <EmptyState
                size="sm"
                icon={<Flag className="h-5 w-5" />}
                title={allTracks.length ? "No competitions assigned" : "No tracks yet"}
                description={
                  allTracks.length
                    ? "Your staff role is limited to specific competitions, and none of those are available here."
                    : "Add a competition and participants will be able to form teams under it."
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-2xl">
                  <thead>
                    <tr>
                      <th className={tableHead}>Track</th>
                      <th className={tableHead}>Teams</th>
                      <th className={tableHead}>Fee</th>
                      <th className={tableHead}>Reg. closes</th>
                      <th className={tableHead}>Roster</th>
                      <th className={`${tableHead} pr-0 text-right`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tracks.map((track) => {
                      const sponsor = trackSponsor(orgs, track.id);
                      const count = teamsByTrack.get(track.id) ?? 0;
                      return (
                        <tr key={track.id} className={tableRow}>
                          <td className={tableCell}>
                            <div className="flex items-center gap-3">
                              {track.imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={track.imageUrl}
                                  alt=""
                                  className="h-12 w-12 shrink-0 rounded-lg object-cover"
                                />
                              ) : (
                                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted text-ink-soft">
                                  <Flag className="h-4 w-4" />
                                </span>
                              )}
                              <div>
                                <Link
                                  href={`${base}/${track.id}`}
                                  className="font-medium text-ink hover:underline"
                                >
                                  {track.name}
                                </Link>
                                {track.status === "ended" ? (
                                  <p className="text-xs font-medium text-ink-soft">Ended</p>
                                ) : null}
                                <p className="text-xs text-ink-soft">
                                  {HACKATHON_KIND_LABELS[track.kind]} · Teams of {track.minTeamSize}
                                  –{track.maxTeamSize}
                                  {sponsor ? ` · ${sponsor.name}` : ""}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className={`${tableCell} tabular-nums`}>
                            {count}
                            <span className="text-ink-soft">
                              {" "}
                              ({membersByTrack.get(track.id) ?? 0})
                            </span>
                          </td>
                          <td className={`${tableCell} tabular-nums`}>
                            {track.fee > 0 ? formatCurrency(track.fee, track.currency) : "Free"}
                          </td>
                          <td className={`${tableCell} tabular-nums`}>
                            {track.registrationClosesAt
                              ? formatDate(track.registrationClosesAt)
                              : "—"}
                          </td>
                          <td className={tableCell}>
                            {rosterLocked(track, { unlockedByOrganizer: false }) ? (
                              <StatusBadge status="locked" size="sm" />
                            ) : (
                              <StatusBadge status="roster_open" size="sm" />
                            )}
                          </td>
                          <td className={`${tableCell} pr-0 text-right`}>
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                href={`${base}/${track.id}`}
                                className="text-sm font-medium text-ink hover:underline"
                              >
                                Configure
                              </Link>
                              {track.kind === "ctf" ? (
                                <Link
                                  href={`${dash}/tasks?track=${track.id}`}
                                  className="text-sm font-medium text-ink hover:underline"
                                >
                                  Manage flags & challenge files →
                                </Link>
                              ) : null}
                              <CompetitionModal
                                action={saveTrack.bind(null, eventId)}
                                track={track}
                                prizes={(prizesByTrack.get(track.id) ?? []).map((p) => ({
                                  positionLabel: p.positionLabel,
                                  amount: p.amount,
                                  description: p.description,
                                }))}
                                sponsors={sponsors}
                                currentSponsorId={sponsor?.id ?? ""}
                                cancelHref={base}
                                defaultOpen={edit === track.id}
                                timeZone={eventTimeZone}
                              />
                              {track.status !== "ended" ? (
                                <form action={endTrack.bind(null, eventId)}>
                                  <input type="hidden" name="trackId" value={track.id} />
                                  <ConfirmSubmit
                                    tone="danger"
                                    title={`End ${track.name}?`}
                                    description="The competition closes. Existing teams stay, but it is marked ended."
                                    confirmLabel="End competition"
                                    className="text-sm font-medium text-ink hover:underline"
                                  >
                                    End
                                  </ConfirmSubmit>
                                </form>
                              ) : null}
                              <form action={removeTrack.bind(null, eventId)}>
                                <input type="hidden" name="trackId" value={track.id} />
                                <ConfirmSubmit
                                  tone="danger"
                                  title={`Remove ${track.name}?`}
                                  description={
                                    count
                                      ? `This track still has ${count} team${count === 1 ? "" : "s"}, so it cannot be removed yet.`
                                      : "The track and its settings are deleted. This cannot be undone."
                                  }
                                  confirmLabel="Remove track"
                                  className={buttonClass("destructive", "sm")}
                                >
                                  Remove
                                </ConfirmSubmit>
                              </form>
                            </div>
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
      ) : null}
    </div>
  );
}
