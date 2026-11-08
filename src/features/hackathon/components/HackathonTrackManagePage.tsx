import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ChevronLeft, Download, Users } from "lucide-react";
import { Card, CardBody } from "@/src/shared_components/ui/Card";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { MetricTile } from "@/src/shared_components/ui/MetricTile";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { ConfirmSubmit } from "@/src/shared_components/ui/ConfirmDialog";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import { buttonClass, fieldClass, labelClass, tableCell, tableHead, tableRow } from "@/src/lib/ui";
import { formatDate, formatDateMedium } from "@/src/lib/datetime";
import { formatCurrency } from "@/src/lib/money";
import { CERTIFICATES_BUCKET, getSignedUrl } from "@/data/supabase";
import { assertEventActor } from "@/src/features/events/ownership";
import { getEventOrganizations } from "@/src/features/organizations/organizations.service";
import {
  getHackathonSettings,
  getTrack,
  listJudges,
  listPrizesForTrack,
  listTeams,
} from "@/src/features/hackathon/hackathon.service";
import {
  meetsMinimum,
  rosterLocked,
  rosterProgress,
  submissionStatus,
  teamSkills,
  trackSponsor,
} from "@/src/features/hackathon/types";
import {
  removeMember,
  removeTeam,
  setFeeStatus,
  setTeamUnlocked,
} from "@/src/features/hackathon/actions/roster.action";
import {
  listTasksForTrack,
  listPhasesForTrack,
  taskHints,
  taskOrganizerAttachment,
  taskOrganizerBrief,
} from "@/src/features/hackathon/tasks.service";
import {
  deleteHackathonTask,
  saveHackathonTask,
} from "@/src/features/hackathon/actions/tasks.action";
import { CtfAttachmentFields } from "@/src/features/hackathon/components/CtfAttachmentFields";
import { TeamCreator } from "@/src/features/teams/components/TeamCreator";
import { Input } from "@/components/ui/Input";
import {
  HACKATHON_KIND_LABELS,
  hackathonDashPath,
  isCtfKind,
} from "@/src/features/hackathon/kinds";
import { judgeLink } from "@/src/features/hackathon/actions/judging.action";
import { HackathonJudgeInvitePanel } from "@/src/features/hackathon/components/HackathonJudgeInvitePanel";
import { requireConnectedSender } from "@/src/features/email/organizerTransport.service";

