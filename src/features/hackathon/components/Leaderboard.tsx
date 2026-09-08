import { Trophy } from "lucide-react";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { tableCell, tableHead, tableRow } from "@/src/lib/ui";
import { rubricMax, teamJudgingStatus, type RankedTeam } from "../judging";
import type { RubricCategory } from "../types";

/**
 * The leaderboard for one round (spec 3.3), shared by the organizer's track
 * page and the public spectator view.
 *
 * A Server Component: the ranking is computed on the server from the teams it
 * already read, so the page that polls only has to re-render, not re-fetch in
 * the browser. `showJudges` is off for spectators -- how many judges have
 * scored is an operational detail, and on a small panel it identifies them.
 */
export function Leaderboard({
    ranked,
    rubric,
    round,
    showJudges = false,
    emptyHint,
}: {
    ranked: RankedTeam[];
    rubric: RubricCategory[];
    round: number;
    showJudges?: boolean;
    emptyHint?: string;
}) {
    const max = rubricMax(rubric);

    if (!ranked.length) {
        return (
            <EmptyState
                size="sm"
                icon={<Trophy className="h-5 w-5" />}
                title="Nothing to rank yet"
                description={emptyHint ?? "Once judges start scoring, teams appear here in order."}
            />
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-2xl">
                <thead>
                    <tr>
                        <th className={`${tableHead} w-12`}>#</th>
                        <th className={tableHead}>Team</th>
                        <th className={tableHead}>Score</th>
                        <th className={tableHead}>Share of {max || "—"}</th>
                        {showJudges ? <th className={tableHead}>Judges</th> : null}
                        <th className={`${tableHead} pr-0 text-right`}>Status</th>
                    </tr>
                </thead>
                <tbody>
                    {ranked.map((row) => (
                        <tr key={row.team.id} className={tableRow}>
                            <td className={`${tableCell} tabular-nums font-medium`}>
                                {row.judgeCount ? row.rank : "—"}
                            </td>
                            <td className={tableCell}>
                                <p className="font-medium text-ink">{row.team.name}</p>
                                <p className="text-xs text-ink-soft">
                                    {row.team.members.length} member{row.team.members.length === 1 ? "" : "s"}
                                </p>
                            </td>
                            <td className={`${tableCell} tabular-nums`}>
                                {row.judgeCount ? row.average.toFixed(1) : "—"}
                                {max ? <span className="text-ink-soft"> / {max}</span> : null}
                            </td>
                            <td className={tableCell}>
                                {/* A bar rather than a chart: one number per row,
                                    and recharts would be 300KB for a rectangle. */}
                                <div className="flex items-center gap-2">
                                    <span className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                                        <span
                                            className="block h-full rounded-full bg-ink"
                                            style={{ width: `${Math.min(100, row.percentage)}%` }}
                                        />
                                    </span>
                                    <span className="text-xs tabular-nums text-ink-soft">{row.percentage}%</span>
                                </div>
                            </td>
                            {showJudges ? (
                                <td className={`${tableCell} tabular-nums`}>
                                    {row.judgeCount}
                                    {row.complete ? <span className="text-ink-soft"> · all in</span> : null}
                                </td>
                            ) : null}
                            <td className={`${tableCell} pr-0 text-right`}>
                                <StatusBadge status={teamJudgingStatus(row.team, round)} size="sm" />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
