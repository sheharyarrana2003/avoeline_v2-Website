import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock, Radio, Trophy } from "lucide-react";
import { Card, CardBody } from "@/src/shared_components/ui/Card";
import { BrandMark } from "@/src/shared_components/ui/BrandMark";
import { buttonClass } from "@/src/lib/ui";
import { getEventForVisitor } from "@/src/features/registration/registration.service";
import { getEventOrganizations } from "@/src/features/organizations/organizations.service";
import { publicOrder } from "@/src/features/organizations/types";
import {
    getHackathonSettings,
    getTrack,
    isHackathon,
    judgesForTrack,
    listTeams,
} from "@/src/features/hackathon/hackathon.service";
import { rankTeams } from "@/src/features/hackathon/judging";
import { embedUrl } from "@/src/features/hackathon/live";
import { trackSponsor } from "@/src/features/hackathon/types";
import { Leaderboard } from "@/src/features/hackathon/components/Leaderboard";
import { LiveRefresh } from "@/src/features/hackathon/components/LiveRefresh";

export const metadata = { title: "Live leaderboard — Avoeline" };

/**
 * Spec 3.5's spectator view: the live leaderboard, an embedded stream and a
 * sponsor booth directory, for people watching rather than competing.
 *
 * Behind module 2's access gate, not a rule of its own -- a public hackathon is
 * openly watchable, a private one needs its code exactly as registering does.
 * Only reachable while the organizer has online mode switched on, so the switch
 * genuinely does something rather than being a stored flag.
 *
 * Judge counts are deliberately hidden here: on a three-person panel, "two of
 * three have scored" identifies who has not.
 */
export default async function SpectatorLeaderboardPage({
    params,
    searchParams,
}: {
    params: Promise<{ eventId: string; trackId: string }>;
    searchParams: Promise<{ code?: string }>;
}) {
    const { eventId, trackId } = await params;
    const { code } = await searchParams;

    const { event, access } = await getEventForVisitor(eventId, { code: code ?? null });
    if (!event || !isHackathon(event)) notFound();

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
                                <h1 className="font-display text-lg text-ink">This hackathon is private</h1>
                                <p className="mt-1 text-sm text-ink-soft">
                                    Open the event page and enter its access code to watch.
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

    const settings = await getHackathonSettings(eventId);
    const track = await getTrack(trackId);
    if (!track || track.eventId !== event.id) notFound();
    // The switch has to mean something: with online mode off there is no
    // spectator page, rather than one nobody was told about.
    if (!settings.onlineMode) notFound();

    const [teams, judges, orgs] = await Promise.all([
        listTeams(track.id),
        judgesForTrack(event.id, track.id),
        getEventOrganizations(event.id),
    ]);

    const ranked = rankTeams(teams, track.rubric, track.currentRound, judges.length);
    const stream = embedUrl(settings.livestreamUrl);
    const dedicated = trackSponsor(orgs, track.id);
    // The booth directory: sponsors and partners, in the same order the public
    // event page credits them. Collaborators are staff, not a public credit.
    const booths = publicOrder(
        orgs.filter((o) => o.type === "sponsor" || o.type === "partner"),
        event.sponsorTiers,
    );

    return (
        <main className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6">
            <Link href="/" className="mb-8 inline-flex items-center gap-2 rounded-xs focus-visible:outline-2 focus-visible:outline-offset-2">
                <BrandMark className="h-7 w-7" />
                <span className="text-2xs font-medium uppercase tracking-wider text-ink-soft">Avoeline</span>
            </Link>

            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <p className="text-2xs font-medium uppercase tracking-wider text-ink-soft">{event.title}</p>
                    <h1 className="mt-1 flex items-center gap-2 font-display text-2xl text-ink">
                        <Trophy className="h-5 w-5" aria-hidden="true" />
                        {track.name}
                    </h1>
                    <p className="mt-1 text-sm text-ink-soft">
                        Round {track.currentRound}
                        {track.prizePool ? ` · ${track.prizePool}` : ""}
                    </p>
                </div>
                <LiveRefresh label="Live" />
            </div>

            {stream ? (
                <section className="mt-8">
                    <h2 className="mb-3 flex items-center gap-2 font-display text-lg text-ink">
                        <Radio className="h-4 w-4" aria-hidden="true" />
                        Watch live
                    </h2>
                    <div className="aspect-video w-full overflow-hidden rounded-2xl border border-line bg-muted">
                        {/* Only YouTube and Zoom embed URLs reach this attribute --
                            `embedUrl` returns "" for anything else, which is why
                            this renders nothing rather than an arbitrary origin. */}
                        <iframe
                            src={stream}
                            title={`${track.name} livestream`}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            referrerPolicy="strict-origin-when-cross-origin"
                            className="h-full w-full"
                        />
                    </div>
                </section>
            ) : null}

            <section className="mt-10">
                <Card title="Leaderboard">
                    <CardBody>
                        <Leaderboard
                            ranked={ranked}
                            rubric={track.rubric}
                            round={track.currentRound}
                            emptyHint="Judging has not started. This page updates itself as scores come in."
                        />
                    </CardBody>
                </Card>
            </section>

            {booths.length ? (
                <section className="mt-10">
                    <h2 className="font-display text-lg text-ink">Sponsors and partners</h2>
                    {dedicated ? (
                        <p className="mt-1 text-sm text-ink-soft">This track is sponsored by {dedicated.name}.</p>
                    ) : null}
                    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {booths.map((org) => (
                            <Card key={org.id} tone="panel" interactive={!!org.websiteUrl}>
                                <CardBody>
                                    <p className="text-sm font-semibold text-ink">{org.name}</p>
                                    {/* Tier and partnership kind only. A sponsor's
                                        contract value is confidential -- it belongs on
                                        the organizer's own page and in the sponsor
                                        export, never on a page anybody can open. */}
                                    <p className="mt-0.5 text-2xs uppercase tracking-wide text-ink-soft">
                                        {org.type === "sponsor" ? org.tier || "Sponsor" : org.partnershipKind || "Partner"}
                                        {org.id === dedicated?.id ? " · this track" : ""}
                                    </p>
                                    {org.websiteUrl ? (
                                        <p className="mt-3">
                                            <a
                                                href={org.websiteUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs font-medium text-ink hover:underline"
                                            >
                                                Visit their booth
                                            </a>
                                        </p>
                                    ) : null}
                                </CardBody>
                            </Card>
                        ))}
                    </div>
                </section>
            ) : null}

            <p className="mt-10 text-center text-xs text-ink-soft">
                <Link href={`/events/${eventId}/tracks${code ? `?code=${encodeURIComponent(code)}` : ""}`} className="hover:underline">
                    All tracks
                </Link>
            </p>
        </main>
    );
}
