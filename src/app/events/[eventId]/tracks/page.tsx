import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, Flag, Lock } from "lucide-react";
import { Card, CardBody } from "@/src/shared_components/ui/Card";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { BrandMark } from "@/src/shared_components/ui/BrandMark";
import { buttonClass } from "@/src/lib/ui";
import { formatDate } from "@/src/lib/datetime";
import { formatCurrency } from "@/src/lib/money";
import { CERTIFICATES_BUCKET, getSignedUrl } from "@/data/supabase";
import { getEventForVisitor } from "@/src/features/registration/registration.service";
import { getEventOrganizations } from "@/src/features/organizations/organizations.service";
import { eventIsHackathon, getHackathonSettings, listTeamsOfEvent, listTracks } from "@/src/features/hackathon/hackathon.service";
import { trackSponsor } from "@/src/features/hackathon/types";

export const metadata = { title: "Tracks — Avoeline" };

/**
 * The public track listing for a hackathon (spec 3.1).
 *
 * Behind module 2's access gate rather than a second rule of its own: a private
 * event's tracks are as private as the event. When the gate refuses, this points
 * at the event page, which owns the code form -- duplicating that form here
 * would be a second place for the gate to drift.
 */
export default async function PublicTracksPage({
    params,
    searchParams,
}: {
    params: Promise<{ eventId: string }>;
    searchParams: Promise<{ code?: string; invite?: string }>;
}) {
    const { eventId } = await params;
    const { code, invite } = await searchParams;

    const { event, access } = await getEventForVisitor(eventId, {
        code: code ?? null,
        token: invite ?? null,
    });
    if (!event || !(await eventIsHackathon(event))) notFound();

    const eventHref = `/events/${eventId}${code ? `?code=${encodeURIComponent(code)}` : ""}`;

    if (!access.allowed) {
        return (
            <main className="mx-auto w-full max-w-lg px-4 py-16 sm:px-6">
                <Card tone="raised">
                    <CardBody>
                        <div className="flex items-start gap-3">
                            <span aria-hidden="true" className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-ink">
                                <Lock className="h-5 w-5" />
                            </span>
                            <div>
                                <h1 className="font-display text-lg text-ink">This event is private</h1>
                                <p className="mt-1 text-sm text-ink-soft">
                                    Open the event page and enter the access code to see its tracks.
                                </p>
                            </div>
                        </div>
                        <p className="mt-6">
                            <Link href={eventHref} className={buttonClass("primary", "sm")}>
                                Go to the event
                            </Link>
                        </p>
                    </CardBody>
                </Card>
            </main>
        );
    }

    const [tracks, teams, orgs, settings] = await Promise.all([
        listTracks(eventId),
        listTeamsOfEvent(eventId),
        getEventOrganizations(eventId),
        getHackathonSettings(eventId),
    ]);
    const qs = code ? `?code=${encodeURIComponent(code)}` : "";

    const teamsByTrack = new Map<string, number>();
    for (const team of teams) teamsByTrack.set(team.trackId, (teamsByTrack.get(team.trackId) ?? 0) + 1);

    return (
        <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
            <Link href="/" className="mb-8 inline-flex items-center gap-2 rounded-xs focus-visible:outline-2 focus-visible:outline-offset-2">
                <BrandMark className="h-7 w-7" />
                <span className="text-2xs font-medium uppercase tracking-wider text-ink-soft">Avoeline</span>
            </Link>

            <h1 className="font-display text-2xl text-ink">{event.title}</h1>
            <p className="mt-1 text-sm text-ink-soft">
                {tracks.length
                    ? "Pick a track, then form a team once you have registered."
                    : "Tracks for this hackathon."}
            </p>
            <p className="mt-4 flex flex-wrap gap-2">
                <Link href={eventHref} className={buttonClass("secondary", "sm")}>
                    Register for this event
                </Link>
                <Link href={`/events/${eventId}/mentors${qs}`} className={buttonClass("ghost", "sm")}>
                    Mentor at this hackathon
                </Link>
            </p>

            {tracks.length === 0 ? (
                <div className="mt-10">
                    <EmptyState
                        icon={<Flag className="h-5 w-5" />}
                        title="No tracks announced yet"
                        description="The organiser has not opened any tracks. Register for the event and you will be able to enter one when they do."
                    />
                </div>
            ) : (
                <div className="mt-10 space-y-6">
                    {await Promise.all(
                        tracks.map(async (track) => {
                            const sponsor = trackSponsor(orgs, track.id);
                            const rulesUrl = track.rulesPath
                                ? await getSignedUrl(
                                      CERTIFICATES_BUCKET,
                                      track.rulesPath,
                                      3600,
                                      track.rulesName || "rules.pdf",
                                  ).catch(() => "")
                                : "";
                            const count = teamsByTrack.get(track.id) ?? 0;
                            return (
                                <Card key={track.id} title={track.name}>
                                    <CardBody>
                                        {track.status === "ended" ? (
                                            <p className="text-sm font-medium text-ink">This competition has ended.</p>
                                        ) : null}
                                        {track.description ? (
                                            <p className="text-sm text-ink-soft">{track.description}</p>
                                        ) : null}

                                        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-line pt-4 sm:grid-cols-4">
                                            <Fact label="Teams of" value={`${track.minTeamSize}–${track.maxTeamSize}`} />
                                            <Fact
                                                label="Entry"
                                                value={track.fee > 0 ? formatCurrency(track.fee, track.currency) : "Free"}
                                            />
                                            <Fact
                                                label="Submit by"
                                                value={track.submissionDeadline ? formatDate(track.submissionDeadline) : "—"}
                                            />
                                            <Fact label="Teams so far" value={`${count}`} />
                                        </dl>

                                        {track.prizePool ? (
                                            <p className="mt-4 text-sm text-ink">{track.prizePool}</p>
                                        ) : null}

                                        {settings.onlineMode ? (
                                            <p className="mt-4">
                                                <Link
                                                    href={`/events/${eventId}/tracks/${track.id}/leaderboard${qs}`}
                                                    className={buttonClass("secondary", "sm")}
                                                >
                                                    Watch the live leaderboard
                                                </Link>
                                            </p>
                                        ) : null}

                                        {(sponsor || rulesUrl) && (
                                            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-ink-soft">
                                                {sponsor ? <span>Sponsored by {sponsor.name}</span> : null}
                                                {rulesUrl ? (
                                                    <a
                                                        href={rulesUrl}
                                                        className="inline-flex items-center gap-1.5 font-medium text-ink hover:underline"
                                                    >
                                                        <Download size={13} aria-hidden="true" />
                                                        {track.rulesName || "Rules and problem statement"}
                                                    </a>
                                                ) : null}
                                            </div>
                                        )}
                                    </CardBody>
                                </Card>
                            );
                        }),
                    )}
                </div>
            )}
        </main>
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