/**
 * One track: its teams, their rosters, and submissions.
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

  const event = await assertEventActor(eventId, "competitions", trackId);
  if (!event) notFound();

  const track = await getTrack(trackId);
  if (!track || track.eventId !== event.id) notFound();

  const [teams, orgs, tasks, phases, prizes, settings, allJudges, sender] = await Promise.all([
    listTeams(track.id),
    getEventOrganizations(event.id),
    listTasksForTrack(track.id),
    listPhasesForTrack(track.id),
    listPrizesForTrack(track.id),
    getHackathonSettings(event.id),
    listJudges(event.id),
    requireConnectedSender(event.organizerId, { eventId }),
  ]);
  const judgesOnTrack = allJudges.filter((j) => j.trackIds.includes(track.id));
  const judgeInviteRows = await Promise.all(
    judgesOnTrack.map(async (j) => ({
      id: j.id,
      name: j.name,
      email: j.email,
      inviteStatus: j.inviteStatus,
      link: (await judgeLink(j)) || "",
    })),
  );
  const sponsor = trackSponsor(orgs, track.id);
  const ctf = isCtfKind(track.kind);
  const base = `${hackathonDashPath(organizer_id, eventId)}/competitions`;
  const configurePath = `${base}/${trackId}`;

  const rulesUrl = track.rulesPath
    ? await getSignedUrl(
        CERTIFICATES_BUCKET,
        track.rulesPath,
        3600,
        track.rulesName || "rules.pdf",
      ).catch(() => "")
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

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={base}
          className="inline-flex items-center gap-1 text-xs text-ink-soft hover:text-ink"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          All tracks
        </Link>
        <h2 className="mt-2 font-display text-xl text-ink">
          {track.name}{" "}
          <span className="text-base font-normal text-ink-soft">
            {HACKATHON_KIND_LABELS[track.kind]}
          </span>
        </h2>
        {track.description ? (
          <p className="mt-1 max-w-3xl text-sm text-ink-soft">{track.description}</p>
        ) : null}
        {track.instructions || track.rulesText ? (
          <p className="mt-2 max-w-3xl whitespace-pre-wrap text-sm text-ink">
            {track.instructions || track.rulesText}
          </p>
        ) : null}
      </div>

      {e ? <FormFeedback error={e} /> : null}

      <Card title="Judge invites">
        <CardBody>
          <HackathonJudgeInvitePanel
            eventId={eventId}
            trackId={track.id}
            trackName={track.name}
            judges={judgeInviteRows}
            returnTo={configurePath}
            senderConnected={!!sender.ok}
            senderError={sender.ok ? null : sender.error}
          />
        </CardBody>
      </Card>

      <Card title="Tasks">
        <CardBody>
          <div className="space-y-6">
            <form action={saveHackathonTask} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <input type="hidden" name="trackId" value={track.id} />
              <input type="hidden" name="eventId" value={eventId} />
              <input type="hidden" name="organizerId" value={organizer_id} />
              <Input id="task-title" name="title" label="Title" required />
              <Input
                id="task-category"
                name="category"
                label="Category"
                helperText="Used by the category filter."
              />
              <Input id="task-points" name="points" type="number" min={0} label="Points" />
              <Input
                id="task-desc"
                name="description"
                label={ctf ? "Description" : "Brief"}
                wrapperClassName="sm:col-span-2 lg:col-span-3"
              />
              {ctf ? (
                <Input
                  id="task-flag"
                  name="flag"
                  label="Flag (hashed on save)"
                  helperText="Needs CTF flags on."
                />
              ) : null}
              {ctf ? (
                <CtfAttachmentFields
                  prefix="track-task"
                  maxAttachmentMb={settings.maxAttachmentMb}
                />
              ) : (
                <>
                  <div className="sm:col-span-2 lg:col-span-3">
                    <label htmlFor="task-organizer-brief" className={labelClass}>
                      Participant brief{" "}
                      <span className="normal-case text-ink-faint">(compete)</span>
                    </label>
                    <textarea
                      id="task-organizer-brief"
                      name="organizerBrief"
                      rows={3}
                      maxLength={2000}
                      className={fieldClass}
                      placeholder="Optional instructions + what to submit"
                    />
                  </div>
                  <div className="sm:col-span-2 lg:col-span-3 flex flex-col gap-1.5">
                    <label htmlFor="task-organizer-file" className={labelClass}>
                      Reference file <span className="normal-case text-ink-faint">(Drive)</span>
                    </label>
                    <input
                      id="task-organizer-file"
                      name="organizerBriefFile"
                      type="file"
                      className="w-full rounded-lg border border-line-loud bg-paper px-3 py-2 text-sm text-ink file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-ink"
                    />
                    <p className="text-xs text-ink-soft">
                      Uses your connected Google Drive under this event.
                    </p>
                  </div>
                </>
              )}
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
                  <li
                    key={t.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm"
                  >
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
                        {t.phase_id
                          ? ` · ${phases.find((p) => p.id === t.phase_id)?.name ?? "phase"}`
                          : ""}
                      </span>
                      {!ctf && taskOrganizerBrief(t) ? (
                        <span className="mt-1 block text-xs text-ink-soft">
                          Brief: {taskOrganizerBrief(t).slice(0, 120)}
                          {taskOrganizerBrief(t).length > 120 ? "…" : ""}
                        </span>
                      ) : null}
                      {!ctf && taskOrganizerAttachment(t)?.webUrl ? (
                        <Link
                          href={taskOrganizerAttachment(t)!.webUrl!}
                          className="mt-0.5 block text-xs font-medium text-ink underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {taskOrganizerAttachment(t)?.fileName || "Organizer file"}
                        </Link>
                      ) : null}
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
              <p className="text-sm text-ink-soft">
                No tasks yet. Participants open them from their ticket&apos;s team page.
              </p>
            )}
          </div>
        </CardBody>
      </Card>

      <section className="grid grid-cols-2 gap-y-8 border-y border-line py-8 sm:grid-cols-4 sm:divide-x sm:divide-line">
        <MetricTile
          label="Teams"
          value={`${teams.length}`}
          icon={<Users className="h-4 w-4" />}
          sublabel={`${teams.reduce((n, t) => n + t.members.length, 0)} participants`}
        />
        <MetricTile
          label="Submitted"
          value={`${submitted}`}
          sublabel="Task / project submissions"
        />
        <MetricTile
          label="Entry fee"
          value={track.fee > 0 ? formatCurrency(track.fee, track.currency) : "Free"}
          sublabel={track.fee > 0 ? "Per team, confirmed by you" : "No fee to confirm"}
        />
        <MetricTile
          label="Roster"
          value={locked ? "Locked" : "Open"}
          sublabel={
            track.registrationClosesAt
              ? `Locks when registration closes (${formatDate(track.registrationClosesAt)})`
              : "Locks when registration closes (not set)"
          }
        />
      </section>

      <Card title="Track details">
        <CardBody>
          <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            <Fact label="Team size" value={`${track.minTeamSize} to ${track.maxTeamSize}`} />
            <Fact
              label="Registration closes"
              value={
                track.registrationClosesAt ? formatDate(track.registrationClosesAt) : "Not set"
              }
            />
            <Fact label="Dedicated sponsor" value={sponsor?.name ?? "None"} />
            <Fact
              label="Rules & instructions file"
              value={
                rulesUrl ? (
                  <a
                    href={rulesUrl}
                    className="inline-flex items-center gap-1.5 font-medium text-ink hover:underline"
                  >
                    <Download size={13} aria-hidden="true" />
                    {track.instructionsFileName || track.rulesName || "Download"}
                  </a>
                ) : (
                  "None uploaded"
                )
              }
            />
            {prizes.length ? (
              <div className="sm:col-span-2">
                <dt className="text-2xs uppercase text-ink-soft">Prizes</dt>
                <dd className="mt-1 space-y-1 text-sm text-ink">
                  {prizes.map((p) => (
                    <p key={p.id}>
                      <span className="font-medium">{p.positionLabel}</span>
                      {p.amount ? ` · ${p.amount}` : ""}
                      {p.description ? ` — ${p.description}` : ""}
                    </p>
                  ))}
                </dd>
              </div>
            ) : null}
            {track.prizePool ? (
              <Fact label="Additional prize notes" value={track.prizePool} wide />
            ) : null}
          </dl>
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
                            <form action={setFeeStatus.bind(null, eventId)} className="mt-1.5">
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
                            <form action={setTeamUnlocked.bind(null, eventId)} className="mt-1.5">
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

function Fact({ label, value, wide }: { label: string; value: ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-2xs font-medium uppercase text-ink-soft">{label}</dt>
      <dd className="mt-1 text-sm text-ink">{value}</dd>
    </div>
  );
}
