import type { HackathonTeam, HackathonTrack, JudgeScore, RubricCategory, TeamScores } from "./types";

// Re-exported so callers can keep importing the score shape from the judging
// module, which is where it is used, while it is declared beside the team.
export type { JudgeScore, TeamScores };

/**
 * Judging, rounds and the leaderboard (spec 3.3). Pure, client-safe.
 *
 * Kept out of `types.ts` because that file is already the track and team
 * vocabulary; this is the arithmetic on top of it. Pure for the same reason
 * `decideAccess` is: the numbers decide who wins, so they are worth asserting
 * directly rather than through a page.
 */

/**
 * A judge (spec 3.3).
 *
 * Invited by email and reached by an unguessable token in the link, with no
 * account: judges are usually outsiders brought in for a day, and making them
 * sign up would mean a new role in auth and the proxy for people who will use
 * the app once. The token is the credential, the same model as the ticket link
 * and certificate verification, and the organizer can revoke it.
 */
export interface HackathonJudge {
    id: string;
    eventId: string;
    organizerId: string;
    name: string;
    email: string;
    /** Which tracks this judge scores. Empty means none yet. */
    trackIds: string[];
    /** Unguessable; the whole credential. Null once revoked. */
    inviteToken: string | null;
    invitedAt: string;
    lastScoredAt: string | null;
    createdAt: string;
    updatedAt: string;
}

/**
 * Rounds are keyed `r1`, `r2`, … rather than by array index.
 *
 * A map keyed by round means adding round two is a merge-write on a key nobody
 * else touches, so two judges scoring different teams -- or the same team in
 * different rounds -- never overwrite each other's work.
 */
export function roundKey(round: number): string {
    return `r${Math.max(1, Math.round(round))}`;
}

/** The most a team can score from one judge. Zero when no rubric is set. */
export function rubricMax(rubric: RubricCategory[]): number {
    return rubric.reduce((sum, c) => sum + (Number(c.maxScore) || 0), 0);
}

/**
 * Score one card.
 *
 * Each category is clamped to its own maximum, which is what "max score per
 * category" means as a weight: a category worth 20 can move the total twice as
 * far as one worth 10, with no second weight field to keep consistent. Clamped
 * rather than rejected so a judge who types 11 out of 10 gets 10 instead of an
 * error in the middle of a judging session.
 */
export function scoreCard(rubric: RubricCategory[], raw: Record<string, unknown>): { byCategory: Record<string, number>; total: number } {
    const byCategory: Record<string, number> = {};
    let total = 0;
    for (const category of rubric) {
        const max = Number(category.maxScore) || 0;
        const value = Number(raw?.[category.id] ?? 0);
        const clamped = Number.isFinite(value) ? Math.min(Math.max(value, 0), max) : 0;
        // Whole points: a rubric out of 10 that accepts 7.35 invites judges to
        // argue about decimals they cannot see on the leaderboard.
        const points = Math.round(clamped);
        byCategory[category.id] = points;
        total += points;
    }
    return { byCategory, total };
}

/** Every card submitted for a team in one round. */
export function cardsForRound(scores: TeamScores, round: number): JudgeScore[] {
    const key = roundKey(round);
    return Object.values(scores ?? {})
        .map((byRound) => byRound?.[key])
        .filter((card): card is JudgeScore => !!card && typeof card.total === "number");
}

export interface RankedTeam {
    team: HackathonTeam;
    /** 1-based, with ties sharing a rank. */
    rank: number;
    /** Mean of the judges' totals, to one decimal. */
    average: number;
    /** Percentage of the rubric's maximum, for a bar. */
    percentage: number;
    judgeCount: number;
    /** True once every assigned judge has scored this team. */
    complete: boolean;
}

/**
 * The leaderboard for one round.
 *
 * The average across judges, not the sum: with three judges out of 100 a sum
 * reads as 300, and a team scored by two judges would rank below one scored by
 * three no matter how good it was. The average is comparable whoever turned up.
 *
 * Teams eliminated in an earlier round are left out entirely, and teams with no
 * scores yet sort last rather than at the top on a zero.
 */
