//all bookings 

import { BookingServices } from "@/src/features/bookings/bookings.service";
import { EventService } from "@/src/services/event.service";
import Link from "next/link";

const formatCurrency = (amount: number, currency: string = "PKR") => {
    if (!amount && amount !== 0) return "N/A";
    return new Intl.NumberFormat('en-PK', {
        style: 'currency',
        currency: currency,
        maximumFractionDigits: 0,
    }).format(amount);
};

const formatDateRange = (startDate: string, endDate?: string) => {
    if (!startDate) return "TBD";
    const start = new Date(startDate);
    if (!endDate || startDate === endDate) {
        return start.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }
    const end = new Date(endDate);
    return `${start.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { day: 'numeric', year: 'numeric' })}`;
};

const formatShortDate = (dateString: string) => {
    if (!dateString) return "TBD";
    return new Date(dateString).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

const timeAgo = (timestamp: string) => {
    if (!timestamp) return "Recently";
    const diff = Date.now() - new Date(timestamp).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
};

const getDeadlineStatus = (validityDate: string) => {
    if (!validityDate) return { label: 'No Deadline', color: 'text-gray-400', urgent: false };
    const validity = new Date(validityDate);
    const now = new Date();
    const diffHours = Math.floor((validity.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 0) return { label: 'Expired', color: 'text-gray-400', urgent: false };
    if (diffHours < 24) return { label: 'Deadline: Today', color: 'text-red-600', urgent: true, bg: 'bg-red-50' };
    if (diffHours < 48) return { label: 'Deadline: Tomorrow', color: 'text-red-500', urgent: true, bg: 'bg-red-50' };
    return { label: `Deadline: ${formatShortDate(validityDate)}`, color: 'text-gray-500', urgent: false };
};

const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
        'quote_requested': 'bg-black text-white',
        'new': 'bg-black text-white',
        'quote_sent': 'bg-gray-100 text-gray-600',
        'responded': 'bg-gray-100 text-gray-600',
        'viewed': 'bg-gray-100 text-gray-600',
        'expired': 'bg-gray-100 text-gray-400',
    };
    return styles[status?.toLowerCase()] || 'bg-gray-100 text-gray-600';
};

const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
        'quote_requested': 'NEW',
        'new': 'NEW',
        'quote_sent': 'RESPONDED',
        'responded': 'RESPONDED',
        'viewed': 'VIEWED',
        'expired': 'EXPIRED',
    };
    return labels[status?.toLowerCase()] || status?.toUpperCase() || 'NEW';
};

// Get service type icon
const getServiceIcon = (serviceType: string) => {
    const icons: Record<string, string> = {
        'catering': '🍴',
        'av_equipment': '🎤',
        'decoration': '🌸',
        'photography': '📷',
        'venues': '🏢',
        'music': '🎵',
        'event_management': '📋',
        'conference_tech': '⚡',
        'event_decor': '✨',
    };
    return icons[serviceType?.toLowerCase()] || '📦';
};

// Get service type display name
const getServiceName = (serviceType: string) => {
    const names: Record<string, string> = {
        'catering': 'Catering Services',
        'av_equipment': 'AV Equipment',
        'decoration': 'Event Decor',
        'photography': 'Photography',
        'venues': 'Venue',
        'music': 'Music',
        'event_management': 'Event Management',
        'conference_tech': 'Conference Tech',
        'event_decor': 'Event Decor',
    };
    return names[serviceType?.toLowerCase()] || serviceType;
};

// Get organizer name from booking
const getOrganizerName = (booking: any) => {
    // In real app, fetch from UserService. For now, derive from organizerId
    const orgId = booking?.organizerId || '';
    const names: Record<string, string> = {
        'org_001': 'TechVerse',
        'org_002': 'AI Professionals',
        'org_003': 'ABC Corp',
    };
    return names[orgId] || orgId.toUpperCase();
};

// Get budget range from quote
const getBudgetRange = (booking: any) => {
    const total = booking?.quote?.vendorQuote?.totalAmount || 0;
    const currency = booking?.payment?.currency || 'PKR';
    if (total === 0) {
        // Estimate from requirements guest count
        const guests = booking?.requirements?.guestCount || 0;
        if (guests > 0) {
            const estMin = guests * 800;
            const estMax = guests * 1200;
            return `${formatCurrency(estMin, currency).replace('PKR', 'PKR ')}K - ${formatCurrency(estMax, currency).replace('PKR', 'PKR ')}K`;
        }
        return 'Budget TBD';
    }
    const min = Math.round(total * 0.8);
    const max = Math.round(total * 1.2);
    return `${formatCurrency(min, currency).replace('PKR', 'PKR ')}K - ${formatCurrency(max, currency).replace('PKR', 'PKR ')}K`;
};

// Get guest label
const getGuestLabel = (booking: any) => {
    const count = booking?.requirements?.guestCount || 0;
    const eventType = booking?.serviceType?.toLowerCase();
    
    if (count === 0) return 'TBD';
    
    if (eventType === 'catering') return `${count} Participants`;
    if (eventType === 'av_equipment') return `${count} Attendees`;
    if (eventType === 'decoration') return `${count} Guests`;
    return `${count} Guests`;
};

