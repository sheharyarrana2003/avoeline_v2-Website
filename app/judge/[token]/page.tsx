import { notFound } from "next/navigation";
import { Download, Gavel } from "lucide-react";
import { Card, CardBody } from "@/src/shared_components/ui/Card";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { BrandMark } from "@/src/shared_components/ui/BrandMark";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { formatDate, formatDateMedium } from "@/src/lib/datetime";
import { CERTIFICATES_BUCKET, getSignedUrl } from "@/data/supabase";
import { EventService } from "@/src/services/event.service";
import { findJudgeByToken, listTeams, listTracks } from "@/src/features/hackathon/hackathon.service";
import { cardsForRound, roundKey, rubricMax, type JudgeScore } from "@/src/features/hackathon/judging";
import { rosterProgress } from "@/src/features/hackathon/types";
import { ScoreForm } from "@/src/features/hackathon/components/ScoreForm";
import { submitScore } from "@/src/features/hackathon/actions/judging.action";

export const metadata = { title: "Judging — Avoeline", robots: { index: false, follow: false } };

/**
 * A judge's scoring page (spec 3.3).
 *
 * The unguessable token in the URL is the entire credential -- there is no
 * account behind a judge, and the same action re-reads the token server-side
 * before writing anything. `robots` is set to noindex because the URL is a
 * secret and a crawler that reached it would publish it.
 *
 * Only the judge's own assigned tracks are shown, and only the round each track
 * is currently on, so a judge cannot score a closed round or a track they were
 * not asked to judge.
 */
