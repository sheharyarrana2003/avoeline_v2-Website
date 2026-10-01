"use client";

import { useState, useTransition } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import type { ExportResult } from "@/src/features/exports/types";
import type { SheetKind } from "@/src/features/exports/eventSheets";

/** The statuses worth filtering an attendee list by, in the order they occur. */
const STATUS_CHOICES: { value: string; label: string }[] = [
    { value: "all", label: "Every registration" },
    { value: "confirmed", label: "Confirmed" },
    { value: "pending", label: "Awaiting approval" },
    { value: "awaiting_payment", label: "Awaiting payment" },
    { value: "waitlisted", label: "Waitlisted" },
    { value: "checked_in", label: "Checked in" },
    { value: "attended", label: "Attended" },
    { value: "no_show", label: "No show" },
    { value: "cancelled", label: "Cancelled" },
    { value: "rejected", label: "Rejected" },
];

/**
 * One export: a description, and a button per format.
 *
 * Both formats are offered side by side rather than behind a dropdown, because
 * the choice is not a preference to be remembered -- it is what the person is
 * about to do with the file, and it changes every time.
 *
 * The download link is short-lived and arrives after the click, so a failure
 * has to be shown here; otherwise the button just stops looking busy and
 * nothing happens. Same reasoning as `ExportButton`, which stays for the single
 * button on the attendees tab.
 */
function ExportRow({
    kind,
    title,
    description,
    run,
    extra,
}: {
    kind: SheetKind;
    title: string;
    description: string;
    run: (kind: SheetKind, format: "csv" | "xlsx") => Promise<ExportResult>;
    extra?: React.ReactNode;
}) {
    const [pending, start] = useTransition();
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const download = (format: "csv" | "xlsx") =>
        start(async () => {
            setError(null);
            setBusy(format);
            try {
                const result = await run(kind, format);
                if (!result.success || !result.url) {
                    setError(result.error ?? "Could not prepare the download.");
                    return;
                }
                // Same tab: a popup blocker eats window.open() once the click and
                // the navigation are separated by an await.
                window.location.href = result.url;
            } catch {
                setError("Could not reach the server. Please try again.");
            } finally {
                setBusy(null);
            }
        });

    return (
        <div className="flex flex-col gap-3 border-b border-line py-5 last:border-b-0 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <div className="flex min-w-0 flex-col gap-1">
                <p className="text-sm font-semibold text-ink">{title}</p>
                <p className="text-xs text-ink-soft">{description}</p>
                {extra}
            </div>
            <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                <div className="flex gap-2">
                    <button
                        type="button"
                        disabled={pending}
                        onClick={() => download("xlsx")}
                        className={buttonClass("primary", "sm")}
                    >
                        <FileSpreadsheet size={14} aria-hidden="true" />
                        {busy === "xlsx" ? "Preparing…" : "Excel"}
                    </button>
                    <button
                        type="button"
                        disabled={pending}
                        onClick={() => download("csv")}
                        className={buttonClass("secondary", "sm")}
                    >
                        <Download size={14} aria-hidden="true" />
                        {busy === "csv" ? "Preparing…" : "CSV"}
                    </button>
                </div>
                {error ? <FormFeedback error={error} /> : null}
            </div>
        </div>
    );
}

/**
 * Spec 6.2's four exports.
 *
 * `run` is bound to the event server-side by the page, so the event id is never
 * in the client's hands; the action re-checks ownership regardless.
 */
export function ExportPanel({
    run,
    questionCount,
    showHackathonTeams = false,
}: {
    run: (kind: SheetKind, format: "csv" | "xlsx", status?: string) => Promise<ExportResult>;
    /** How many custom questions this event asks, so the copy can say so. */
    questionCount: number;
    showHackathonTeams?: boolean;
}) {
    const [status, setStatus] = useState("all");

    return (
        <div className="flex flex-col">
            <ExportRow
                kind="attendees"
                title="Attendee list"
                description={
                    questionCount
                        ? `Contact details, ticket tier, payment and check-in state, plus your ${questionCount} registration question${questionCount === 1 ? "" : "s"} as columns.`
                        : "Contact details, ticket tier, payment and check-in state, one row per registration."
                }
                run={(kind, format) => run(kind, format, status)}
                extra={
                    <div className="mt-2 flex flex-col gap-1.5">
                        <label htmlFor="export-status" className={labelClass}>
                            Filter by status
                        </label>
                        <select
                            id="export-status"
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className={`${fieldClass} sm:max-w-64`}
                        >
                            {STATUS_CHOICES.map((s) => (
                                <option key={s.value} value={s.value}>
                                    {s.label}
                                </option>
                            ))}
                        </select>
                    </div>
                }
            />
            <ExportRow
                kind="checkin"
                title="Check-in log"
                description="Only the people who arrived, earliest first, with how and when they were checked in."
                run={run}
            />
            <ExportRow
                kind="financial"
                title="Financial summary"
                description="Ticket revenue broken down by tier, sponsor income by sponsor, and the combined total."
                run={run}
            />
            <ExportRow
                kind="sponsors"
                title="Sponsors and partners"
                description="Every sponsor, collaborator and partner with their tier, contract value, contacts and outstanding benefits."
                run={run}
            />
            {showHackathonTeams ? (
                <ExportRow
                    kind="hackathon_teams"
                    title="Hackathon teams"
                    description="One workbook with a team summary sheet and a member-detail sheet. CSV downloads the summary only."
                    run={run}
                />
            ) : null}
        </div>
    );
}
