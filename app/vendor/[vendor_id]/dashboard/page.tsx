import { BookingServices } from "@/src/features/bookings/bookings.service";
import { BookingData } from "@/src/features/bookings/types";
import { EventVendorService } from "@/src/features/event_vendors/event_venders.services";
import { EventService } from "@/src/services/event.service";
import { VendorData } from "@/src/services/models/vendor.model";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDate, parseScheduleDateTime, timeAgo } from "@/src/lib/datetime";
import { formatCurrency } from "@/src/lib/money";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { StatCard_dashboard } from "@/src/shared_components/organizer/StatCard_dashboard";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { buttonClass } from "@/src/lib/ui";
import { CalendarDays, FileText, Inbox, MapPin, Star, Wallet } from "lucide-react";

/**
 * Seven weekly totals as bars. Decoration on top of the figure printed above it,
 * so the bars are gray-300 (1.6:1) and the chart is hidden from assistive tech —
 * the number, not the silhouette, is the content.
 */
function MiniBarChart({ data }: { data: number[] }) {
    const max = Math.max(...data, 1);
    return (
        <div className="flex h-16 items-end gap-1.5 pt-2" aria-hidden="true">
            {data.map((val, i) => (
                <div
                    key={i}
                    className={`flex-1 rounded-t-xs ${val === max && val > 0 ? "bg-accent" : "bg-gray-300"}`}
                    style={{ height: `${(val / max) * 100}%`, minHeight: "6px" }}
                />
            ))}
        </div>
    );
}