export default async function JudgePage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;

    const judge = await findJudgeByToken(token);
    if (!judge || !judge.inviteToken) notFound();

    const event = await EventService.getEventByID(judge.eventId);
    if (!event) notFound();

    const allTracks = await listTracks(judge.eventId);
    const mine = allTracks.filter((t) => judge.trackIds.includes(t.id));

    return (
        <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
            <div className="mb-8 flex items-center gap-2">
                <BrandMark className="h-7 w-7" />
                <span className="text-2xs font-medium uppercase tracking-wider text-ink-soft">Avoeline</span>
            </div>

            <h1 className="flex items-center gap-2 font-display text-2xl text-ink">
                <Gavel className="h-5 w-5" aria-hidden="true" />
                Judging {event.title}
            </h1>
            <p className="mt-1 text-sm text-ink-soft">
                Welcome {judge.name}. You are judging {mine.length === 1 ? "one track" : `${mine.length} tracks`}.
                {judge.lastScoredAt ? ` You last scored on ${formatDateMedium(judge.lastScoredAt)}.` : ""}
            </p>
            <p className="mt-2 text-xs text-ink-soft">
                This link is yours alone and needs no password, so please do not forward it.
            </p>

            {mine.length === 0 ? (
                <div className="mt-8">
                    <EmptyState
                        icon={<Gavel className="h-5 w-5" />}
                        title="No tracks assigned yet"
                        description="The organiser has not assigned you a track. This page will fill in once they do."
                    />
                </div>
            ) : (
                <div className="mt-8 space-y-8">
                    {await Promise.all(
                        mine.map(async (track) => {
                            const teams = await listTeams(track.id);
                            const round = track.currentRound;
                            const key = roundKey(round);
                            const max = rubricMax(track.rubric);

                            // Only teams still in this round: an eliminated team or
                            // one that has not advanced is not this judge's business.
                            const judgeable = teams
                                .filter((t) => t.eliminatedAtRound === null || t.eliminatedAtRound >= round)
                                .filter((t) => t.round >= round)
                                .sort((a, b) => a.name.localeCompare(b.name));

                            // Signed before the render: the JSX map below is not
                            // async, and a signed URL cannot be stored.
                            const deckUrls = new Map<string, string>();
                            await Promise.all(
                                judgeable
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

                            const rulesUrl = track.rulesPath
                                ? await getSignedUrl(
                                      CERTIFICATES_BUCKET,
                                      track.rulesPath,
                                      3600,
                                      track.rulesName || "rules.pdf",
                                  ).catch(() => "")
                                : "";

                            return (
                                <Card key={track.id} title={`${track.name} — round ${round}`}>
                                    <CardBody>
                                        {!track.rubric.length ? (
                                            <p className="rounded-lg border border-line bg-muted px-3 py-2.5 text-sm text-ink-soft">
                                                The organiser has not published a rubric for this track yet, so there
                                                is nothing to score against.
                                            </p>
                                        ) : (
                                            <>
                                                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-line pb-4 text-xs text-ink-soft">
                                                    <span>
                                                        {track.rubric.length} categories, {max} points in total
                                                    </span>
                                                    {track.submissionDeadline ? (
                                                        <span>Submissions closed {formatDate(track.submissionDeadline)}</span>
                                                    ) : null}
                                                    {rulesUrl ? (
                                                        <a
                                                            href={rulesUrl}
                                                            className="inline-flex items-center gap-1.5 font-medium text-ink hover:underline"
                                                        >
                                                            <Download size={13} aria-hidden="true" />
                                                            {track.rulesName || "Rules"}
                                                        </a>
                                                    ) : null}
                                                </div>

                                                {judgeable.length === 0 ? (
                                                    <p className="pt-4 text-sm text-ink-soft">
                                                        No teams are in this round yet.
                                                    </p>
                                                ) : (
                                                    <div className="divide-y divide-line">
                                                        {judgeable.map((team) => {
                                                            const scores = team.scores;
                                                            const existing: JudgeScore | null =
                                                                scores?.[judge.id]?.[key] ?? null;
                                                            const others = cardsForRound(scores, round).length;
                                                            return (
                                                                <section key={team.id} className="py-6 first:pt-4">
                                                                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                                                                        <h3 className="font-display text-base text-ink">
                                                                            {team.name}
                                                                        </h3>
                                                                        <span className="flex items-center gap-2 text-xs text-ink-soft">
                                                                            {rosterProgress(team).label}
                                                                            <StatusBadge
                                                                                status={existing ? "scored" : "awaiting_scores"}
                                                                                size="sm"
                                                                            />
                                                                        </span>
                                                                    </div>

                                                                    {team.submission.submittedAt ? (
                                                                        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs">
                                                                            {team.submission.repoUrl ? (
                                                                                <a
                                                                                    href={team.submission.repoUrl}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    className="font-medium text-ink hover:underline"
                                                                                >
                                                                                    Repository
                                                                                </a>
                                                                            ) : null}
                                                                            {team.submission.demoVideoUrl ? (
                                                                                <a
                                                                                    href={team.submission.demoVideoUrl}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    className="font-medium text-ink hover:underline"
                                                                                >
                                                                                    Demo video
                                                                                </a>
                                                                            ) : null}
                                                                            {deckUrls.get(team.id) ? (
                                                                                <a
                                                                                    href={deckUrls.get(team.id)}
                                                                                    className="font-medium text-ink hover:underline"
                                                                                >
                                                                                    Pitch deck
                                                                                </a>
                                                                            ) : null}
                                                                        </div>
                                                                    ) : (
                                                                        <p className="mt-2 text-xs text-ink-soft">
                                                                            This team has not submitted anything.
                                                                        </p>
                                                                    )}

                                                                    {team.submission.description ? (
                                                                        <p className="mt-3 whitespace-pre-line text-sm text-ink-soft">
                                                                            {team.submission.description}
                                                                        </p>
                                                                    ) : null}

                                                                    <div className="mt-4">
                                                                        <ScoreForm
                                                                            teamId={team.id}
                                                                            teamName={team.name}
                                                                            rubric={track.rubric}
                                                                            existing={existing}
                                                                            action={submitScore.bind(null, token)}
                                                                        />
                                                                    </div>

                                                                    {others > (existing ? 1 : 0) ? (
                                                                        <p className="mt-2 text-xs text-ink-soft">
                                                                            {others} judge{others === 1 ? "" : "s"} have
                                                                            scored this team.
                                                                        </p>
                                                                    ) : null}
                                                                </section>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </>
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