export default async function VendorQuotesPage({ 
    params,
    searchParams
}: { 
    params: Promise<{ vendor_id: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const { vendor_id } = await params;
    const awaitedSearchParams = await searchParams;
    
    const filter = (awaitedSearchParams?.filter as string) || 'all';
    
    const raw_bookings = await BookingServices.getAllBookingsOfVendor(vendor_id) || [];
    
    const eventIds = [...new Set(raw_bookings.map((b: any) => b?.eventId).filter(Boolean))];
    
    const eventsMap: Record<string, any> = {};
    for (const eventId of eventIds) {
        try {
            const event = await EventService.getEventByID(eventId);
            if (event) eventsMap[eventId] = event;
        } catch {
            // Event not found
        }
    }
    
    const getEventTitle = (eventId: string) => {
        return eventsMap[eventId]?.title || eventId;
    };
    
    const getEventDates = (eventId: string) => {
        const event = eventsMap[eventId];
        if (!event?.schedule) return { start: null, end: null };
        return {
            start: event.schedule.startDate,
            end: event.schedule.endDate
        };
    };
    
    const now = new Date();
    
    const allQuotes = raw_bookings.filter((b: any) => 
        ['quote_requested', 'quote_sent', 'quote_accepted', 'confirmed'].includes(b?.status?.toLowerCase())
    );
    
    const newQuotes = allQuotes.filter((b: any) => 
        b?.status?.toLowerCase() === 'quote_requested'
    );
    
    const respondedQuotes = allQuotes.filter((b: any) => 
        ['quote_sent', 'quote_accepted'].includes(b?.status?.toLowerCase())
    );
    
    const expiredQuotes = allQuotes.filter((b: any) => {
        const validity = b?.quote?.vendorQuote?.validity;
        if (!validity) return false;
        return new Date(validity) < now;
    });
    
    // Apply filter
    let displayQuotes = allQuotes;
    if (filter === 'new') displayQuotes = newQuotes;
    else if (filter === 'responded') displayQuotes = respondedQuotes;
    else if (filter === 'expired') displayQuotes = expiredQuotes;
    
    // Filter tabs config
    const tabs = [
        { id: 'all', label: 'All', count: allQuotes.length },
        { id: 'new', label: 'New', count: newQuotes.length },
        { id: 'responded', label: 'Responded', count: respondedQuotes.length },
        { id: 'expired', label: 'Expired', count: expiredQuotes.length },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
                
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">QUOTE REQUESTS</h1>
                    <p className="text-sm text-gray-500 mt-2">Review and respond to organizer inquiries from your dashboard.</p>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        {tabs.map((tab) => (
                            <Link
                                key={tab.id}
                                href={`/vendor/${vendor_id}/quotes?filter=${tab.id}`}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                                    filter === tab.id
                                        ? 'bg-black text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                {tab.label} ({tab.count})
                            </Link>
                        ))}
                    </div>
                    
                    {/* View Toggle */}
                    <div className="flex items-center gap-2">
                        <button className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-200 transition">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                            </svg>
                        </button>
                        <button className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Quote Cards Grid */}
                {displayQuotes.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {displayQuotes.map((booking: any, index: number) => {
                            const eventTitle = getEventTitle(booking?.eventId);
                            const eventDates = getEventDates(booking?.eventId);
                            const organizerName = getOrganizerName(booking);
                            const serviceName = getServiceName(booking?.serviceType);
                            const serviceIcon = getServiceIcon(booking?.serviceType);
                            const budgetRange = getBudgetRange(booking);
                            const guestLabel = getGuestLabel(booking);
                            const deadline = getDeadlineStatus(booking?.quote?.vendorQuote?.validity);
                            const statusLabel = getStatusLabel(booking?.status);
                            const statusBadge = getStatusBadge(booking?.status);
                            
                            return (
                                <div key={booking?.bookingId}>
                                {/* href={`/vendor/${vendor_id}/quotes/${booking.bookingId}`}
                                 key={booking?.bookingId || index} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition"> */}
                                    
                                    {/* Card Header */}
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{organizerName}</p>
                                            <h3 className="text-lg font-bold text-gray-900 leading-tight">{eventTitle}</h3>
                                        </div>
                                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${statusBadge}`}>
                                            {statusLabel}
                                        </span>
                                    </div>
                                    
                                    {/* Service Type & Deadline */}
                                    <div className="flex items-center gap-3 mb-5">
                                        <span className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 px-2.5 py-1 rounded-full">
                                            <span>{serviceIcon}</span>
                                            {serviceName}
                                        </span>
                                        {deadline.urgent ? (
                                            <span className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${deadline.bg} ${deadline.color}`}>
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                {deadline.label}
                                            </span>
                                        ) : (
                                            <span className={`text-xs ${deadline.color}`}>{deadline.label}</span>
                                        )}
                                    </div>
                                    
                                    {/* Details Grid */}
                                    <div className="space-y-3 mb-6">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-400">Event Date</span>
                                            <span className="text-sm font-semibold text-gray-900">
                                                {formatDateRange(eventDates.start, eventDates.end)}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-400">Budget Range</span>
                                            <span className="text-sm font-semibold text-gray-900">{budgetRange}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-400">Guests</span>
                                            <span className="text-sm font-semibold text-gray-900">{guestLabel}</span>
                                        </div>
                                    </div>
                                    
                                    {/* Received Time */}
                                    <p className="text-xs text-gray-300 mb-5">Received {timeAgo(booking?.createdAt)}</p>
                                    
                                    {/* Action Buttons */}
                                    <div className="flex gap-3">
                                        <Link 
                                            href={`/vendor/${vendor_id}/quotes/prep-quote/${booking?.bookingId}`}
                                            className="flex-1 bg-black text-white text-sm font-semibold py-2.5 rounded-full text-center hover:bg-gray-800 transition"
                                        >
                                            Prepare Quote
                                        </Link>
                                        <button className="flex-1 border border-gray-200 text-gray-600 text-sm font-semibold py-2.5 rounded-full hover:bg-gray-50 transition">
                                            Decline
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">No Quote Requests</h3>
                        <p className="text-sm text-gray-500">You don't have any {filter !== 'all' ? filter : ''} quote requests at the moment.</p>
                    </div>
                )}
            </div>
        </div>
    );
}