export default async function VendorDashboardPage({
    params
}: {
    params: Promise<{ vendor_id: string }>
}) {
    const { vendor_id } = await params;

    const v: VendorData | null = await EventVendorService.getVendorById(vendor_id);

    if (!v) {
        notFound();
    }

    const raw_bookings: BookingData[] = (await BookingServices.getAllBookingsOfVendor(vendor_id)) || [];

    const businessName = v?.businessName || "there";
    const vendorRating = v?.ratings?.averageRating || 0;
    const verificationBadges = v?.verification?.verificationBadges || [];
    const isTopRated = Boolean(v?.verification?.verified) && verificationBadges.includes("top_rated");

    const eventIds = [...new Set(raw_bookings.map((b: any) => b?.eventId).filter(Boolean))];

    const eventsMap: Record<string, any> = {};
    await Promise.all(eventIds.map(async (eventId) => {
        try {
            const event = await EventService.getEventByID(eventId);
            if (event) {
                eventsMap[eventId] = event;
            }
        } catch {
            // Event not found fallback
        }
    }));

    const getEventTitle = (eventId: string) => eventsMap[eventId]?.title || eventId;

    const getEventCategory = (eventId: string) => {
        const event = eventsMap[eventId];
        if (!event) return "Event";
        return event?.category || event?.eventType || "Event";
    };

    const activeQuotes = raw_bookings.filter((b: any) =>
        ['quote_requested', 'quote_sent', 'negotiating'].includes(b?.status?.toLowerCase())
    );

    const confirmedBookings = raw_bookings.filter((b: any) =>
        ['confirmed', 'in_progress'].includes(b?.status?.toLowerCase())
    );

    const completedBookings = raw_bookings.filter((b: any) =>
        b?.status?.toLowerCase() === 'completed'
    );

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const thisMonthRevenue = completedBookings
        .filter((b: any) => {
            const completedDate = b?.completedAt ? new Date(b.completedAt) : null;
            return completedDate &&
                   completedDate.getMonth() === currentMonth &&
                   completedDate.getFullYear() === currentYear;
        })
        .reduce((sum: number, b: any) => sum + (b?.payment?.totalAmount || 0), 0);

    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentQuoteRequests = raw_bookings
        .filter((b: any) => {
            const created = b?.createdAt ? new Date(b.createdAt) : null;
            return created && created >= sevenDaysAgo &&
                   ['quote_requested', 'quote_sent'].includes(b?.status?.toLowerCase());
        })
        .sort((a: any, b: any) => new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime());

    const upcomingBookings = confirmedBookings
        .filter((b: any) => {
            const serviceDate = parseScheduleDateTime(b?.requirements?.serviceDate, "");
            return serviceDate && serviceDate >= now;
        })
        .sort((a: any, b: any) => {
            const dateA = parseScheduleDateTime(a?.requirements?.serviceDate, "")?.getTime() ?? 0;
            const dateB = parseScheduleDateTime(b?.requirements?.serviceDate, "")?.getTime() ?? 0;
            return dateA - dateB;
        })
        .slice(0, 4);

    const weeklyRevenue = computeWeeklyRevenue(completedBookings);

    return (
        <div className="px-4 py-8 font-sans text-ink sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl">
                <PageHeader
                    title={`Welcome back, ${businessName}`}
                    description="Track your quote requests, confirmed bookings and monthly revenue."
                    actions={
                        <>
                            {isTopRated && (
                                <span className="inline-flex h-11 items-center gap-1.5 rounded-full border border-success-line bg-success-soft px-4 text-2xs font-bold uppercase text-success">
                                    <Star size={12} aria-hidden="true" />
                                    Top rated vendor
                                </span>
                            )}
                            <Link href={`/vendor/${vendor_id}/quotes`} className={buttonClass("primary", "lg")}>
                                <FileText size={16} />
                                Review quotes
                            </Link>
                        </>
                    }
                />

                <div className="space-y-10">
                    {/* Same shape as the organizer dashboard: one figure carries the
                        screen and the rest support it. Revenue leads because it is what a
                        vendor opens this page to find out. */}
                    <section className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,2fr)]">
                        <div className="ink-panel relative overflow-hidden rounded-2xl p-7 shadow-lg">
                            <p className="text-2xs font-medium uppercase text-white/50">Revenue this month</p>
                            <p className="figure mt-3 text-5xl text-white">
                                {formatCurrency(thisMonthRevenue, "PKR", "Rs 0")}
                            </p>
                            <p className="mt-3 flex items-center gap-1.5 text-sm text-white/60">
                                <CalendarDays size={14} aria-hidden="true" />
                                across {confirmedBookings.length} confirmed{" "}
                                {confirmedBookings.length === 1 ? "booking" : "bookings"}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 rounded-2xl border border-line bg-paper shadow-sm sm:grid-cols-3">
                            <StatCard_dashboard title="Active Quotes" value={String(activeQuotes.length)} icon={<FileText size={14} />} />
                            <StatCard_dashboard title="Confirmed" value={String(confirmedBookings.length)} icon={<CalendarDays size={14} />} />
                            <StatCard_dashboard title="Avg Rating" value={vendorRating ? vendorRating.toFixed(1) : "—"} icon={<Star size={14} />} />
                        </div>
                    </section>

                    <div className="grid grid-cols-1 gap-10 xl:grid-cols-[minmax(0,2fr)_minmax(300px,0.95fr)]">
                        <div className="space-y-10">
                            <section>
                                <div className="mb-4 flex items-end justify-between border-b border-line pb-3">
                                    <h2 className="font-display text-xl text-ink">Recent quote requests</h2>
                                    <Link href={`/vendor/${vendor_id}/quotes`} className={buttonClass("ghost", "sm")}>
                                        View all
                                    </Link>
                                </div>

                                {recentQuoteRequests.length > 0 ? (
                                    <ul className="divide-y divide-line">
                                        {recentQuoteRequests.map((booking: any, index: number) => {
                                            const quoted = booking?.quote?.vendorQuote?.totalAmount;
                                            return (
                                                <li
                                                    key={booking?.bookingId || index}
                                                    className="-mx-3 flex flex-col gap-3 rounded-lg px-3 py-4 transition-colors hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between"
                                                >
                                                    <div>
                                                        <p className="text-sm font-medium text-ink">{getEventTitle(booking?.eventId)}</p>
                                                        <p className="mt-0.5 text-xs text-ink-soft tabular-nums">
                                                            {getEventCategory(booking?.eventId)} • {quoted ? formatCurrency(quoted, booking?.payment?.currency || "PKR") : "Not quoted yet"} • {timeAgo(booking?.createdAt)}
                                                        </p>
                                                    </div>

                                                    <div className="flex shrink-0 items-center gap-2">
                                                        <Link
                                                            href={`/vendor/${vendor_id}/quotes/${booking?.bookingId}`}
                                                            className={buttonClass("ghost", "sm")}
                                                        >
                                                            Details
                                                        </Link>
                                                        {/* prep-quote, not the /submit route that was linked here — it has never existed. */}
                                                        <Link
                                                            href={`/vendor/${vendor_id}/quotes/prep-quote/${booking?.bookingId}`}
                                                            className={buttonClass("primary", "sm")}
                                                        >
                                                            Prepare quote
                                                        </Link>
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                ) : (
                                    <EmptyState
                                        size="sm"
                                        icon={<Inbox size={22} />}
                                        title="No quote requests this week"
                                        description="Organizers find you through your service catalogue — keeping it current is what brings requests in."
                                        action={
                                            <Link href={`/vendor/${vendor_id}/services`} className={buttonClass("secondary", "sm")}>
                                                Manage services
                                            </Link>
                                        }
                                    />
                                )}
                            </section>

                            <section>
                                <h2 className="mb-4 border-b border-line pb-3 font-display text-xl text-ink">Upcoming bookings</h2>

                                {upcomingBookings.length > 0 ? (
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        {upcomingBookings.map((booking: any, index: number) => (
                                            <Link
                                                key={booking?.bookingId || index}
                                                href={`/vendor/${vendor_id}/bookings/${booking?.bookingId}`}
                                                className="lift flex flex-col justify-between rounded-2xl border border-line bg-paper p-5 shadow-xs"
                                            >
                                                <div className="mb-3 flex items-center justify-between gap-2">
                                                    <StatusBadge status={booking?.status} size="sm" />
                                                    {/* ink-soft = 4.75:1, not ink-faint: a booking id is text a
                                                        vendor quotes back on the phone, not decoration. */}
                                                    <span className="text-2xs text-ink-soft tabular-nums">{booking?.bookingId}</span>
                                                </div>

                                                <h3 className="text-sm font-medium text-ink">{getEventTitle(booking?.eventId)}</h3>

                                                <dl className="mt-3 space-y-1 text-xs text-ink-soft">
                                                    <div className="flex items-center gap-1.5">
                                                        {/* gray-400 = 2.5:1, decoration; the value beside it carries the meaning. */}
                                                        <CalendarDays size={12} className="shrink-0 text-gray-400" aria-hidden="true" />
                                                        <dt className="sr-only">Service date</dt>
                                                        <dd className="tabular-nums">{formatDate(booking?.requirements?.serviceDate)}</dd>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <MapPin size={12} className="shrink-0 text-gray-400" aria-hidden="true" />
                                                        <dt className="sr-only">Location</dt>
                                                        <dd>{booking?.requirements?.location || "Location TBD"}</dd>
                                                    </div>
                                                </dl>
                                            </Link>
                                        ))}
                                    </div>
                                ) : (
                                    <EmptyState
                                        size="sm"
                                        icon={<CalendarDays size={22} />}
                                        title="Nothing booked yet"
                                        description="Confirmed bookings with a future service date show up here."
                                    />
                                )}
                            </section>
                        </div>

                        <aside>
                            <section>
                                <h2 className="mb-4 border-b border-line pb-3 font-display text-xl text-ink">Revenue</h2>
                                <p className="text-xs font-medium uppercase text-ink-soft">Total this month</p>
                                <p className="mt-1 font-display text-3xl text-ink tabular-nums">
                                    {formatCurrency(thisMonthRevenue, "PKR", "Rs 0")}
                                </p>

                                <MiniBarChart data={weeklyRevenue} />

                                <div className="mt-2 flex justify-between text-2xs text-ink-soft tabular-nums">
                                    <span>{getWeekLabel(0)}</span>
                                    <span>{getWeekLabel(6)}</span>
                                </div>
                            </section>
                        </aside>
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- Helper to compute weekly revenue from completed bookings ---
function computeWeeklyRevenue(completedBookings: any[]): number[] {
    const now = new Date();
    const weeks: number[] = [];

    for (let i = 6; i >= 0; i--) {
        const weekStart = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
        const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

        const weekRevenue = completedBookings
            .filter((b: any) => {
                const completed = b?.completedAt ? new Date(b.completedAt) : null;
                return completed && completed >= weekStart && completed < weekEnd;
            })
            .reduce((sum: number, b: any) => sum + (b?.payment?.totalAmount || 0), 0);

        weeks.push(weekRevenue);
    }

    return weeks;
}

// --- Helper to get week label for chart ---
function getWeekLabel(weeksAgo: number): string {
    const date = new Date();
    date.setDate(date.getDate() - (6 - weeksAgo) * 7);
    return formatDate(date);
}
