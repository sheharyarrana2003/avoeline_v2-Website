import Link from "next/link";
import { notFound } from "next/navigation";
import { Flag, Gavel, Megaphone, Radio, Users } from "lucide-react";
import { Card, CardBody } from "@/src/shared_components/ui/Card";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { MetricTile } from "@/src/shared_components/ui/MetricTile";
import { ConfirmSubmit } from "@/src/shared_components/ui/ConfirmDialog";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import { buttonClass, tableCell, tableHead, tableRow } from "@/src/lib/ui";
import { formatDate } from "@/src/lib/datetime";
import { formatCurrency } from "@/src/lib/money";
import { assertOwnedEvent } from "@/src/features/events/ownership";
import { getEventOrganizations } from "@/src/features/organizations/organizations.service";
import {
    getHackathonSettings,
    isHackathon,
    listAnnouncements,
    listJudges,
    listMentors,
    listTeamsOfEvent,
    listTracks,
} from "@/src/features/hackathon/hackathon.service";
import { trackSponsor } from "@/src/features/hackathon/types";
import { openSlots } from "@/src/features/hackathon/live";
import { JudgeInviteForm } from "@/src/features/hackathon/components/JudgingForms";
import { AnnouncementForm, HackathonSettingsForm } from "@/src/features/hackathon/components/LiveForms";
import { inviteJudge, judgeLink, removeJudge } from "@/src/features/hackathon/actions/judging.action";
import {
    postAnnouncement,
    removeAnnouncement,
    removeMentor,
    saveHackathonSettings,
} from "@/src/features/hackathon/actions/live.action";
import { RegService } from "@/src/services/registeration.service";
import { formatDateMedium } from "@/src/lib/datetime";
import { TrackForm } from "@/src/features/hackathon/components/TrackForm";
import { removeTrack, saveTrack } from "@/src/features/hackathon/actions/tracks.action";

/**
 * Spec 3.1 -- the tracks of one hackathon event.
 *
 * 404s on an event that is not run on the hackathon format, which is the same
 * condition the tab gate in the event layout uses. Both are needed: hiding the
 * tab is presentation, and this route is reachable by typing it.
 */
