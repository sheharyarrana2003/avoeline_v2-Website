import { CalendarDays, Flag, LifeBuoy, ListChecks, ShieldCheck, Store, Users } from "lucide-react";
import Link from "next/link";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { Card, CardBody } from "@/src/shared_components/ui/Card";
import { MetricTile } from "@/src/shared_components/ui/MetricTile";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { ConfirmSubmit } from "@/src/shared_components/ui/ConfirmDialog";
import { buttonClass } from "@/src/lib/ui";
import { AuthService } from "@/src/features/auth/authService";
import { promoteToAdminAction } from "@/src/features/auth/actions/promoteToAdmin.action";
import { getPlatformTotals } from "@/src/features/admin/platform.service";
import { requireAdminArea } from "@/src/features/admin/guard";
import { holdsArea, queueSummary } from "@/src/features/admin/types";
import { listEventReports, listSupportTickets } from "@/src/features/admin/admin.service";
import EventsPerWeekChart from "@/src/features/admin/components/EventsPerWeekChart.lazy";

/**
 * The platform dashboard (spec 9.2).
 *
 * The four summary cards were already here before this module; the chart is
 * new only in the sense of being rendered — `getPlatformTotals` has been
 * bucketing events into ISO weeks all along and nothing displayed it.
 *
 * The two queue counts below are shown only to an admin who holds the area, so
 * a support admin is not told how many events are flagged.
 */
export default async function AdminDashboardPage({
    searchParams,
}: {
    searchParams: Promise<{ e?: string }>;
}) {
    const sp = await searchParams;
    const admin = await requireAdminArea();
    if (!admin) return null; // The layout has already redirected.

    const [totals, viewer] = await Promise.all([getPlatformTotals(), AuthService.getCurrentUser()]);

    // Only the bootstrap route is offered the promotion, and the offer
    // disappears the moment the stored role is real.
    const viaEnvBootstrap = admin.viaBootstrap;

    const [reports, tickets] = await Promise.all([
        holdsArea(admin, "events") ? listEventReports() : Promise.resolve([]),
        holdsArea(admin, "support") ? listSupportTickets() : Promise.resolve([]),
    ]);
    const openReports = reports.filter((r) => r.status === "open").length;

    return (
        <>
            <PageHeader
                title="Platform dashboard"
                description="Everything on Avoeline at a glance, and the queues waiting on somebody."
            />

            {sp.e ? <FormFeedback error={sp.e} className="mb-6" /> : null}

            {viaEnvBootstrap ? (
                <Card tone="raised" className="mb-6">
                    <CardBody>
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="max-w-xl">
                                <h2 className="flex items-center gap-2 font-display text-base text-ink">
                                    <ShieldCheck size={16} aria-hidden="true" />
                                    You are here on the bootstrap allowlist
                                </h2>
                                <p className="mt-1 text-sm text-ink-soft">
                                    This account is <strong>{viewer?.userType || "not an admin"}</strong>; access is coming from
                                    <code className="mx-1 rounded bg-muted px-1 text-2xs">PLATFORM_ADMIN_EMAILS</code>.
                                    Promoting makes it a real owner account, after which that variable can go. It{" "}
                                    <strong>replaces</strong> the account&apos;s current role — promote a dedicated account,
                                    not one that runs events. To add an admin without touching this account, use{" "}
                                    <Link href="/admin/admins" className="font-medium text-ink hover:underline">
                                        Admins
                                    </Link>
                                    .
                                </p>
                            </div>
                            <form action={promoteToAdminAction}>
                                <ConfirmSubmit
                                    title="Make this account a platform owner?"
                                    description={`${viewer?.email || "This account"} becomes userType "admin" and STOPS being ${viewer?.userType || "its current role"} — it will lose access to those pages. You will be signed out so the new role takes effect, because the session only picks up a role change at login.`}
                                    confirmLabel="Promote and sign out"
                                    className={buttonClass("primary")}
                                >
                                    Promote this account
                                </ConfirmSubmit>
                            </form>
                        </div>
                    </CardBody>
                </Card>
            ) : null}

            <section className="mb-8 grid grid-cols-2 gap-y-8 border-y border-line py-8 sm:grid-cols-4 sm:divide-x sm:divide-line">
                <MetricTile
                    label="Organizers"
                    value={`${totals.organizers}`}
                    icon={<Users className="h-4 w-4" />}
                    sublabel="Accounts on the platform"
                />
                <MetricTile
                    label="Events"
                    value={`${totals.events}`}
                    icon={<CalendarDays className="h-4 w-4" />}
                    sublabel={`${totals.liveEvents} live · ${totals.pastEvents} past`}
                />
                <MetricTile
                    label="Registrations"
                    value={`${totals.registrations}`}
                    icon={<ListChecks className="h-4 w-4" />}
                    sublabel={`${totals.certificates} certificates issued`}
                />
                <MetricTile
                    label="Vendors"
                    value={`${totals.vendors}`}
                    icon={<Store className="h-4 w-4" />}
                    sublabel="Listed on the marketplace"
                />
            </section>

            <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
                <Card title="New events per week">
                    <CardBody>
                        <p className="pb-3 text-xs text-ink-soft">
                            Events created in each of the last twelve weeks, by the week they were created rather
                            than the week they run.
                        </p>
                        <EventsPerWeekChart data={totals.eventsPerWeek} />
                    </CardBody>
                </Card>

                <Card title="Waiting on somebody">
                    <CardBody>
                        <ul className="divide-y divide-line">
                            {holdsArea(admin, "events") ? (
                                <li className="flex items-center justify-between gap-3 py-3 first:pt-0">
                                    <span className="flex items-center gap-2 text-sm text-ink">
                                        <Flag className="h-4 w-4" aria-hidden="true" />
                                        Flagged events
                                    </span>
                                    <Link href="/admin/events?tab=flagged" className="text-sm font-medium text-ink hover:underline tabular-nums">
                                        {openReports || "none"}
                                    </Link>
                                </li>
                            ) : null}
                            {holdsArea(admin, "support") ? (
                                <li className="flex items-center justify-between gap-3 py-3">
                                    <span className="flex items-center gap-2 text-sm text-ink">
                                        <LifeBuoy className="h-4 w-4" aria-hidden="true" />
                                        Support tickets
                                    </span>
                                    <Link href="/admin/support" className="text-sm font-medium text-ink hover:underline">
                                        {queueSummary(tickets)}
                                    </Link>
                                </li>
                            ) : null}
                            {holdsArea(admin, "categories") ? (
                                <li className="flex items-center justify-between gap-3 py-3 last:pb-0">
                                    <span className="flex items-center gap-2 text-sm text-ink">
                                        <ListChecks className="h-4 w-4" aria-hidden="true" />
                                        Category requests
                                    </span>
                                    <Link href="/admin/categories?tab=requests" className="text-sm font-medium text-ink hover:underline">
                                        Open the queue
                                    </Link>
                                </li>
                            ) : null}
                        </ul>
                        {!holdsArea(admin, "events") && !holdsArea(admin, "support") && !holdsArea(admin, "categories") ? (
                            <p className="text-sm text-ink-soft">
                                You hold no queues. An owner can widen your access from the Admins page.
                            </p>
                        ) : null}
                    </CardBody>
                </Card>
            </div>
        </>
    );
}
