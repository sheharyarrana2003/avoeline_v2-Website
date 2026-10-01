import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CalendarDays, ChevronLeft } from "lucide-react";
import { Card, CardBody } from "@/src/shared_components/ui/Card";
import { DataTable, CellStack, type Column } from "@/src/shared_components/ui/DataTable";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { MetricTile } from "@/src/shared_components/ui/MetricTile";
import { formatDate, formatDateMedium } from "@/src/lib/datetime";
import { eventLifecycle } from "@/src/lib/eventState";
import { accessTypeOf } from "@/src/features/access/access.service";
import { EventService } from "@/src/services/event.service";
import { OrganizerService } from "@/src/services/organizer.service";
import type { EventModel } from "@/src/services/models/event.model";
import { requireAdminArea } from "@/src/features/admin/guard";
import { getOrganizerRow, moderationFor } from "@/src/features/admin/admin.service";
import { ModerationForm, QuickAction } from "@/src/features/admin/components/ModerationForm";
import { setOrganizerStatus } from "@/src/features/admin/actions/organizers.action";
import { listPlans } from "@/src/features/saas/saas.service";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { AdminDeleteForm, AdminEditNameForm } from "@/src/features/admin/components/AdminCrudForms";
import { deleteOrganizerAccount, updateOrganizerAccount } from "@/src/features/admin/actions/tenancy.action";

/**
 * Spec 9.3: "view any organizer's full event list and details for support
 * purposes", and the place suspension is actually decided.
 *
 * The event list reuses `getAllEventsByOrganizer` rather than a new read, and
 * links into the organizer's own event pages instead of rebuilding them — an
 * admin needs to see what the organizer sees, not a second version of it.
 */