export default async function EventHackathonPage({
    params,
    searchParams,
}: {
    params: Promise<{ organizer_id: string; eventId: string }>;
    searchParams: Promise<{ edit?: string; e?: string }>;
}) {
    const { organizer_id, eventId } = await params;
    const { edit, e } = await searchParams;

    const event = await assertOwnedEvent(eventId);
    if (!event || !isHackathon(event)) notFound();

    const [tracks, teams, orgs, judges, mentors, announcements, settings, regs] = await Promise.all([
        listTracks(eventId),
        listTeamsOfEvent(eventId),
        getEventOrganizations(eventId),
        listJudges(eventId),
        listMentors(eventId),
        listAnnouncements(eventId),
        getHackathonSettings(eventId),
        RegService.getRegsOfEvent(eventId),
    ]);

    const base = `/organizer/${organizer_id}/events/${eventId}/hackathon`;
    const editing = edit ? tracks.find((t) => t.id === edit) : undefined;
    const sponsors = orgs
        .filter((o) => o.type === "sponsor")
        .map((o) => ({ id: o.id, name: o.name, tier: o.tier }));

    const teamsByTrack = new Map<string, number>();
    const membersByTrack = new Map<string, number>();
    for (const team of teams) {
        teamsByTrack.set(team.trackId, (teamsByTrack.get(team.trackId) ?? 0) + 1);
        membersByTrack.set(team.trackId, (membersByTrack.get(team.trackId) ?? 0) + team.members.length);
    }
    const submitted = teams.filter((t) => t.submission.submittedAt).length;
    const audience = regs.filter((r) => r.status !== "cancelled" && r.status !== "rejected").length;
    const trackOptions = tracks.map((t) => ({ id: t.id, name: t.name }));

    // Signed here so the organizer can copy a judge's link when the email goes
    // astray, the same way the collaborator invite link is shown.
    const judgeLinks = new Map<string, string>();
    await Promise.all(
        judges.map(async (j) => {
            const link = await judgeLink(j);
            if (link) judgeLinks.set(j.id, link);
        }),
    );

    return (
        <div className="space-y-10">
            {/* Carried here by the remove action, which redirects rather than
                returning state -- this page has no client boundary to hold it. */}
            {e ? <FormFeedback error={e} /> : null}

            <section className="grid grid-cols-2 gap-y-8 border-b border-line pb-8 sm:grid-cols-4 sm:divide-x sm:divide-line">
                <MetricTile label="Tracks" value={`${tracks.length}`} icon={<Flag className="h-4 w-4" />} />
                <MetricTile
                    label="Teams"
                    value={`${teams.length}`}
                    icon={<Users className="h-4 w-4" />}
                    sublabel={`${teams.reduce((n, t) => n + t.members.length, 0)} participants`}
                />
                <MetricTile
                    label="Submitted"
                    value={`${submitted}`}
                    sublabel={teams.length ? `of ${teams.length} teams` : "No teams yet"}
                />
            </section>

            <div className="grid gap-10 lg:grid-cols-[1fr_1.15fr]">
                <Card title={editing ? `Edit ${editing.name}` : "Add a track"}>
                    <CardBody>
                        <TrackForm
                            action={saveTrack.bind(null, eventId)}
                            track={editing ?? null}
                            sponsors={sponsors}
                            currentSponsorId={editing ? (trackSponsor(orgs, editing.id)?.id ?? "") : ""}
                            cancelHref={base}
                        />
                    </CardBody>
                </Card>

                <Card title="Tracks">
                    <CardBody>
                        {tracks.length === 0 ? (
                            <EmptyState
                                size="sm"
                                icon={<Flag className="h-5 w-5" />}
                                title="No tracks yet"
                                description="Add a track and participants will be able to form teams under it."
                            />
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-2xl">
                                    <thead>
                                        <tr>
                                            <th className={tableHead}>Track</th>
                                            <th className={tableHead}>Teams</th>
                                            <th className={tableHead}>Fee</th>
                                            <th className={tableHead}>Deadline</th>
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
                                                        <Link
                                                            href={`${base}/${track.id}`}
                                                            className="font-medium text-ink hover:underline"
                                                        >
                                                            {track.name}
                                                        </Link>
                                                        <p className="text-xs text-ink-soft">
                                                            Teams of {track.minTeamSize}–{track.maxTeamSize}
                                                            {sponsor ? ` · ${sponsor.name}` : ""}
                                                        </p>
                                                    </td>
                                                    <td className={`${tableCell} tabular-nums`}>
                                                        {count}
                                                        <span className="text-ink-soft">
                                                            {" "}
                                                            ({membersByTrack.get(track.id) ?? 0})
                                                        </span>
                                                    </td>
                                                    <td className={`${tableCell} tabular-nums`}>
                                                        {track.fee > 0
                                                            ? formatCurrency(track.fee, track.currency)
                                                            : "Free"}
                                                    </td>
                                                    <td className={`${tableCell} tabular-nums`}>
                                                        {track.submissionDeadline
                                                            ? formatDate(track.submissionDeadline)
                                                            : "—"}
                                                    </td>
                                                    <td className={tableCell}>
                                                        {track.rosterLockDate ? (
                                                            <span className="text-xs text-ink-soft">
                                                                locks {formatDate(track.rosterLockDate)}
                                                            </span>
                                                        ) : (
                                                            <StatusBadge status="open" size="sm" />
                                                        )}
                                                    </td>
                                                    <td className={`${tableCell} pr-0 text-right`}>
                                                        <div className="flex items-center justify-end gap-2">
                                                            <Link
                                                                href={`${base}?edit=${track.id}`}
                                                                className="text-sm font-medium text-ink hover:underline"
                                                            >
                                                                Edit
                                                            </Link>
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
            </div>

            <div className="grid gap-10 lg:grid-cols-[1fr_1.15fr]">
                <Card title="Judges">
                    <CardBody>
                        <JudgeInviteForm tracks={trackOptions} action={inviteJudge.bind(null, eventId)} />

                        {judges.length ? (
                            <ul className="mt-6 divide-y divide-line border-t border-line">
                                {judges.map((judge) => (
                                    <li key={judge.id} className="py-3">
                                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                                            <span className="text-sm text-ink">
                                                {judge.name}
                                                <span className="text-ink-soft"> · {judge.email}</span>
                                            </span>
                                            <form action={removeJudge.bind(null, eventId)}>
                                                <input type="hidden" name="judgeId" value={judge.id} />
                                                <ConfirmSubmit
                                                    tone="danger"
                                                    title={`Remove ${judge.name}?`}
                                                    description="Their link stops working. Scores they have already given stay on the teams — withdrawing access is not the same as deleting their judging."
                                                    confirmLabel="Remove judge"
                                                    className="text-2xs uppercase text-ink-faint hover:text-ink"
                                                >
                                                    Remove
                                                </ConfirmSubmit>
                                            </form>
                                        </div>
                                        <p className="mt-0.5 text-xs text-ink-soft">
                                            {tracks
                                                .filter((t) => judge.trackIds.includes(t.id))
                                                .map((t) => t.name)
                                                .join(", ") || "no tracks"}
                                            {judge.lastScoredAt ? ` · scored ${formatDateMedium(judge.lastScoredAt)}` : ""}
                                        </p>
                                        {judgeLinks.get(judge.id) ? (
                                            <p className="mt-1 break-all font-mono text-2xs text-ink-faint">
                                                {judgeLinks.get(judge.id)}
                                            </p>
                                        ) : null}
                                    </li>
                                ))}
                            </ul>
                        ) : null}
                    </CardBody>
                </Card>

                <Card title="Announcements">
                    <CardBody>
                        <AnnouncementForm
                            tracks={trackOptions}
                            audienceCount={audience}
                            action={postAnnouncement.bind(null, eventId)}
                        />

                        {announcements.length ? (
                            <ul className="mt-6 divide-y divide-line border-t border-line">
                                {announcements.slice(0, 8).map((a) => (
                                    <li key={a.id} className="py-3">
                                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                                            <span className="text-sm font-medium text-ink">{a.title}</span>
                                            <form action={removeAnnouncement.bind(null, eventId)}>
                                                <input type="hidden" name="announcementId" value={a.id} />
                                                <SubmitButton
                                                    pendingText="Removing…"
                                                    className="text-2xs uppercase text-ink-faint hover:text-ink"
                                                >
                                                    Remove
                                                </SubmitButton>
                                            </form>
                                        </div>
                                        <p className="mt-0.5 whitespace-pre-line text-xs text-ink-soft">{a.body}</p>
                                        <p className="mt-1 text-2xs uppercase text-ink-faint">
                                            {formatDateMedium(a.createdAt)}
                                            {a.trackId
                                                ? ` · ${tracks.find((t) => t.id === a.trackId)?.name ?? "one track"}`
                                                : " · everyone"}
                                            {a.emailedCount ? ` · emailed ${a.emailedCount}` : " · not emailed"}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        ) : null}
                    </CardBody>
                </Card>
            </div>

            <div className="grid gap-10 lg:grid-cols-[1fr_1.15fr]">
                <Card title="Online mode">
                    <CardBody>
                        <HackathonSettingsForm
                            settings={settings}
                            spectatorHref={tracks.length ? `/events/${eventId}/tracks/${tracks[0].id}/leaderboard` : `/events/${eventId}/tracks`}
                            action={saveHackathonSettings.bind(null, eventId)}
                        />
                    </CardBody>
                </Card>

                <Card title="Mentors">
                    <CardBody>
                        <p className="pb-3 text-xs text-ink-soft">
                            Mentors sign themselves up at{" "}
                            <span className="font-mono text-ink">/events/{eventId}/mentors</span> and teams book
                            their slots. Share that link with the people you have lined up.
                        </p>

                        {mentors.length === 0 ? (
                            <EmptyState
                                size="sm"
                                icon={<Users className="h-5 w-5" />}
                                title="No mentors yet"
                                description="Nobody has offered times. Share the sign-up link above."
                            />
                        ) : (
                            <ul className="divide-y divide-line border-y border-line">
                                {mentors.map((mentor) => {
                                    const free = openSlots(mentor).length;
                                    const booked = mentor.slots.filter((s) => s.bookedByTeamId).length;
                                    return (
                                        <li key={mentor.id} className="py-3">
                                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                                                <span className="text-sm text-ink">
                                                    {mentor.name}
                                                    <span className="text-ink-soft"> · {mentor.email}</span>
                                                </span>
                                                <form action={removeMentor.bind(null, eventId)}>
                                                    <input type="hidden" name="mentorId" value={mentor.id} />
                                                    <ConfirmSubmit
                                                        tone="danger"
                                                        title={`Remove ${mentor.name}?`}
                                                        description={
                                                            booked
                                                                ? `They have ${booked} booked slot${booked === 1 ? "" : "s"}, and those teams lose them.`
                                                                : "They are removed from the mentor list."
                                                        }
                                                        confirmLabel="Remove mentor"
                                                        className="text-2xs uppercase text-ink-faint hover:text-ink"
                                                    >
                                                        Remove
                                                    </ConfirmSubmit>
                                                </form>
                                            </div>
                                            <p className="mt-0.5 text-xs text-ink-soft">
                                                {mentor.expertise.join(" · ") || "no areas listed"} · {free} free,{" "}
                                                {booked} booked
                                            </p>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </CardBody>
                </Card>
            </div>
        </div>
    );
}
