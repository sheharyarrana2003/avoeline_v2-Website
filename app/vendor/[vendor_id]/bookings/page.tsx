// app/vendor/[vendor_id]/bookings/page.tsx
// Fully Server Component

import { BookingServices } from "@/src/features/bookings/bookings.service";
import { EventVendorService } from "@/src/features/event_vendors/event_venders.services";
import { EventService } from "@/src/services/event.service";
import { OrganizerService } from "@/src/services/organizer.service";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDate, parseScheduleDateTime, toDate } from "@/src/lib/datetime";
import { formatCurrency } from "@/src/lib/money";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { MetricTile } from "@/src/shared_components/ui/MetricTile";
import { Card } from "@/src/shared_components/ui/Card";
import { FilterTabs } from "@/src/shared_components/ui/FilterTabs";
import { DataTable, CellStack, type Column } from "@/src/shared_components/ui/DataTable";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { buttonClass } from "@/src/lib/ui";
import { SearchField } from "@/src/shared_components/ui/SearchField";
import { matchesQuery, normalizeQuery } from "@/src/lib/search";
import {
    Building2,
    CalendarCheck,
    CalendarDays,
    CalendarClock,
    Camera,
    ClipboardList,
    Mic,
    Music,
    Package,
    Sparkles,
    UtensilsCrossed,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// --- Helper Functions ---
// Lucide, not emoji: a black-and-white product can't carry meaning in a colour
// glyph, and the fallback box renders differently on every platform.
const SERVICE_ICONS: Record<string, LucideIcon> = {
    catering: UtensilsCrossed,
    av_equipment: Mic,
    decoration: Sparkles,
    photography: Camera,
    venues: Building2,
    music: Music,
    event_management: ClipboardList,
};

const getServiceIcon = (serviceType: string): LucideIcon =>
    SERVICE_ICONS[serviceType?.toLowerCase()] || Package;

const getServiceName = (serviceType: string) => {
    const names: Record<string, string> = {
        'catering': 'Catering Services',
        'av_equipment': 'AV & Tech Support',
        'decoration': 'Decor & Theme',
        'photography': 'Photography',
        'venues': 'Venue',
        'music': 'Music',
        'event_management': 'Event Management',
    };
    return names[serviceType?.toLowerCase()] || serviceType || 'Service';
};

export default async function VendorBookingsPage({
    params,
    searchParams
}: {
    params: Promise<{ vendor_id: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const { vendor_id } = await params;
    const awaitedSearchParams = await searchParams;

    // Get filter from URL
    const filter = (awaitedSearchParams?.filter as string) || 'all';

    // Fetch vendor data
    const vendor = await EventVendorService.getVendorById(vendor_id);
    if (!vendor) {
        notFound();
    }

    // Fetch all bookings for this vendor
    const raw_bookings = await BookingServices.getAllBookingsOfVendor(vendor_id) || [];

    // Collect unique event IDs
    const eventIds = [...new Set(raw_bookings.map((b: any) => b?.eventId).filter(Boolean))];

    // Fetch all events dynamically
    const eventsMap: Record<string, any> = {};
    await Promise.all(eventIds.map(async (eventId) => {
        try {
            const event = await EventService.getEventByID(eventId);
            if (event) eventsMap[eventId] = event;
        } catch {
            // Event not found
        }
    }));

    // Organizer names were a hardcoded three-entry map (org_001 -> "TechVerse"),
    // so every real organizer rendered as a raw id and three fictional ones
    // rendered as fact. Resolve them from the organizer collection instead.
    const organizerIds = [...new Set(raw_bookings.map((b: any) => b?.organizerId).filter(Boolean))] as string[];
    const organizersMap: Record<string, string> = {};
    await Promise.all(organizerIds.map(async (id) => {
        try {
            const org = await OrganizerService.getOrganizerById(id);
            // mapToOrganizer answers a missing document with a placeholder named
            // "unknown" rather than null, so an absent organizer would otherwise
            // render as the literal word.
            const name = org?.organization?.name;
            if (name && name !== "unknown") organizersMap[id] = name;
        } catch {
            // Organizer not found — falls back to the neutral label below.
        }
    }));

    const getEventTitle = (eventId: string) => eventsMap[eventId]?.title || eventId;
    const getOrganizerName = (organizerId: string) => organizersMap[organizerId] || "Organizer";

    // Filter bookings
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const activeStatuses = ['confirmed', 'in_progress'];

    const allBookings = raw_bookings.filter((b: any) =>
        ['confirmed', 'in_progress', 'completed', 'cancelled'].includes(b?.status?.toLowerCase())
    );

    const activeBookings = allBookings.filter((b: any) =>
        activeStatuses.includes(b?.status?.toLowerCase())
    );

    const upcomingThisWeek = activeBookings.filter((b: any) => {
        // serviceDate is stored DD/MM/YYYY — parse with the shared helper.
        const serviceDate = parseScheduleDateTime(b?.requirements?.serviceDate, "");
        return serviceDate && serviceDate >= startOfWeek && serviceDate <= endOfWeek;
    });

    const completedThisMonth = allBookings.filter((b: any) => {
        if (b?.status?.toLowerCase() !== 'completed') return false;
        // toDate: getAllBookingsOfVendor skips mapToBooking, so completedAt is a raw
        // Timestamp and new Date() on it silently yields Invalid Date.
        const completedDate = toDate(b?.completedAt);
        return completedDate &&
               completedDate.getMonth() === now.getMonth() &&
               completedDate.getFullYear() === now.getFullYear();
    });

    // Apply tab filter
    const displayBookings = allBookings
        .filter((b: any) => matches(b) && (filter === 'all' || b?.status?.toLowerCase() === filter))
        .sort((a: any, b: any) => {
        const dateA = parseScheduleDateTime(a?.requirements?.serviceDate, "")?.getTime() ?? 0;
        const dateB = parseScheduleDateTime(b?.requirements?.serviceDate, "")?.getTime() ?? 0;
        return dateA - dateB;
    });

    const query = normalizeQuery(awaitedSearchParams?.q);
    const matches = (b: any) =>
        matchesQuery(query, [
            getEventTitle(b?.eventId),
            getOrganizerName(b?.organizerId),
            b?.serviceType,
            b?.requirements?.location,
            b?.status,
        ]);

    const countOf = (id: string) =>
        allBookings.filter((b: any) => matches(b) && (id === "all" || b?.status?.toLowerCase() === id)).length;

    const tabs = [
        { value: "all", label: "All" },
        { value: "confirmed", label: "Confirmed" },
        { value: "in_progress", label: "In progress" },
        { value: "completed", label: "Completed" },
        { value: "cancelled", label: "Cancelled" },
    ].map((t) => ({ ...t, href: `/vendor/${vendor_id}/bookings?filter=${t.value}${query ? `&q=${encodeURIComponent(query)}` : ""}`, count: countOf(t.value) }));

    // Every field below was already on the booking documents this page fetched and
    // none of them reached the card: the guest count, the time window, what the
    // vendor actually receives after commission, and whether the contract is signed.
    const columns: Column<any>[] = [
        {
            key: "event",
            header: "Event",
            width: "w-[22%] max-w-0",
            cell: (b) => (
                <Link
                    href={`/vendor/${vendor_id}/bookings/${b?.bookingId}`}
                    className="group/row block rounded-xs focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                    <CellStack
                        primary={<span className="group-hover/row:underline">{getEventTitle(b?.eventId)}</span>}
                        secondary={getOrganizerName(b?.organizerId)}
                    />
                </Link>
            ),
        },
        {
            key: "service",
            header: "Service",
            cell: (b) => {
                const ServiceIcon = getServiceIcon(b?.serviceType || "");
                return (
                    <span className="flex items-center gap-2">
                        <ServiceIcon size={14} className="shrink-0 text-ink-faint" aria-hidden="true" />
                        {getServiceName(b?.serviceType || "")}
                    </span>
                );
            },
        },
        {
            key: "when",
            header: "When",
            cell: (b) => (
                <CellStack
                    primary={<span className="font-normal tabular-nums">{formatDate(b?.requirements?.serviceDate)}</span>}
                    secondary={
                        b?.requirements?.startTime
                            ? `${b.requirements.startTime}${b?.requirements?.endTime ? `–${b.requirements.endTime}` : ""}`
                            : undefined
                    }
                />
            ),
        },
        {
            key: "where",
            header: "Where",
            width: "w-[16%] max-w-0",
            cell: (b) => (
                <CellStack
                    primary={<span className="font-normal">{b?.requirements?.location || "Location TBD"}</span>}
                    secondary={b?.requirements?.guestCount ? `${b.requirements.guestCount} guests` : undefined}
                />
            ),
        },
        { key: "status", header: "Status", cell: (b) => <StatusBadge status={b?.status || "unknown"} size="sm" /> },
        {
            key: "amount",
            header: "Total",
            align: "right",
            cell: (b) =>
                formatCurrency(
                    b?.quote?.vendorQuote?.totalAmount || b?.payment?.totalAmount || 0,
                    b?.payment?.currency || "PKR"
                ),
        },
        {
            key: "receives",
            header: "You receive",
            align: "right",
            cell: (b) =>
                b?.payment?.commission?.vendorReceives ? (
                    formatCurrency(b.payment.commission.vendorReceives, b?.payment?.currency || "PKR")
                ) : (
                    <span className="text-ink-faint">—</span>
                ),
        },
    ];

    return (
        <div className="px-4 py-8 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl">
                <PageHeader
                    title="Bookings"
                    description="Every service you have been confirmed for, in service-date order."
                />

                <section className="mb-8 grid grid-cols-1 rounded-2xl border border-line bg-paper shadow-sm sm:grid-cols-3">
                    <MetricTile
                        label="Active"
                        value={String(activeBookings.length)}
                        icon={<CalendarCheck size={14} />}
                        sublabel="Confirmed or in progress"
                    />
                    <MetricTile
                        label="This week"
                        value={String(upcomingThisWeek.length)}
                        icon={<CalendarClock size={14} />}
                        sublabel="Service dates in the next 7 days"
                    />
                    <MetricTile
                        label="Completed this month"
                        value={String(completedThisMonth.length)}
                        icon={<CalendarDays size={14} />}
                        sublabel={`${allBookings.length} bookings all time`}
                    />
                </section>

                <div className="mb-4 flex justify-end">
                    <SearchField
                        action={`/vendor/${vendor_id}/bookings`}
                        placeholder="Search event, organizer, service"
                        defaultValue={query}
                        keep={{ filter: filter === "all" ? undefined : filter }}
                    />
                </div>

                <FilterTabs tabs={tabs} activeValue={filter} label="Filter bookings" />

                <Card>
                    <DataTable
                        caption={`${filter === "all" ? "All" : filter} bookings, in service-date order`}
                        rows={displayBookings}
                        columns={columns}
                        getKey={(b: any, i) => b?.bookingId || String(i)}
                        empty={
                            <div className="p-6">
                                <EmptyState
                                    icon={<CalendarDays size={26} />}
                                    title={
                                        filter === "all"
                                            ? "No bookings yet"
                                            : `No ${tabs.find((t) => t.value === filter)?.label.toLowerCase()} bookings`
                                    }
                                    description={
                                        filter === "all"
                                            ? "A quote becomes a booking once an organizer accepts it. Responding to quote requests quickly is what moves them along."
                                            : "Nothing in this state right now. Try another filter."
                                    }
                                    action={
                                        <Link href={`/vendor/${vendor_id}/quotes`} className={buttonClass("primary", "md")}>
                                            Go to quotes
                                        </Link>
                                    }
                                />
                            </div>
                        }
                    />
                </Card>
            </div>
        </div>
    );
}