export default async function AdminOrganizerDetailPage({
    params,
    searchParams,
}: {
    params: Promise<{ organizerId: string }>;
    searchParams: Promise<{ e?: string; ok?: string }>;
}) {
    const admin = await requireAdminArea("organizers");
    if (!admin) redirect("/admin/signin?next=/admin/organizers");

    const [{ organizerId }, { e, ok }] = await Promise.all([params, searchParams]);
    const row = await getOrganizerRow(organizerId);
    if (!row) notFound();

    const [organizer, events, log, plans] = await Promise.all([
        OrganizerService.getOrganizerById(row.userId).catch(() => null),
        EventService.getAllEventsByOrganizer(row.userId).catch(() => [] as EventModel[]),
        moderationFor(row.organizerId),
        listPlans({ activeOnly: true }),
    ]);

    const suspended = row.accountStatus !== "active";

    const columns: Column<EventModel>[] = [
        {
            key: "event",
            header: "Event",
            cell: (event) => (
                <CellStack
                    primary={
                        <Link
                            href={`/organizer/${row.userId}/events/${event.id}`}
                            className="font-medium text-ink hover:underline"
                        >
                            {event.title || "Untitled event"}
                        </Link>
                    }
                    secondary={`${event.category || "no category"} · ${event.eventType || "no format"}`}
                />
            ),
        },
        {
            key: "when",
            header: "When",
            cell: (event) => (event.schedule?.startDate ? formatDate(event.schedule.startDate) : "—"),
        },
        { key: "access", header: "Access", cell: (event) => accessTypeOf(event) },
        {
            key: "status",
            header: "Status",
            align: "right",
            cell: (event) => (
                <StatusBadge status={eventLifecycle(event.status, event.schedule)} size="sm" />
            ),
        },
    ];

    return (
        <>
            <Link href="/admin/organizers" className="inline-flex items-center gap-1 text-xs text-ink-soft hover:text-ink">
                <ChevronLeft className="h-3.5 w-3.5" />
                All organizers
            </Link>

            <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="font-display text-2xl text-ink">{row.name}</h1>
                    <p className="mt-1 text-sm text-ink-soft">
                        {row.email || "no email on file"}
                        {row.signedUpAt ? ` · joined ${formatDateMedium(row.signedUpAt)}` : ""}
                    </p>
                </div>
                <StatusBadge status={row.accountStatus} />
            </div>
            <FormFeedback error={e} success={ok} />

            <section className="mt-8 grid grid-cols-2 gap-y-8 border-y border-line py-8 sm:grid-cols-4 sm:divide-x sm:divide-line">
                <MetricTile label="Events" value={`${row.eventCount}`} icon={<CalendarDays className="h-4 w-4" />} />
                <MetricTile label="Live now" value={`${row.liveEventCount}`} sublabel="Publicly visible" />
                <MetricTile
                    label="Contact"
                    value={organizer?.contact?.primaryPhone || "—"}
                    sublabel={organizer?.organization?.type || "No organization type"}
                />
                <MetricTile
                    label="Account"
                    value={suspended ? "Suspended" : "Active"}
                    sublabel={suspended ? "Public events hidden" : "Everything visible"}
                />
            </section>

            <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
                <Card title="Their events">
                    <CardBody>
                        <DataTable
                            caption={`${events.length} event${events.length === 1 ? "" : "s"}`}
                            rows={events}
                            columns={columns}
                            getKey={(event) => event.id}
                            empty={
                                <EmptyState
                                    size="sm"
                                    icon={<CalendarDays className="h-5 w-5" />}
                                    title="No events yet"
                                    description="This organizer has not created anything."
                                />
                            }
                        />
                    </CardBody>
                </Card>

                <div className="space-y-8">
                    <Card title="Edit organizer">
                        <CardBody>
                            <AdminEditNameForm
                                action={updateOrganizerAccount}
                                hidden={{ organizerId: row.organizerId, returnTo: `/admin/organizers/${row.organizerId}` }}
                                name={row.name}
                                nameLabel="Display name"
                                extra={
                                    <label className="block text-xs font-medium text-ink">
                                        Plan
                                        <select
                                            name="planKey"
                                            defaultValue={row.planType}
                                            className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink"
                                        >
                                            {plans.map((p) => (
                                                <option key={p.key} value={p.key}>
                                                    {p.name}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                }
                            />
                            {admin.isOwner ? (
                                <div className="mt-4 border-t border-line pt-4">
                                    <AdminDeleteForm
                                        action={deleteOrganizerAccount}
                                        hidden={{ organizerId: row.organizerId }}
                                        label="Delete organizer"
                                        title={`Delete ${row.name}?`}
                                        description="Removes their events, profile, and Supabase Auth login."
                                    />
                                </div>
                            ) : null}
                        </CardBody>
                    </Card>
                    <Card title={suspended ? "Reactivate this account" : "Suspend this account"}>
                        <CardBody>
                            {suspended ? (
                                <>
                                    <p className="pb-3 text-sm text-ink-soft">
                                        Their dashboard and their public events come back immediately, and they can
                                        sign in again.
                                    </p>
                                    <QuickAction
                                        action={setOrganizerStatus}
                                        hidden={{ organizerId: row.organizerId, suspend: "false" }}
                                        label="Reactivate account"
                                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line-loud bg-paper px-3 text-xs font-semibold text-ink hover:border-ink"
                                    />
                                </>
                            ) : (
                                <>
                                    <p className="pb-3 text-sm text-ink-soft">
                                        Their public events disappear from Browse Events and their direct links stop
                                        resolving, they cannot sign in, and they cannot change an event they own.
                                        Tickets already issued to their attendees keep working.
                                    </p>
                                    <ModerationForm
                                        action={setOrganizerStatus}
                                        hidden={{ organizerId: row.organizerId, suspend: "true" }}
                                        reasonLabel="Why are you suspending this account?"
                                        reasonPlaceholder="Repeated fake events reported by attendees."
                                        confirmTitle={`Suspend ${row.name}?`}
                                        confirmDescription={`${row.liveEventCount} live event${row.liveEventCount === 1 ? "" : "s"} will be hidden from the public immediately, and they will not be able to sign in.`}
                                        confirmLabel="Suspend account"
                                        submitLabel="Suspend account"
                                        successMessage="Suspended. Their public events are hidden."
                                    />
                                </>
                            )}
                        </CardBody>
                    </Card>

                    <Card title="Moderation history">
                        <CardBody>
                            {log.length === 0 ? (
                                <p className="text-sm text-ink-soft">Nothing has been done to this account.</p>
                            ) : (
                                <ul className="divide-y divide-line">
                                    {log.map((entry) => (
                                        <li key={entry.id} className="py-3 first:pt-0 last:pb-0">
                                            <div className="flex items-baseline justify-between gap-2">
                                                <StatusBadge status={entry.action} size="sm" />
                                                <span className="text-2xs uppercase text-ink-faint">
                                                    {formatDateMedium(entry.createdAt)}
                                                </span>
                                            </div>
                                            <p className="mt-1 text-sm text-ink-soft">{entry.reason}</p>
                                            <p className="text-2xs uppercase text-ink-faint">{entry.adminEmail}</p>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </CardBody>
                    </Card>
                </div>
            </div>
        </>
    );
}
