// app/vendor/[vendor_id]/bookings/page.tsx
// Fully Server Component

import { BookingServices } from "@/src/features/bookings/bookings.service";
import { EventVendorService } from "@/src/features/event_vendors/event_venders.services";
import { EventService } from "@/src/services/event.service";
import Link from "next/link";
import { notFound } from "next/navigation";

// --- Helper Functions ---
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
        return start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    const end = new Date(endDate);
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}-${end.getDate()}`;
};

const formatShortDate = (dateString: string) => {
    if (!dateString) return "TBD";
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
        'confirmed': 'bg-black text-white',
        'in_progress': 'bg-black text-white',
        'completed': 'bg-green-50 text-green-600 border border-green-200',
        'cancelled': 'bg-red-50 text-red-600 border border-red-200',
        'quote_requested': 'bg-gray-100 text-gray-600',
        'quote_sent': 'bg-gray-100 text-gray-600',
    };
    return styles[status?.toLowerCase()] || 'bg-gray-100 text-gray-600';
};

const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
        'confirmed': 'CONFIRMED',
        'in_progress': 'IN PROGRESS',
        'completed': 'COMPLETED',
        'cancelled': 'CANCELLED',
        'quote_requested': 'QUOTE REQUESTED',
        'quote_sent': 'QUOTE SENT',
    };
    return labels[status?.toLowerCase()] || status?.toUpperCase() || 'UNKNOWN';
};

const getServiceIcon = (serviceType: string) => {
    const icons: Record<string, string> = {
        'catering': '🍴',
        'av_equipment': '🎤',
        'decoration': '🌸',
        'photography': '📷',
        'venues': '🏢',
        'music': '🎵',
        'event_management': '📋',
    };
    return icons[serviceType?.toLowerCase()] || '📦';
};

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
    return names[serviceType?.toLowerCase()] || serviceType;
};

// Get organizer name from booking
const getOrganizerName = (organizerId: string) => {
    const names: Record<string, string> = {
        'org_001': 'TechVerse',
        'org_002': 'Tech Innovators',
        'org_003': 'Ahmed & Sana',
    };
    return names[organizerId] || organizerId;
};

// Get client name for display
const getClientName = (booking: any) => {
    if (booking?.organizerId === 'org_003') return 'Ahmed & Sana';
    return getOrganizerName(booking?.organizerId || '');
};

// Get preparation progress
const getPrepProgress = (booking: any) => {
    // Mock progress based on status
    const status = booking?.status?.toLowerCase();
    if (status === 'confirmed') return 25;
    if (status === 'in_progress') return 75;
    if (status === 'completed') return 100;
    return 0;
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
    for (const eventId of eventIds) {
        try {
            const event = await EventService.getEventByID(eventId);
            if (event) eventsMap[eventId] = event;
        } catch {
            // Event not found
        }
    }
    
    // Get event title dynamically
    const getEventTitle = (eventId: string) => {
        return eventsMap[eventId]?.title || eventId;
    };
    
    // Filter bookings
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    const activeStatuses = ['confirmed', 'in_progress'];
    const completedStatuses = ['completed'];
    
    const allBookings = raw_bookings.filter((b: any) => 
        ['confirmed', 'in_progress', 'completed', 'cancelled'].includes(b?.status?.toLowerCase())
    );
    
    const activeBookings = allBookings.filter((b: any) => 
        activeStatuses.includes(b?.status?.toLowerCase())
    );
    
    const upcomingThisWeek = activeBookings.filter((b: any) => {
        const serviceDate = b?.requirements?.serviceDate ? new Date(b.requirements.serviceDate) : null;
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
    let displayBookings = allBookings;
    if (filter === 'confirmed') {
        displayBookings = allBookings.filter((b: any) => b?.status?.toLowerCase() === 'confirmed');
    } else if (filter === 'in_progress') {
        displayBookings = allBookings.filter((b: any) => b?.status?.toLowerCase() === 'in_progress');
    } else if (filter === 'completed') {
        displayBookings = allBookings.filter((b: any) => b?.status?.toLowerCase() === 'completed');
    } else if (filter === 'cancelled') {
        displayBookings = allBookings.filter((b: any) => b?.status?.toLowerCase() === 'cancelled');
    }
    
    // Sort by service date (upcoming first)
    displayBookings = displayBookings.sort((a: any, b: any) => {
        const dateA = new Date(a?.requirements?.serviceDate || 0).getTime();
        const dateB = new Date(b?.requirements?.serviceDate || 0).getTime();
        return dateA - dateB;
    });

    const tabs = [
        { id: 'all', label: 'All' },
        { id: 'confirmed', label: 'Confirmed' },
        { id: 'in_progress', label: 'In Progress' },
        { id: 'completed', label: 'Completed' },
        { id: 'cancelled', label: 'Cancelled' },
    ];

    return (
        <div className="min-h-screen bg-[#f5f5f5]">
            
            {/* Top Navigation */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        {/* Logo */}
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                            <span className="font-bold text-gray-900">AVOELINE</span>
                        </div>
                        
                        {/* Nav Links */}
                        <nav className="hidden md:flex items-center gap-6">
                            <Link href={`/vendor/${vendor_id}`} className="text-sm text-gray-500 hover:text-gray-900">Dashboard</Link>
                            <Link href={`/vendor/${vendor_id}/bookings`} className="text-sm font-bold text-gray-900 border-b-2 border-black pb-5 pt-5">Bookings</Link>
                            <Link href={`/vendor/${vendor_id}/services`} className="text-sm text-gray-500 hover:text-gray-900">Services</Link>
                            <Link href={`/vendor/${vendor_id}/earnings`} className="text-sm text-gray-500 hover:text-gray-900">Earnings</Link>
                            <Link href={`/vendor/${vendor_id}/profile`} className="text-sm text-gray-500 hover:text-gray-900">Profile</Link>
                        </nav>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <button className="relative text-gray-400 hover:text-gray-600">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
                        </button>
                        <button className="text-gray-400 hover:text-gray-600">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </button>
                        <div className="w-8 h-8 bg-gray-200 rounded-full overflow-hidden">
                            <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
                
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">My Bookings</h1>
                        <p className="text-sm text-gray-500 mt-1">Manage all your confirmed and active services</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <svg className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search bookings..."
                                className="bg-white border border-gray-200 rounded-full pl-10 pr-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-gray-200 w-48"
                            />
                        </div>
                        <button className="flex items-center gap-2 bg-white border border-gray-200 rounded-full px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                            </svg>
                            Event Filter
                        </button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Total Active Bookings</p>
                        <p className="text-3xl font-bold text-gray-900">{activeBookings.length}</p>
                    </div>
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Upcoming This Week</p>
                        <p className="text-3xl font-bold text-gray-900">{upcomingThisWeek.length}</p>
                    </div>
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Completed This Month</p>
                        <p className="text-3xl font-bold text-gray-900">{completedThisMonth.length}</p>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        {tabs.map((tab) => (
                            <Link
                                key={tab.id}
                                href={`/vendor/${vendor_id}/bookings?filter=${tab.id}`}
                                className={`px-5 py-2 rounded-full text-sm font-medium transition ${
                                    filter === tab.id
                                        ? 'bg-black text-white'
                                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                                }`}
                            >
                                {tab.label}
                            </Link>
                        ))}
                    </div>
                    
                    {/* View Toggle */}
                    <div className="flex items-center gap-2">
                        <button className="w-9 h-9 bg-white border border-gray-200 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-50 transition">
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

                {/* Booking Cards Grid */}
                {displayBookings.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {displayBookings.map((booking: any) => {
                            const eventTitle = getEventTitle(booking?.eventId);
                            const status = booking?.status || 'unknown';
                            const statusBadge = getStatusBadge(status);
                            const statusLabel = getStatusLabel(status);
                            const serviceType = booking?.serviceType || '';
                            const serviceName = getServiceName(serviceType);
                            const serviceIcon = getServiceIcon(serviceType);
                            const organizerName = getOrganizerName(booking?.organizerId);
                            const clientName = getClientName(booking);
                            const prepProgress = getPrepProgress(booking);
                            const totalAmount = booking?.quote?.vendorQuote?.totalAmount || booking?.payment?.totalAmount || 0;
                            const currency = booking?.payment?.currency || 'PKR';
                            const serviceDate = booking?.requirements?.serviceDate;
                            const location = booking?.requirements?.location;
                            
                            const isCompleted = status.toLowerCase() === 'completed';
                            const isInProgress = status.toLowerCase() === 'in_progress';
                            const isConfirmed = status.toLowerCase() === 'confirmed';
                            
                            return (
                                <div key={booking?.bookingId} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition">
                                    
                                    {/* Card Header */}
                                    <div className="flex items-center justify-between mb-4">
                                        <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${statusBadge}`}>
                                            {statusLabel}
                                        </span>
                                        <span className="text-sm font-bold text-gray-900">{formatCurrency(totalAmount, currency)}</span>
                                    </div>
                                    
                                    {/* Event Title */}
                                    <h3 className="text-lg font-bold text-gray-900 mb-1">{eventTitle}</h3>
                                    
                                    {/* Organizer / Client */}
                                    <p className="text-xs text-gray-500 mb-4">
                                        {isCompleted ? `Client: ${clientName}` : `Organized by ${organizerName}`}
                                    </p>
                                    
                                    {/* Service & Details */}
                                    <div className="space-y-2 mb-4">
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <span>{serviceIcon}</span>
                                            <span>{serviceName}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            {formatDateRange(serviceDate, serviceDate)}
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            {location || 'Location TBD'}
                                        </div>
                                    </div>
                                    
                                    {/* Progress Bar (for in-progress) */}
                                    {(isConfirmed || isInProgress) && (
                                        <div className="mb-4">
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                                    {isInProgress ? 'Service Status' : 'Preparation Status'}
                                                </span>
                                                <span className="text-xs font-bold text-gray-900">{prepProgress}%</span>
                                            </div>
                                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-black rounded-full"
                                                    style={{ width: `${prepProgress}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                    
                                    {/* Review Badge (for completed) */}
                                    {isCompleted && (
                                        <div className="mb-4">
                                            <span className="text-[10px] font-bold text-yellow-600 bg-yellow-50 px-2.5 py-1 rounded-full">
                                                Review Received
                                            </span>
                                        </div>
                                    )}
                                    
                                    {/* Action Button */}
                                    <Link 
                                        href={isCompleted 
                                            ? `/vendor/${vendor_id}/bookings/${booking?.bookingId}`
                                            : `/vendor/${vendor_id}/bookings/${booking?.bookingId}/prepare`
                                        }
                                        className={`w-full block text-center py-3 rounded-xl font-bold text-sm transition ${
                                            isCompleted
                                                ? 'border-2 border-black text-black hover:bg-black hover:text-white'
                                                : 'bg-black text-white hover:bg-gray-800'
                                        }`}
                                    >
                                        {isCompleted ? 'View Details' : isInProgress ? 'Start Service' : 'Prepare'}
                                    </Link>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">No Bookings Found</h3>
                        <p className="text-sm text-gray-500">No {filter !== 'all' ? filter : ''} bookings match your criteria.</p>
                    </div>
                )}

                {/* Load More */}
                {displayBookings.length > 0 && (
                    <div className="text-center mt-8">
                        <button className="bg-white border border-gray-200 rounded-full px-6 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
                            Load More Bookings
                        </button>
                        <p className="text-xs text-gray-400 mt-3">Showing {Math.min(displayBookings.length, 6)} of {activeBookings.length} active bookings</p>
                    </div>
                )}
            </div>
        </div>
    );
}