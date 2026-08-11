"use client";

import { useEffect, useState } from "react";
import { MessageSquareText } from "lucide-react";
import { EventFeedbackAnalysisRow } from "@/src/services/models/feedback.model";

const SENTIMENT_STYLES: Record<string, string> = {
    Positive: "bg-gray-50 text-gray-900",
    Mixed: "bg-gray-50 text-gray-900",
    Negative: "bg-gray-50 text-gray-900",
};

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
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 p-6">
                <div className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-xl bg-gray-50 text-gray-500">
                        <MessageSquareText size={18} />
                    </span>
                    <div>
                        <h2 className="text-base font-extrabold text-gray-950">
                            Event Feedback Analysis
                        </h2>
                        <p className="mt-1 text-xs font-semibold text-gray-500">
                            AI-powered insights from attendee feedback
                        </p>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex h-40 items-center justify-center text-sm font-semibold text-gray-500">
                    Analyzing feedback with AI...
                </div>
            ) : error ? (
                <div className="flex h-40 items-center justify-center px-6 text-center text-sm font-semibold text-gray-900">
                    {error}
                </div>
            ) : rows.length === 0 ? (
                <div className="flex h-40 items-center justify-center text-sm font-semibold text-gray-500">
                    No feedback submitted for your events yet.
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[960px] border-collapse">
                        <thead className="bg-gray-50">
                            <tr className="text-left">
                                <th className="px-6 py-4 text-xs font-extrabold uppercase tracking-widest text-gray-500">
                                    Event
                                </th>
                                <th className="px-6 py-4 text-xs font-extrabold uppercase tracking-widest text-gray-500">
                                    Event ID
                                </th>
                                <th className="px-6 py-4 text-xs font-extrabold uppercase tracking-widest text-gray-500">
                                    Feedback
                                </th>
                                <th className="px-6 py-4 text-xs font-extrabold uppercase tracking-widest text-gray-500">
                                    Summary
                                </th>
                                <th className="px-6 py-4 text-xs font-extrabold uppercase tracking-widest text-gray-500">
                                    Strengths
                                </th>
                                <th className="px-6 py-4 text-xs font-extrabold uppercase tracking-widest text-gray-500">
                                    Improvements
                                </th>
                                <th className="px-6 py-4 text-xs font-extrabold uppercase tracking-widest text-gray-500">
                                    Sentiment
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((row) => (
                                <tr
                                    key={row.eventId}
                                    className="border-t border-gray-100 align-top"
                                >
                                    <td className="px-6 py-5 text-sm font-extrabold text-gray-950">
                                        {row.eventName}
                                    </td>
                                    <td className="px-6 py-5 text-xs font-bold text-gray-500">
                                        {row.eventId}
                                    </td>
                                    <td className="px-6 py-5 text-sm font-extrabold text-gray-950">
                                        {row.feedbackCount}
                                    </td>
                                    <td className="max-w-xs px-6 py-5 text-sm font-semibold text-gray-600">
                                        {row.summary}
                                    </td>
                                    <td className="max-w-xs px-6 py-5 text-sm font-semibold text-gray-600">
                                        {row.strengths}
                                    </td>
                                    <td className="max-w-xs px-6 py-5 text-sm font-semibold text-gray-600">
                                        {row.improvements}
                                    </td>
                                    <td className="px-6 py-5">
                                        <span
                                            className={`inline-flex rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wide ${
                                                SENTIMENT_STYLES[row.sentiment] ??
                                                "bg-gray-100 text-gray-600"
                                            }`}
                                        >
                                            {row.sentiment}
                                        </span>
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
