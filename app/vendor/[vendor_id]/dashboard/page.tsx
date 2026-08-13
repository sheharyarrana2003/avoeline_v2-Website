import { BookingServices } from "@/src/features/bookings/bookings.service";
import { BookingData } from "@/src/features/bookings/types";
import { EventVendorService } from "@/src/features/event_vendors/event_venders.services";
import { EventService } from "@/src/services/event.service";
import { VendorData } from "@/src/services/models/vendor.model";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDate, parseScheduleDateTime, timeAgo, toDate } from "@/src/lib/datetime";
import { formatCurrency, formatCurrencyCompact } from "@/src/lib/money";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { MetricTile } from "@/src/shared_components/ui/MetricTile";
import { Card, CardBody } from "@/src/shared_components/ui/Card";
import { DataTable, CellStack, type Column } from "@/src/shared_components/ui/DataTable";
import { MiniBars } from "@/src/shared_components/ui/charts/MiniBars";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { buttonClass } from "@/src/lib/ui";
import { CalendarDays, FileText, Inbox, MapPin, Star, Users } from "lucide-react";

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

    // Same shape as the organizer greeting: drop the comma rather than greet someone
    // as "there" when the business name has not been set yet.
    const businessName = v?.businessName?.trim() || "";
    const vendorRating = v?.ratings?.averageRating || 0;
    const totalReviews = v?.ratings?.totalReviews ?? 0;
    const verificationBadges = v?.verification?.verificationBadges || [];
    const isTopRated = Boolean(v?.verification?.verified) && verificationBadges.includes("top_rated");

    // NOT v.stats. Nothing in this repo writes that object — grep it for .update or
    // .set and there is nothing — so every field on it is the model's creation-time
    // default: totalBookings 0, totalRevenue 0, avgResponseTime "Under 2 hours".
    // That is why this card could read "Total bookings 0" while the tile beside it
    // reported four active quotes off the same bookings array. The vendor profile
    // screen already computed these live; the dashboard was reading the dead copy.
    // Everything below comes from raw_bookings, which is already loaded.

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

    // toDate, not new Date(). getAllBookingsOfVendor returns raw documents without
    // running mapToBooking, so completedAt/createdAt are admin-SDK Timestamp objects.
    // new Date(timestamp) yields Invalid Date, every comparison against it is false,
    // and this whole block silently returned zero revenue and an empty request list
    // with no error anywhere. Same bug was in three places on this page.
    const thisMonthRevenue = completedBookings
        .filter((b: any) => {
            const completedDate = toDate(b?.completedAt);
            return completedDate &&
                   completedDate.getMonth() === currentMonth &&
                   completedDate.getFullYear() === currentYear;
        })
        .reduce((sum: number, b: any) => sum + (b?.payment?.totalAmount || 0), 0);

    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentQuoteRequests = raw_bookings
        .filter((b: any) => {
            const created = toDate(b?.createdAt);
            return created && created >= sevenDaysAgo &&
                   ['quote_requested', 'quote_sent'].includes(b?.status?.toLowerCase());
        })
        .sort((a: any, b: any) => (toDate(b?.createdAt)?.getTime() ?? 0) - (toDate(a?.createdAt)?.getTime() ?? 0));

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

    // Live equivalents of the dead vendor.stats fields, from raw_bookings.
    const cancelledBookings = raw_bookings.filter((b: any) => b?.status?.toLowerCase() === "cancelled");
    const lifetimeRevenue = completedBookings.reduce(
        (sum: number, b: any) => sum + (b?.payment?.totalAmount || 0), 0
    );
    const bookingsPerOrganizer: Record<string, number> = {};
    raw_bookings.forEach((b: any) => {
        if (b?.organizerId) bookingsPerOrganizer[b.organizerId] = (bookingsPerOrganizer[b.organizerId] ?? 0) + 1;
    });
    const repeatClients = Object.values(bookingsPerOrganizer).filter((n) => n > 1).length;
    const cancellationRate = raw_bookings.length
        ? Math.round((cancelledBookings.length / raw_bookings.length) * 100)
        : 0;

    // All of the below is already in memory — no extra reads. These are the numbers
    // the tiles previously had no slot for, which is why three tiles said only
    // "Active Quotes 4" and answered nothing.
    const awaitingResponse = activeQuotes.filter(
        (b: any) => b?.status?.toLowerCase() === "quote_requested"
    ).length;
    const negotiatingCount = activeQuotes.filter(
        (b: any) => b?.status?.toLowerCase() === "negotiating"
    ).length;
    const nextServiceDate = upcomingBookings[0]
        ? formatDate(upcomingBookings[0]?.requirements?.serviceDate)
        : null;

    // Age of request is the most useful column in a quotes queue and it was the one
    // thing the old list buried at the end of a bullet-separated sentence. Guest
    // count and service date were loaded on every booking and rendered on none.
    const quoteColumns: Column<any>[] = [
        {
            key: "event",
            header: "Event",
            width: "w-[30%] max-w-0",
            cell: (b) => (
                <CellStack
                    primary={getEventTitle(b?.eventId)}
                    secondary={`${getEventCategory(b?.eventId)} · ${b?.serviceType || "Service"}`}
                />
            ),
        },
        {
            key: "requested",
            header: "Requested",
            cell: (b) => <span className="text-ink-soft">{timeAgo(b?.createdAt)}</span>,
        },
        {
            key: "serviceDate",
            header: "Service date",
            cell: (b) => formatDate(b?.requirements?.serviceDate),
        },
        {
            key: "guests",
            header: "Guests",
            align: "right",
            cell: (b) => b?.requirements?.guestCount ?? "—",
        },
        {
            key: "quote",
            header: "Quote",
            align: "right",
            cell: (b) => {
                const quoted = b?.quote?.vendorQuote?.totalAmount;
                return quoted ? (
                    formatCurrency(quoted, b?.payment?.currency || "PKR")
                ) : (
                    <span className="text-ink-faint">Not quoted</span>
                );
            },
        },
        {
            key: "actions",
            header: "",
            align: "right",
            cell: (b) => (
                <div className="flex justify-end gap-2">
                    <Link href={`/vendor/${vendor_id}/quotes/${b?.bookingId}`} className={buttonClass("ghost", "sm")}>
                        Details
                    </Link>
                    {/* prep-quote, not the /submit route that was linked here — it has never existed. */}
                    <Link
                        href={`/vendor/${vendor_id}/quotes/prep-quote/${b?.bookingId}`}
                        className={buttonClass("primary", "sm")}
                    >
                        Quote
                    </Link>
                </div>
            ),
        },
    ];

    return (
        <div className="px-4 py-8 font-sans text-ink sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl">
                <PageHeader
                    title={businessName ? `Welcome back, ${businessName}` : "Welcome back"}
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
                        <div className="ink-panel on-ink relative overflow-hidden rounded-2xl p-7 shadow-lg">
                            <p className="text-2xs font-medium uppercase text-white/50">Revenue this month</p>
                            <p className="figure mt-3 text-5xl text-white">
                                {formatCurrency(thisMonthRevenue, "PKR", "Rs 0")}
                            </p>
                            <p className="mt-3 flex items-center gap-1.5 text-sm text-white/60">
                                <CalendarDays size={14} aria-hidden="true" />
                                across {confirmedBookings.length} confirmed{" "}
                                {confirmedBookings.length === 1 ? "booking" : "bookings"}
                            </p>

                            {/* The sparkline moved up here from the right rail. It was
                                sitting under a second copy of this same figure, so the
                                rail spent its best slot repeating the hero. */}
                            <MiniBars data={weeklyRevenue} className="mt-6" />
                            <div className="mt-2 flex justify-between text-2xs text-white/45 tabular-nums">
                                <span>{getWeekLabel(0)}</span>
                                <span>{getWeekLabel(6)}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 rounded-2xl border border-line bg-paper shadow-sm sm:grid-cols-3">
                            <MetricTile
                                label="Active quotes"
                                value={String(activeQuotes.length)}
                                icon={<FileText size={14} />}
                                sublabel={
                                    awaitingResponse > 0
                                        ? `${awaitingResponse} waiting on you`
                                        : "Nothing waiting on you"
                                }
                                facts={[{ label: "Negotiating", value: negotiatingCount }]}
                            />
                            <MetricTile
                                label="Confirmed"
                                value={String(confirmedBookings.length)}
                                icon={<CalendarDays size={14} />}
                                sublabel={nextServiceDate ? `Next on ${nextServiceDate}` : "None scheduled"}
                                facts={[
                                    { label: "Completed", value: completedBookings.length },
                                    { label: "Repeat clients", value: repeatClients },
                                ]}
                            />
                            <MetricTile
                                label="Avg rating"
                                // A vendor with no reviews is not a 5.0 vendor. The model
                                // seeds averageRating at 5.0 and only reviewVendor.action
                                // ever recomputes it, so until someone reviews you the
                                // dashboard was advertising a perfect score off a default.
                                value={totalReviews > 0 ? vendorRating.toFixed(1) : "—"}
                                icon={<Star size={14} />}
                                sublabel={
                                    totalReviews === 0
                                        ? "No reviews yet"
                                        : totalReviews === 1
                                          ? "From 1 review"
                                          : `From ${totalReviews} reviews`
                                }
                                facts={[
                                    // avgResponseTime is gone: it is a hardcoded string on the
                                    // model ("Under 2 hours") that nothing computes or updates.
                                    { label: "Cancelled", value: `${cancellationRate}%` },
                                ]}
                            />
                        </div>
                    </section>

                    <div className="grid grid-cols-1 gap-10 xl:grid-cols-[minmax(0,2fr)_minmax(300px,0.95fr)]">
                        <div className="space-y-10">
                            {/* A table rather than the stacked list this was: the rows
                                carry five comparable facts each, and guest count and
                                service date only become scannable in columns. Both were
                                loaded on every row already and shown on none of them. */}
                            <Card
                                title="Recent quote requests"
                                action={
                                    <Link href={`/vendor/${vendor_id}/quotes`} className={buttonClass("ghost", "sm")}>
                                        View all
                                    </Link>
                                }
                            >
                                <div className="pb-1">
                                    <DataTable
                                        caption="Quote requests received in the last seven days"
                                        rows={recentQuoteRequests}
                                        columns={quoteColumns}
                                        getKey={(b: any, i) => b?.bookingId || String(i)}
                                        empty={
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
                                        }
                                    />
                                </div>
                            </Card>

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
                                                        {/* ink-faint = 2.5:1, decoration; the value beside it carries the meaning. */}
                                                        <CalendarDays size={12} className="shrink-0 text-ink-faint" aria-hidden="true" />
                                                        <dt className="sr-only">Service date and time</dt>
                                                        <dd className="tabular-nums">
                                                            {formatDate(booking?.requirements?.serviceDate)}
                                                            {/* Both times were loaded on every booking and shown on
                                                                none — a vendor needs the window, not just the day. */}
                                                            {booking?.requirements?.startTime
                                                                ? ` · ${booking.requirements.startTime}${
                                                                      booking?.requirements?.endTime
                                                                          ? `–${booking.requirements.endTime}`
                                                                          : ""
                                                                  }`
                                                                : ""}
                                                        </dd>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <MapPin size={12} className="shrink-0 text-ink-faint" aria-hidden="true" />
                                                        <dt className="sr-only">Location</dt>
                                                        <dd className="truncate">{booking?.requirements?.location || "Location TBD"}</dd>
                                                    </div>
                                                    {booking?.requirements?.guestCount ? (
                                                        <div className="flex items-center gap-1.5">
                                                            <Users size={12} className="shrink-0 text-ink-faint" aria-hidden="true" />
                                                            <dt className="sr-only">Guests</dt>
                                                            <dd className="tabular-nums">{booking.requirements.guestCount} guests</dd>
                                                        </div>
                                                    ) : null}
                                                </dl>

                                                {/* What the vendor actually banks, after platform commission.
                                                    Loaded on every booking, rendered in no list until now. */}
                                                {booking?.payment?.commission?.vendorReceives ? (
                                                    <p className="mt-3 border-t border-line pt-3 text-xs text-ink-soft">
                                                        You receive{" "}
                                                        <span className="font-medium text-ink tabular-nums">
                                                            {formatCurrency(
                                                                booking.payment.commission.vendorReceives,
                                                                booking?.payment?.currency || "PKR"
                                                            )}
                                                        </span>
                                                    </p>
                                                ) : null}
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

                        {/* The rail used to hold a second copy of the revenue figure and
                            its sparkline, both of which now live in the hero. It spends
                            that slot on the vendor's own track record instead — every
                            field below is on the vendor document this page already
                            fetched, and was rendered only on the profile screen. */}
                        <aside className="space-y-6">
                            <Card title="Your track record">
                                <CardBody>
                                    <dl className="divide-y divide-line">
                                        {[
                                            { label: "Lifetime revenue", value: formatCurrencyCompact(lifetimeRevenue, "PKR", "—") },
                                            { label: "Total bookings", value: raw_bookings.length },
                                            { label: "Completed", value: completedBookings.length },
                                            { label: "Cancelled", value: cancelledBookings.length },
                                            { label: "Repeat clients", value: repeatClients },
                                            { label: "Services listed", value: v?.services?.length ?? 0 },
                                        ].map((row) => (
                                            <div key={row.label} className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
                                                <dt className="text-xs text-ink-soft">{row.label}</dt>
                                                <dd className="text-sm font-medium text-ink tabular-nums">{row.value}</dd>
                                            </div>
                                        ))}
                                    </dl>
                                </CardBody>
                            </Card>

                            <Card title="Profile strength">
                                <CardBody className="space-y-4">
                                    <p className="text-xs text-ink-soft">
                                        {isTopRated
                                            ? "You carry the top-rated badge. Keeping response times short is what holds it."
                                            : "Verified vendors with a full portfolio get more quote requests."}
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        <span className="rounded-full border border-line bg-muted px-2.5 py-1 text-2xs text-ink-soft">
                                            {v?.portfolio?.images?.length ?? 0} portfolio images
                                        </span>
                                        <span className="rounded-full border border-line bg-muted px-2.5 py-1 text-2xs text-ink-soft">
                                            {v?.pricingPackages?.length ?? 0} packages
                                        </span>
                                        <span className="rounded-full border border-line bg-muted px-2.5 py-1 text-2xs text-ink-soft">
                                            {totalReviews} review{totalReviews === 1 ? "" : "s"}
                                        </span>
                                    </div>
                                    <Link href={`/vendor/${vendor_id}/profile`} className={buttonClass("secondary", "sm")}>
                                        Edit profile
                                    </Link>
                                </CardBody>
                            </Card>
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
                // toDate: see the note on thisMonthRevenue. These are Timestamps.
                const completed = toDate(b?.completedAt);
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
