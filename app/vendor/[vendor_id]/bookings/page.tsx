// app/vendor/[vendor_id]/bookings/page.tsx
// Fully Server Component

import { BookingServices } from "@/src/features/bookings/bookings.service";
import { EventVendorService } from "@/src/features/event_vendors/event_venders.services";
import { EventService } from "@/src/services/event.service";
import { OrganizerService } from "@/src/services/organizer.service";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDate, parseScheduleDateTime } from "@/src/lib/datetime";
import { formatCurrency } from "@/src/lib/money";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { StatCard_dashboard } from "@/src/shared_components/organizer/StatCard_dashboard";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { buttonClass } from "@/src/lib/ui";
import {
    Building2,
    CalendarCheck,
    CalendarDays,
    CalendarClock,
    Camera,
    ClipboardList,
    MapPin,
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
        const completedDate = b?.completedAt ? new Date(b.completedAt) : null;
        return completedDate &&
               completedDate.getMonth() === now.getMonth() &&
               completedDate.getFullYear() === now.getFullYear();
    });

    // Apply tab filter
    const displayBookings = (filter === 'all'
        ? allBookings
        : allBookings.filter((b: any) => b?.status?.toLowerCase() === filter)
    ).sort((a: any, b: any) => {
        const dateA = parseScheduleDateTime(a?.requirements?.serviceDate, "")?.getTime() ?? 0;
        const dateB = parseScheduleDateTime(b?.requirements?.serviceDate, "")?.getTime() ?? 0;
        return dateA - dateB;
    });

    const tabs = [
        { id: 'all', label: 'All' },
        { id: 'confirmed', label: 'Confirmed' },
        { id: 'in_progress', label: 'In progress' },
        { id: 'completed', label: 'Completed' },
        { id: 'cancelled', label: 'Cancelled' },
    ];

    return (
        <div className="px-4 py-8 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl">
                <PageHeader
                    title="Bookings"
                    description="Every service you have been confirmed for, in service-date order."
                />

                <section className="grid grid-cols-2 gap-y-8 border-b border-line py-8 sm:grid-cols-3 sm:divide-x sm:divide-line">
                    <StatCard_dashboard title="Active" value={String(activeBookings.length)} icon={<CalendarCheck size={14} />} />
                    <StatCard_dashboard title="This Week" value={String(upcomingThisWeek.length)} icon={<CalendarClock size={14} />} />
                    <StatCard_dashboard title="Completed This Month" value={String(completedThisMonth.length)} icon={<CalendarDays size={14} />} />
                </section>

                {/* Tabs, not pills: the same treatment the quotes page uses, so a
                    filter never looks like a button that submits something. */}
                <nav aria-label="Filter bookings" className="mb-8 flex gap-6 overflow-x-auto border-b border-line">
                    {tabs.map((tab) => (
                        <Link
                            key={tab.id}
                            href={`/vendor/${vendor_id}/bookings?filter=${tab.id}`}
                            aria-current={filter === tab.id ? "page" : undefined}
                            className={`-mb-px whitespace-nowrap border-b-2 pb-3 pt-6 text-sm font-medium transition ${
                                filter === tab.id
                                    ? "border-ink text-ink"
                                    : "border-transparent text-ink-soft hover:text-ink"
                            }`}
                        >
                            {tab.label}
                        </Link>
                    ))}
                </nav>

                {displayBookings.length > 0 ? (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {displayBookings.map((booking: any) => {
                            const status = booking?.status || 'unknown';
                            const serviceType = booking?.serviceType || '';
                            const ServiceIcon = getServiceIcon(serviceType);
                            const totalAmount = booking?.quote?.vendorQuote?.totalAmount || booking?.payment?.totalAmount || 0;
                            const currency = booking?.payment?.currency || 'PKR';

                            return (
                                <div key={booking?.bookingId} className="lift flex flex-col rounded-2xl border border-line bg-paper p-5 shadow-xs">
                                    <div className="mb-4 flex items-center justify-between gap-2">
                                        <StatusBadge status={status} size="sm" />
                                        <span className="text-sm font-medium text-ink tabular-nums">{formatCurrency(totalAmount, currency)}</span>
                                    </div>

                                    <h2 className="font-display text-lg text-ink">{getEventTitle(booking?.eventId)}</h2>
                                    <p className="mt-1 text-xs text-ink-soft">{getOrganizerName(booking?.organizerId)}</p>

                                    <dl className="mt-4 space-y-2 text-sm text-ink-soft">
                                        <div className="flex items-center gap-2">
                                            {/* gray-400 = 2.5:1, decoration only — every row has a text value. */}
                                            <ServiceIcon size={14} className="shrink-0 text-ink-faint" aria-hidden="true" />
                                            <dt className="sr-only">Service</dt>
                                            <dd>{getServiceName(serviceType)}</dd>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <CalendarDays size={14} className="shrink-0 text-ink-faint" aria-hidden="true" />
                                            <dt className="sr-only">Service date</dt>
                                            <dd className="tabular-nums">{formatDate(booking?.requirements?.serviceDate)}</dd>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <MapPin size={14} className="shrink-0 text-ink-faint" aria-hidden="true" />
                                            <dt className="sr-only">Location</dt>
                                            <dd>{booking?.requirements?.location || 'Location TBD'}</dd>
                                        </div>
                                    </dl>

                                    {/* Was a "Prepare" primary CTA pointing at /bookings/[id]/prepare,
                                        a route that has never existed — every card's main action 404'd. */}
                                    <Link
                                        href={`/vendor/${vendor_id}/bookings/${booking?.bookingId}`}
                                        className={buttonClass("secondary", "md", "mt-5 w-full")}
                                    >
                                        View booking
                                    </Link>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <EmptyState
                        icon={<CalendarDays size={26} />}
                        title={filter === 'all' ? "No bookings yet" : `No ${tabs.find((t) => t.id === filter)?.label.toLowerCase()} bookings`}
                        description={
                            filter === 'all'
                                ? "A quote becomes a booking once an organizer accepts it. Responding to quote requests quickly is what moves them along."
                                : "Nothing in this state right now. Try another filter."
                        }
                        action={
                            <Link href={`/vendor/${vendor_id}/quotes`} className={buttonClass("primary", "md")}>
                                Go to quotes
                            </Link>
                        }
                    />
                )}
            </div>
        </div>
    );
}
