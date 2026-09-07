import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Download, Flag, Users } from "lucide-react";
import { Card, CardBody } from "@/src/shared_components/ui/Card";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { buttonClass } from "@/src/lib/ui";
import { formatDate } from "@/src/lib/datetime";
import { formatCurrency } from "@/src/lib/money";
import { CERTIFICATES_BUCKET, getSignedUrl } from "@/data/supabase";
import { assertParticipant } from "@/src/features/events/ownership";
import { getEventOrganizations } from "@/src/features/organizations/organizations.service";
import { isHackathon, listTeams, listTracks, teamsForRegistration } from "@/src/features/hackathon/hackathon.service";
import {
    complementaryTo,
    deadlinePassed,
    feeBlocksSubmission,
    rosterLocked,
    rosterProgress,
    teamSkills,
    trackSponsor,
    type HackathonTeam,
    type HackathonTrack,
} from "@/src/features/hackathon/types";
import { CreateOrJoinTeam } from "@/src/features/hackathon/components/CreateOrJoinTeam";
import { SubmissionForm } from "@/src/features/hackathon/components/SubmissionForm";
import { TeamFeePanel, TeamPanel } from "@/src/features/hackathon/components/TeamPanel";
import {
    createTeam,
    joinTeam,
    leaveTeam,
    submitProject,
    updateTeamPrefs,
    uploadFeeProof,
} from "@/src/features/hackathon/actions/teams.action";

export const metadata = { title: "Your teams — Avoeline" };

/**
 * The participant's hackathon surface (spec 3.2 and 3.3).
 *
 * Reached from the ticket link and authorized by it: there is no account behind
 * a public registration, so the unguessable registration id is the credential,
 * and `assertParticipant` re-reads both documents to confirm the pair belongs
 * together. Every action below is bound with the same two ids from the route,
 * never from a form field a caller could swap.
 */
export default async function ParticipantTeamPage({
    params,
}: {
    params: Promise<{ eventId: string; registrationId: string }>;
}) {
    const { eventId, registrationId } = await params;

    const who = await assertParticipant(eventId, registrationId);
    if (!who || !isHackathon(who.event)) notFound();

    const [tracks, myTeams, orgs] = await Promise.all([
        listTracks(eventId),
        teamsForRegistration(registrationId),
        getEventOrganizations(eventId),
    ]);

    const ticketHref = `/events/${eventId}/ticket/${registrationId}`;

    return (
        <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
            <Link href={ticketHref} className="inline-flex items-center gap-1 text-xs text-ink-soft hover:text-ink">
                <ChevronLeft className="h-3.5 w-3.5" />
                Back to your ticket
            </Link>

            <h1 className="mt-3 font-display text-2xl text-ink">{who.event.title}</h1>
            <p className="mt-1 text-sm text-ink-soft">
                Tracks you can enter as {who.registration.attendee?.name || "a participant"}. Team up, then submit
                your project before the track&apos;s deadline.
            </p>

            {tracks.length === 0 ? (
                <div className="mt-8">
                    <EmptyState
                        icon={<Flag className="h-5 w-5" />}
                        title="No tracks yet"
                        description="The organiser has not opened any tracks for this hackathon. Check back closer to the day."
                    />
                </div>
            ) : (
                <div className="mt-8 space-y-8">
                    {await Promise.all(
                        tracks.map(async (track) => {
                            const mine = myTeams.find((t) => t.trackId === track.id) ?? null;
                            const teams = await listTeams(track.id);
                            return (
                                <TrackSection
                                    key={track.id}
                                    track={track}
                                    mine={mine}
                                    teams={teams}
                                    orgs={orgs}
                                    eventId={eventId}
                                    registrationId={registrationId}
                                />
                            );
                        }),
                    )}
                </div>
            )}

            <p className="mt-8 text-center text-xs text-ink-soft">
                Keep your ticket link — it is how you get back here.
            </p>
        </main>
    );
}

