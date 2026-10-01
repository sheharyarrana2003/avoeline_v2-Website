import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, Flag } from "lucide-react";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { Card, CardBody } from "@/src/shared_components/ui/Card";
import { DataTable, CellStack, type Column } from "@/src/shared_components/ui/DataTable";
import { FilterTabs } from "@/src/shared_components/ui/FilterTabs";
import { SearchField } from "@/src/shared_components/ui/SearchField";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { fieldClass, labelClass } from "@/src/lib/ui";
import { formatDate, formatDateMedium } from "@/src/lib/datetime";
import { eventLifecycle } from "@/src/lib/eventState";
import { accessTypeOf } from "@/src/features/access/access.service";
import type { EventModel } from "@/src/services/models/event.model";
import { requireAdminArea } from "@/src/features/admin/guard";
import { listAllEvents, listEventReports, listModerationLog } from "@/src/features/admin/admin.service";
import { ModerationForm, QuickAction } from "@/src/features/admin/components/ModerationForm";
import { decideReport, moderateEvent } from "@/src/features/admin/actions/events.action";

/**
 * Spec 9.4: every event on the platform, moderation, and the flagged queue.
 *
 * Deliberately reads through `listAllEvents` rather than `getBrowsableEvents`:
 * that one exists to hide drafts, cancelled and private events, and an admin
 * moderating content has to see exactly what a stranger cannot.
 */
