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
import { assertOwnedEvent } from "@/src/features/events/ownership";
import { getEventOrganizations } from "@/src/features/organizations/organizations.service";
import { isHackathon, listTeamsOfEvent, listTracks } from "@/src/features/hackathon/hackathon.service";
import { trackSponsor } from "@/src/features/hackathon/types";
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

    const [tracks, teams, orgs] = await Promise.all([
        listTracks(eventId),
        listTeamsOfEvent(eventId),
        getEventOrganizations(eventId),
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
        </div>
    );
}