async function TrackSection({
    track,
    mine,
    teams,
    orgs,
    eventId,
    registrationId,
}: {
    track: HackathonTrack;
    mine: HackathonTeam | null;
    teams: HackathonTeam[];
    orgs: Awaited<ReturnType<typeof getEventOrganizations>>;
    eventId: string;
    registrationId: string;
}) {
    const sponsor = trackSponsor(orgs, track.id);
    const locked = mine ? rosterLocked(track, mine) : rosterLocked(track, { unlockedByOrganizer: false });
    const closed = deadlinePassed(track);
    const feeLabel = track.fee > 0 ? formatCurrency(track.fee, track.currency) : "Free";

    const rulesUrl = track.rulesPath
        ? await getSignedUrl(CERTIFICATES_BUCKET, track.rulesPath, 3600, track.rulesName || "rules.pdf").catch(() => "")
        : "";

    // Spec 3.2's matching list: everyone still looking, minus my own team.
    const myTags = mine ? teamSkills(mine) : [];
    const looking = teams
        .filter((t) => t.id !== mine?.id && t.lookingForMembers && rosterProgress(t).hasRoom)
        .map((t) => ({ team: t, adds: complementaryTo(myTags, teamSkills(t)) }))
        // The most complementary first: a team that brings tags you do not have
        // is more use to you than one that duplicates them.
        .sort((a, b) => b.adds.length - a.adds.length);

    return (
        <Card title={track.name}>
            <CardBody>
                <div className="flex flex-col gap-6">
                    {track.description ? <p className="text-sm text-ink-soft">{track.description}</p> : null}

                    <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-y border-line py-4 sm:grid-cols-4">
                        <Fact label="Team size" value={`${track.minTeamSize}–${track.maxTeamSize}`} />
                        <Fact label="Entry fee" value={feeLabel} />
                        <Fact
                            label="Submit by"
                            value={track.submissionDeadline ? formatDate(track.submissionDeadline) : "—"}
                        />
                        <Fact
                            label="Roster"
                            value={<StatusBadge status={locked ? "locked" : "open"} size="sm" />}
                        />
                    </dl>

                    {(track.prizePool || sponsor || rulesUrl) && (
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-ink-soft">
                            {track.prizePool ? <span>{track.prizePool}</span> : null}
                            {sponsor ? <span>Sponsored by {sponsor.name}</span> : null}
                            {rulesUrl ? (
                                <a href={rulesUrl} className="inline-flex items-center gap-1.5 font-medium text-ink hover:underline">
                                    <Download size={13} aria-hidden="true" />
                                    {track.rulesName || "Rules"}
                                </a>
                            ) : null}
                        </div>
                    )}

                    {mine ? (
                        <>
                            <TeamPanel
                                team={mine}
                                registrationId={registrationId}
                                locked={locked}
                                updatePrefs={updateTeamPrefs.bind(null, eventId, registrationId)}
                                leave={leaveTeam.bind(null, eventId, registrationId)}
                            />

                            {track.fee > 0 ? (
                                <div className="border-t border-line pt-6">
                                    <TeamFeePanel
                                        team={mine}
                                        feeLabel={feeLabel}
                                        uploadProof={uploadFeeProof.bind(null, eventId, registrationId)}
                                    />
                                </div>
                            ) : null}

                            <div className="border-t border-line pt-6">
                                <h3 className="mb-3 text-sm font-semibold text-ink">Your submission</h3>
                                <SubmissionForm
                                    teamId={mine.id}
                                    submission={mine.submission}
                                    action={submitProject.bind(null, eventId, registrationId)}
                                    closed={closed}
                                    blockedByFee={feeBlocksSubmission(track, mine)}
                                />
                            </div>
                        </>
                    ) : locked ? (
                        <p className="rounded-lg border border-line bg-muted px-3 py-2.5 text-sm text-ink-soft">
                            Team registration for this track has closed.
                        </p>
                    ) : (
                        <CreateOrJoinTeam
                            trackId={track.id}
                            trackName={track.name}
                            maxTeamSize={track.maxTeamSize}
                            create={createTeam.bind(null, eventId, registrationId)}
                            join={joinTeam.bind(null, eventId, registrationId)}
                        />
                    )}

                    {looking.length ? (
                        <div className="border-t border-line pt-6">
                            <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
                                <Users className="h-4 w-4" aria-hidden="true" />
                                Teams looking for members
                            </h3>
                            <p className="text-xs text-ink-soft">
                                {mine
                                    ? "Skills these teams have that yours does not."
                                    : "Ask one of them for their join code."}
                            </p>
                            <ul className="mt-3 divide-y divide-line border-y border-line">
                                {looking.map(({ team, adds }) => (
                                    <li key={team.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2.5">
                                        <span className="text-sm text-ink">
                                            {team.name}
                                            <span className="text-ink-soft"> · {rosterProgress(team).label}</span>
                                        </span>
                                        <span className="text-2xs uppercase text-ink-faint">
                                            {adds.length
                                                ? `brings ${adds.join(" · ")}`
                                                : teamSkills(team).length
                                                  ? "same skills as yours"
                                                  : "no skills listed"}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : null}
                </div>
            </CardBody>
        </Card>
    );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div>
            <dt className="text-2xs font-medium uppercase text-ink-soft">{label}</dt>
            <dd className="mt-0.5 text-sm text-ink">{value}</dd>
        </div>
    );
}