export default async function AdminEventsPage({
    searchParams,
}: {
    searchParams: Promise<{ tab?: string; status?: string; access?: string; category?: string; q?: string }>;
}) {
    if (!(await requireAdminArea("events"))) redirect("/admin/signin?next=/admin/events");

    const sp = await searchParams;
    const tab = sp.tab === "flagged" || sp.tab === "log" ? sp.tab : "all";
    const query = (sp.q ?? "").trim().toLowerCase();

    const [events, reports, log] = await Promise.all([listAllEvents(), listEventReports(), listModerationLog()]);
    const openReports = reports.filter((r) => r.status === "open").length;

    const categories = [...new Set(events.map((e) => e.category).filter(Boolean))].sort();
    const filtered = events
        .filter((e) => !sp.status || eventLifecycle(e.status, e.schedule) === sp.status)
        .filter((e) => !sp.access || accessTypeOf(e) === sp.access)
        .filter((e) => !sp.category || e.category === sp.category)
        .filter((e) =>
            !query
                ? true
                : [e.title, e.category, e.eventType, e.location?.city].some((f) =>
                      String(f ?? "").toLowerCase().includes(query),
                  ),
        );

    const keep = {
        status: sp.status || undefined,
        access: sp.access || undefined,
        category: sp.category || undefined,
    };
    const qs = (extra: Record<string, string | undefined>) => {
        const params = new URLSearchParams();
        for (const [k, v] of Object.entries({ ...keep, q: query || undefined, ...extra })) {
            if (v) params.set(k, v);
        }
        const s = params.toString();
        return s ? `?${s}` : "";
    };

    const tabs = [
        { label: "All events", value: "all", href: `/admin/events${qs({ tab: undefined })}`, count: events.length },
        { label: "Flagged", value: "flagged", href: `/admin/events${qs({ tab: "flagged" })}`, count: openReports },
        { label: "Moderation log", value: "log", href: `/admin/events${qs({ tab: "log" })}`, count: log.length },
    ];

    const columns: Column<EventModel>[] = [
        {
            key: "event",
            header: "Event",
            cell: (event) => (
                <CellStack
                    primary={
                        <Link href={`/events/${event.id}`} className="font-medium text-ink hover:underline">
                            {event.title || "Untitled event"}
                        </Link>
                    }
                    secondary={`${event.category || "no category"} · ${event.location?.city || "no city"}`}
                />
            ),
        },
        { key: "when", header: "When", cell: (e) => (e.schedule?.startDate ? formatDate(e.schedule.startDate) : "—") },
        { key: "access", header: "Access", cell: (e) => accessTypeOf(e) },
        {
            key: "status",
            header: "Status",
            cell: (e) => <StatusBadge status={eventLifecycle(e.status, e.schedule)} size="sm" />,
        },
        {
            key: "act",
            header: "Moderate",
            align: "right",
            cell: (event) => {
                const hidden = eventLifecycle(event.status, event.schedule);
                if (hidden === "draft" || hidden === "cancelled") {
                    return (
                        <QuickAction
                            action={moderateEvent}
                            hidden={{ eventId: event.id, intent: "restore" }}
                            label="Restore"
                        />
                    );
                }
                return (
                    <div className="flex flex-col items-end gap-2">
                        <ModerationForm
                            action={moderateEvent}
                            hidden={{ eventId: event.id, intent: "unpublish" }}
                            reasonLabel="Reason"
                            reasonPlaceholder="Why this is coming down."
                            confirmTitle={`Unpublish "${event.title}"?`}
                            confirmDescription="It disappears from Browse Events and its link stops resolving. The organizer can be told, and it can be restored."
                            confirmLabel="Unpublish"
                            submitLabel="Unpublish"
                            successMessage="Unpublished."
                        />
                    </div>
                );
            },
        },
    ];

    return (
        <>
            <PageHeader
                title="Events"
                description="Every event on the platform, including drafts and private ones. Unpublishing hides an event and is reversible; removing is the stronger statement."
            />

            <FilterTabs tabs={tabs} activeValue={tab} label="Event management sections" />

            {tab === "all" ? (
                <>
                    <div className="mt-6 grid gap-4 sm:grid-cols-[2fr_1fr_1fr_1fr]">
                        <SearchField
                            action="/admin/events"
                            placeholder="Search title, category or city"
                            defaultValue={query}
                            keep={keep}
                            label="Search events"
                        />
                        {/* Plain links rather than a client-side select: the whole
                            table is server-rendered from the query string, so a
                            filter is a navigation. */}
                        <FilterLinks
                            label="Status"
                            options={["published", "upcoming", "ongoing", "completed", "draft", "cancelled"]}
                            active={sp.status}
                            hrefFor={(v) => `/admin/events${qs({ status: v })}`}
                        />
                        <FilterLinks
                            label="Access"
                            options={["public", "private", "invite_only", "hybrid", "tiered"]}
                            active={sp.access}
                            hrefFor={(v) => `/admin/events${qs({ access: v })}`}
                        />
                        <FilterLinks
                            label="Category"
                            options={categories}
                            active={sp.category}
                            hrefFor={(v) => `/admin/events${qs({ category: v })}`}
                        />
                    </div>

                    <div className="mt-6">
                        <DataTable
                            caption={`${filtered.length} of ${events.length} events`}
                            rows={filtered}
                            columns={columns}
                            getKey={(e) => e.id}
                            empty={
                                <EmptyState
                                    size="sm"
                                    icon={<CalendarDays className="h-5 w-5" />}
                                    title="Nothing matches those filters"
                                    description="Clear a filter, or try a different search."
                                />
                            }
                        />
                    </div>
                </>
            ) : null}

            {tab === "flagged" ? (
                <div className="mt-6 space-y-4">
                    {reports.length === 0 ? (
                        <EmptyState
                            icon={<Flag className="h-5 w-5" />}
                            title="Nothing has been reported"
                            description="Reports raised from an event's public page arrive here."
                        />
                    ) : (
                        reports.map((report) => (
                            <Card key={report.id}>
                                <CardBody>
                                    <div className="flex flex-wrap items-start justify-between gap-4">
                                        <div className="max-w-xl">
                                            <div className="flex items-center gap-2">
                                                <Link
                                                    href={`/events/${report.eventId}`}
                                                    className="font-medium text-ink hover:underline"
                                                >
                                                    {report.eventTitle}
                                                </Link>
                                                <StatusBadge status={report.status} size="sm" />
                                            </div>
                                            <p className="mt-1 text-sm text-ink-soft">{report.reason}</p>
                                            <p className="mt-1 text-2xs uppercase text-ink-faint">
                                                {formatDateMedium(report.createdAt)}
                                                {report.reporterEmail ? ` · ${report.reporterEmail}` : " · anonymous"}
                                            </p>
                                        </div>
                                        {report.status === "open" ? (
                                            <div className="flex items-center gap-2">
                                                {/* "Approve" approves the EVENT, so it
                                                    dismisses the flag. The opposite
                                                    reading would delete an event every
                                                    time somebody complained. */}
                                                <QuickAction
                                                    action={decideReport}
                                                    hidden={{ reportId: report.id, decision: "approve" }}
                                                    label="Approve event"
                                                    className="inline-flex h-8 items-center rounded-lg border border-line-loud bg-paper px-3 text-xs font-semibold text-ink hover:border-ink"
                                                />
                                                <QuickAction
                                                    action={decideReport}
                                                    hidden={{ reportId: report.id, decision: "remove" }}
                                                    // Says what it does: this takes the event down to a
                                                    // draft, which is reversible. Cancelling an event is the
                                                    // stronger statement and lives on the events table, because
                                                    // one report should not tell registered attendees it is off.
                                                    label="Unpublish event"
                                                    className="inline-flex h-8 items-center rounded-lg border border-ink bg-paper px-3 text-xs font-semibold text-ink hover:bg-ink hover:text-ink-invert"
                                                />
                                            </div>
                                        ) : null}
                                    </div>
                                </CardBody>
                            </Card>
                        ))
                    )}
                </div>
            ) : null}

            {tab === "log" ? (
                <div className="mt-6">
                    <Card title="Everything the panel has done">
                        <CardBody>
                            {log.length === 0 ? (
                                <p className="text-sm text-ink-soft">No moderation has happened yet.</p>
                            ) : (
                                <ul className="divide-y divide-line">
                                    {log.map((entry) => (
                                        <li key={entry.id} className="py-3 first:pt-0 last:pb-0">
                                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                                                <span className="flex items-center gap-2 text-sm text-ink">
                                                    <StatusBadge status={entry.action} size="sm" />
                                                    {entry.targetLabel}
                                                    <span className="text-2xs uppercase text-ink-faint">
                                                        {entry.targetType}
                                                    </span>
                                                </span>
                                                <span className="text-2xs uppercase text-ink-faint">
                                                    {formatDateMedium(entry.createdAt)} · {entry.adminEmail}
                                                </span>
                                            </div>
                                            <p className="mt-1 text-sm text-ink-soft">{entry.reason}</p>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </CardBody>
                    </Card>
                </div>
            ) : null}
        </>
    );
}

/** A label and a row of filter links, one of which may be active. */
function FilterLinks({
    label,
    options,
    active,
    hrefFor,
}: {
    label: string;
    options: string[];
    active?: string;
    hrefFor: (value: string | undefined) => string;
}) {
    return (
        <div className="flex flex-col gap-1.5">
            <span className={labelClass}>{label}</span>
            <div className={`${fieldClass} flex flex-wrap gap-1.5 py-1.5`}>
                <Link
                    href={hrefFor(undefined)}
                    className={`rounded-full px-2 py-0.5 text-2xs uppercase ${!active ? "bg-ink text-ink-invert" : "text-ink-soft hover:text-ink"}`}
                >
                    Any
                </Link>
                {options.map((option) => (
                    <Link
                        key={option}
                        href={hrefFor(option)}
                        className={`rounded-full px-2 py-0.5 text-2xs uppercase ${active === option ? "bg-ink text-ink-invert" : "text-ink-soft hover:text-ink"}`}
                    >
                        {option.replace(/_/g, " ")}
                    </Link>
                ))}
            </div>
        </div>
    );
}
