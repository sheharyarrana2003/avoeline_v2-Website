"use client";

import { useEffect, useState } from "react";
import { MessageSquareText } from "lucide-react";
import { EventFeedbackAnalysisRow } from "@/src/services/models/feedback.model";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { tableCell, tableHead, tableRow } from "@/src/lib/ui";

export default function EventFeedbackAnalysis({
    analyzeFeedback,
}: {
    analyzeFeedback: () => Promise<EventFeedbackAnalysisRow[]>;
}) {
    const [rows, setRows] = useState<EventFeedbackAnalysisRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                const result = await analyzeFeedback();
                if (!cancelled) {
                    setRows(result);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : "Failed to analyze feedback"
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        load();
        return () => {
            cancelled = true;
        };
    }, [analyzeFeedback]);

    return (
        <section>
            <div className="flex flex-col gap-1 border-b border-line pb-3 sm:flex-row sm:items-end sm:justify-between">
                <h2 className="font-display text-xl text-ink">Event Feedback Analysis</h2>
                <p className="text-sm text-ink-soft">AI-powered insights from attendee feedback</p>
            </div>

            {loading ? (
                <p className="py-12 text-center text-sm text-ink-soft" aria-live="polite">
                    Analyzing feedback with AI…
                </p>
            ) : error ? (
                <EmptyState
                    size="sm"
                    className="mt-6"
                    icon={<MessageSquareText size={24} />}
                    title="Feedback analysis failed"
                    description={error}
                />
            ) : rows.length === 0 ? (
                <EmptyState
                    size="sm"
                    className="mt-6"
                    icon={<MessageSquareText size={24} />}
                    title="No feedback yet"
                    description="Once attendees rate a completed event, their comments are summarised here."
                />
            ) : (
                <div className="mt-2 overflow-x-auto">
                    <table className="w-full min-w-[860px] border-collapse">
                        <thead>
                            <tr className="border-b border-line">
                                <th className={tableHead}>Event</th>
                                <th className={tableHead}>Feedback</th>
                                <th className={tableHead}>Summary</th>
                                <th className={tableHead}>Strengths</th>
                                <th className={tableHead}>Improvements</th>
                                <th className={tableHead}>Sentiment</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => (
                                <tr key={row.eventId} className={`${tableRow} align-top`}>
                                    <td className={tableCell}>
                                        <p className="font-medium text-ink">{row.eventName}</p>
                                        <p className="mt-1 text-2xs text-ink-soft tabular-nums">{row.eventId}</p>
                                    </td>
                                    <td className={`${tableCell} tabular-nums`}>{row.feedbackCount}</td>
                                    <td className={`${tableCell} max-w-xs text-ink-soft`}>{row.summary}</td>
                                    <td className={`${tableCell} max-w-xs text-ink-soft`}>{row.strengths}</td>
                                    <td className={`${tableCell} max-w-xs text-ink-soft`}>{row.improvements}</td>
                                    <td className={tableCell}>
                                        <StatusBadge status={row.sentiment} size="sm" />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}
