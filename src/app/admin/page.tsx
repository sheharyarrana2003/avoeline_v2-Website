import { CalendarDays, Flag, LifeBuoy, ListChecks, ShieldCheck, Store, Users, Building2, ExternalLink, ArrowRight } from "lucide-react";
import Link from "next/link";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { Card, CardBody } from "@/src/shared_components/ui/Card";
import { MetricTile } from "@/src/shared_components/ui/MetricTile";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { ConfirmSubmit } from "@/src/shared_components/ui/ConfirmDialog";
import { buttonClass } from "@/src/lib/ui";
import { AuthService } from "@/src/features/auth/authService";
import { promoteToAdminAction } from "@/src/features/auth/actions/promoteToAdmin.action";
import { getPlatformTotals, getSupportEntities } from "@/src/features/admin/platform.service";
import { requireAdminArea } from "@/src/features/admin/guard";
import { holdsArea, queueSummary } from "@/src/features/admin/types";
import { listEventReports, listSupportTickets } from "@/src/features/admin/admin.service";
import EventsPerWeekChart from "@/src/features/admin/components/EventsPerWeekChart.lazy";

/**
 * The platform dashboard (spec 9.2).
 */
export default async function AdminDashboardPage({
    searchParams,
}: {
    searchParams: Promise<{ e?: string }>;
}) {
    const sp = await searchParams;
    const admin = await requireAdminArea();
    if (!admin) return null; // The layout has already redirected.

    const [totals, viewer, supportEntities] = await Promise.all([
        getPlatformTotals(),
        AuthService.getCurrentUser(),
        getSupportEntities(),
    ]);

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
                    label="Organizations"
                    value={`${totals.totalOrgs}`}
                    icon={<Building2 className="h-4 w-4" />}
                    sublabel={`${totals.departmentsCount} depts · ${totals.clubsCount} clubs`}
                />
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

            <section className="mt-10 rounded-2xl border border-line bg-paper p-6 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
                    <div>
                        <h2 className="font-display text-lg text-ink flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-primary" />
                            Role Hierarchy & Support View (Platform Admin)
                        </h2>
                        <p className="text-xs text-ink-soft mt-1">
                            As a Platform Admin, you possess global oversight. Enter any department or organizer account below to inspect their environment, manage permissions, or assist with troubleshooting.
                        </p>
                    </div>
                    <Link
                        href="/admin/orgs"
                        className={buttonClass("secondary", "sm")}
                    >
                        View All Orgs & Hierarchy
                    </Link>
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {supportEntities.length === 0 ? (
                        <p className="col-span-2 text-xs text-ink-soft py-4 text-center">
                            No active departments or organizers found.
                        </p>
                    ) : (
                        supportEntities.map((entity) => (
                            <div
                                key={`${entity.type}-${entity.id}`}
                                className="flex items-center justify-between p-4 rounded-xl border border-line/70 bg-muted/20 hover:bg-muted/50 transition"
                            >
                                <div className="min-w-0 flex-1 pr-4">
                                    <div className="flex items-center gap-2">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-2xs font-semibold uppercase ${entity.type === "department" ? "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"}`}>
                                            {entity.type}
                                        </span>
                                        <span className="truncate text-sm font-medium text-ink">
                                            {entity.name}
                                        </span>
                                    </div>
                                    <p className="text-xs text-ink-soft truncate mt-1">
                                        {entity.detail}
                                    </p>
                                </div>

                                <Link
                                    href={entity.targetHref}
                                    className="flex items-center gap-1.5 shrink-0 rounded-lg border border-line bg-paper px-3 py-1.5 text-xs font-medium text-ink shadow-2xs hover:bg-muted hover:text-primary transition"
                                >
                                    <span>Enter View</span>
                                    <ExternalLink className="h-3.5 w-3.5" />
                                </Link>
                            </div>
                        ))
                    )}
                </div>
            </section>
        </>
    );
}