export function rankTeams(
    teams: HackathonTeam[],
    rubric: RubricCategory[],
    round: number,
    expectedJudges = 0,
): RankedTeam[] {
    const max = rubricMax(rubric);

    const rows = teams
        .filter((team) => team.eliminatedAtRound === null || team.eliminatedAtRound >= round)
        .filter((team) => team.round >= round)
        .map((team) => {
            const cards = cardsForRound(team.scores, round);
            const sum = cards.reduce((n, c) => n + (Number(c.total) || 0), 0);
            const average = cards.length ? Math.round((sum / cards.length) * 10) / 10 : 0;
            return {
                team,
                rank: 0,
                average,
                percentage: max > 0 ? Math.round((average / max) * 100) : 0,
                judgeCount: cards.length,
                complete: expectedJudges > 0 && cards.length >= expectedJudges,
            };
        })
        .sort((a, b) => {
            // An unscored team never outranks a scored one, whatever the tie-break.
            if (!a.judgeCount !== !b.judgeCount) return a.judgeCount ? -1 : 1;
            if (b.average !== a.average) return b.average - a.average;
            // A team judged by more people is the better-established score.
            if (b.judgeCount !== a.judgeCount) return b.judgeCount - a.judgeCount;
            return a.team.name.localeCompare(b.team.name);
        });

    // Ties share a rank, so two teams on 88 are both second and the next is fourth.
    let lastAverage: number | null = null;
    let lastRank = 0;
    rows.forEach((row, index) => {
        if (lastAverage !== null && row.average === lastAverage && row.judgeCount > 0) {
            row.rank = lastRank;
        } else {
            row.rank = index + 1;
            lastRank = row.rank;
            lastAverage = row.average;
        }
    });

    return rows;
}

/**
 * Which teams advance when the organizer closes a round.
 *
 * Only scored teams can advance: promoting a team nobody judged would be
 * arbitrary, and it is nearly always a team that never submitted. Ties at the
 * cut-off are all carried, so closing a round can advance more than `topN`
 * rather than the app silently picking between teams a judge scored equally --
 * that choice belongs to a human.
 */
export function advanceSelection(
    ranked: RankedTeam[],
    topN: number,
): { advancing: string[]; eliminated: string[]; carriedTies: number } {
    const scored = ranked.filter((r) => r.judgeCount > 0);
    const cut = Math.max(1, Math.round(topN));

    if (scored.length === 0) return { advancing: [], eliminated: [], carriedTies: 0 };

    const cutoff = scored[Math.min(cut, scored.length) - 1].average;
    const advancing = scored.filter((r) => r.average >= cutoff);
    const advancingIds = new Set(advancing.map((r) => r.team.id));

    return {
        advancing: advancing.map((r) => r.team.id),
        eliminated: ranked.filter((r) => !advancingIds.has(r.team.id)).map((r) => r.team.id),
        carriedTies: Math.max(0, advancing.length - cut),
    };
}

/** The badge a team shows on the organizer's judging table. */
export function teamJudgingStatus(
    team: Pick<HackathonTeam, "eliminatedAtRound" | "round" | "scores">,
    round: number,
): "advanced" | "eliminated" | "scored" | "awaiting_scores" {
    if (team.eliminatedAtRound !== null && team.eliminatedAtRound < round) return "eliminated";
    if (team.round > round) return "advanced";
    return cardsForRound(team.scores, round).length ? "scored" : "awaiting_scores";
}

/** Which tracks a judge may score. */
export function judgesTrack(judge: { trackIds: string[] }, trackId: string): boolean {
    return judge.trackIds.includes(trackId);
}

/**
 * One rubric category per line: `Innovation | 20`.
 *
 * The same shape module 1 used for admin-defined event fields, and for the same
 * reason: a textarea needs no per-row add and remove buttons, and no client
 * component to manage them.
 */
export function parseRubricLines(text: unknown): RubricCategory[] {
    const seen = new Set<string>();
    const out: RubricCategory[] = [];
    for (const line of String(text ?? "").split("\n")) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const [labelPart, maxPart] = trimmed.split("|");
        const label = (labelPart ?? "").trim().slice(0, 80);
        if (!label) continue;
        const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
        if (!id || seen.has(id)) continue;
        seen.add(id);
        // Not `Number(x) || 10`: that idiom treats an explicit "0" as absent and
        // silently invents a weight of 10 the organizer never typed. An omitted
        // max defaults; a stated one is respected, then floored at 1 so every
        // category can actually move the total.
        const stated = (maxPart ?? "").trim();
        const parsedMax = stated === "" ? 10 : Number(stated);
        const max = Math.round(Number.isFinite(parsedMax) ? parsedMax : 10);
        out.push({ id, label, maxScore: Math.min(Math.max(max, 1), 100) });
    }
    return out.slice(0, 12);
}

export function formatRubricLines(rubric: RubricCategory[]): string {
    return rubric.map((c) => `${c.label} | ${c.maxScore}`).join("\n");
}

/** Whether a track is ready to be judged at all. */
export function judgingReady(track: Pick<HackathonTrack, "rubric">): boolean {
    return track.rubric.length > 0;
}
