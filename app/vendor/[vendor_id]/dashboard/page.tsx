import { BookingServices } from "@/src/features/bookings/bookings.service";
import { BookingData } from "@/src/features/bookings/types";
import { EventVendorService } from "@/src/features/event_vendors/event_venders.services";
import { EventService } from "@/src/services/event.service";
import { VendorData } from "@/src/services/models/vendor.model";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDate, parseScheduleDateTime } from "@/src/lib/datetime";

// --- Helper Functions ---
const formatCurrency = (amount: number, currency: string = "PKR") => {
    if (!amount && amount !== 0) return "N/A";
    return new Intl.NumberFormat('en-PK', {
        style: 'currency',
        currency: currency,
        maximumFractionDigits: 0,
    }).format(amount);
};

const timeAgo = (timestamp: string) => {
    if (!timestamp) return "Recently";
    const diff = Date.now() - new Date(timestamp).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
    const months = Math.floor(days / 30);
    return `${months} month${months > 1 ? 's' : ''} ago`;
};

const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
        'quote_requested': 'bg-gray-100 text-gray-600 border-gray-200',
        'quote_sent': 'bg-yellow-100 text-yellow-700 border-yellow-200',
        'quote_accepted': 'bg-blue-100 text-blue-700 border-blue-200',
        'confirmed': 'bg-green-100 text-green-700 border-green-200',
        'in_progress': 'bg-purple-100 text-purple-700 border-purple-200',
        'completed': 'bg-gray-100 text-gray-500 border-gray-200',
        'cancelled': 'bg-red-100 text-red-700 border-red-200',
    };
    return styles[status?.toLowerCase()] || 'bg-gray-100 text-gray-600 border-gray-200';
};

const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
        'quote_requested': 'QUOTE REQUESTED',
        'quote_sent': 'QUOTE SENT',
        'quote_accepted': 'QUOTE ACCEPTED',
        'confirmed': 'CONFIRMED',
        'in_progress': 'IN PROGRESS',
        'completed': 'COMPLETED',
        'cancelled': 'CANCELLED',
    };
    return labels[status?.toLowerCase()] || status?.toUpperCase() || 'UNKNOWN';
};

// --- Star Rating Component ---
const StarRating = ({ rating }: { rating: number }) => {
    const fullStars = Math.floor(rating || 0);
    return (
        <div className="flex items-center gap-0.5">
            {[...Array(5)].map((_, i) => (
                <svg
                    key={i}
                    className={`w-3 h-3 ${i < fullStars ? 'text-gray-900 fill-gray-900' : 'text-gray-300 fill-gray-300'}`}
                    viewBox="0 0 20 20"
                >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
            ))}
        </div>
    );
};

// --- Mini Bar Chart Component ---
const MiniBarChart = ({ data }: { data: number[] }) => {
    const max = Math.max(...data, 1);
    return (
        <div className="flex items-end gap-1 h-16">
            {data.map((val, i) => (
                <div
                    key={i}
                    className={`flex-1 rounded-sm ${val === max ? 'bg-black' : 'bg-gray-200'}`}
                    style={{ height: `${(val / max) * 100}%`, minHeight: '4px' }}
                />
            ))}
        </div>
    );
};

export default async function VendorDashboardPage({ 
    params 
}: { 
    params: Promise<{ vendor_id: string }> 
}) {
    const { vendor_id } = await params;
    
    // Fetch vendor data
    const v : VendorData|null = await EventVendorService.getVendorById(vendor_id);

    if(!v){
        notFound();
    }
   
    
    // Fetch all bookings for this vendor
    let raw_bookings : BookingData[]|null = await BookingServices.getAllBookingsOfVendor(vendor_id) ;

    if(!raw_bookings){
        raw_bookings= [];
    }
    
    const businessName = v?.businessName || "Vendor Dashboard";
    const vendorRating = v?.ratings?.averageRating || 0;
    const totalReviews = v?.ratings?.totalReviews || 0;
    const verificationBadges = v?.verification?.verificationBadges || [];
    const isVerified = v?.verification?.verified || false;
    
    const eventIds = [...new Set(raw_bookings.map((b: any) => b?.eventId).filter(Boolean))];
    
    const eventsMap: Record<string, any> = {};
    await Promise.all(eventIds.map(async (eventId) => {
        try {
            const event = await EventService.getEventByID(eventId);
            if (event) {
                eventsMap[eventId] = event;
            }
        } catch {
            // Event not found, will use fallback
        }
    }));
    
    const getEventTitle = (eventId: string) => {
        return eventsMap[eventId]?.title || eventId;
    };
    
    const getEventCategory = (eventId: string) => {
        const event = eventsMap[eventId];
        if (!event) return 'Event';
        return event?.category || event?.eventType || 'Event';
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
            // serviceDate is stored DD/MM/YYYY — parse with the shared helper.
            const serviceDate = parseScheduleDateTime(b?.requirements?.serviceDate, "");
            return serviceDate && serviceDate >= now;
        })
        .sort((a: any, b: any) => {
            const dateA = parseScheduleDateTime(a?.requirements?.serviceDate, "")?.getTime() ?? 0;
            const dateB = parseScheduleDateTime(b?.requirements?.serviceDate, "")?.getTime() ?? 0;
            return dateA - dateB;
        })
        .slice(0, 4);
    
    // Weekly revenue data for chart (computed from actual completed bookings)
    const weeklyRevenue = computeWeeklyRevenue(completedBookings);
    
    // Get budget range from quote
    const getBudgetRange = (booking: any) => {
        const total = booking?.quote?.vendorQuote?.totalAmount || 0;
        const currency = booking?.payment?.currency || 'PKR';
        if (total === 0) return 'Budget TBD';
        const min = Math.round(total * 0.8);
        const max = Math.round(total * 1.2);
        return `${formatCurrency(min, currency)}-${formatCurrency(max, currency).replace('PKR', '')}`;
    };
    
    // Get service type icon
    const getServiceIcon = (serviceType: string) => {
        const icons: Record<string, string> = {
            'catering': '🍽️',
            'av_equipment': '🎤',
            'decoration': '🌸',
            'photography': '📷',
            'venues': '🏢',
            'music': '🎵',
            'event_management': '📋',
        };
        return icons[serviceType?.toLowerCase()] || '📦';
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Top Navigation Bar */}
          

            <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
                
                {/* Welcome Section */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        {v?.logo && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={v.logo} alt={businessName} className="w-10 h-10 rounded-full object-cover border border-gray-200 bg-white" />
                        )}
                        <h2 className="text-xl font-bold text-gray-900">Welcome back, {businessName}!</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        {isVerified && verificationBadges.includes('top_rated') && (
                            <span className="bg-black text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                </svg>
                                Top Rated Vendor
                            </span>
                        )}
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Active Quotes</p>
                        <p className="text-3xl font-bold text-gray-900">{activeQuotes.length}</p>
                    </div>
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Confirmed Bookings</p>
                        <p className="text-3xl font-bold text-gray-900">{confirmedBookings.length}</p>
                    </div>
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Revenue This Month</p>
                        <p className="text-3xl font-bold text-gray-900">{formatCurrency(thisMonthRevenue)}</p>
                    </div>
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Average Rating</p>
                        <p className="text-3xl font-bold text-gray-900">{vendorRating || 'N/A'}</p>
                        <div className="flex items-center gap-2 mt-1">
                            <StarRating rating={vendorRating} />
                            <span className="text-xs text-gray-400">from {totalReviews} reviews</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Left Column: Quote Requests & Upcoming Bookings */}
                    <div className="lg:col-span-2 space-y-6">
                        
                        {/* Recent Quote Requests */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-sm font-bold text-gray-900">Recent Quote Requests</h3>
                                <Link href={`/vendor/${vendor_id}/quotes`} className="text-xs text-gray-500 hover:text-gray-700 underline">
                                    View All
                                </Link>
                            </div>

                            <div className="space-y-4">
                                {recentQuoteRequests.length > 0 ? (
                                    recentQuoteRequests.map((booking: any, index: number) => {
                                        const eventTitle = getEventTitle(booking?.eventId);
                                        const eventCategory = getEventCategory(booking?.eventId);
                                        const budgetRange = getBudgetRange(booking);
                                        
                                        return (
                                            <div key={booking?.bookingId || index} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                                                        <span className="text-lg">{getServiceIcon(booking?.serviceType)}</span>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-gray-900">{eventTitle}</p>
                                                        <p className="text-xs text-gray-400">
                                                            {eventCategory} • {budgetRange}
                                                        </p>
                                                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                            {timeAgo(booking?.createdAt)}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Link 
                                                        href={`/vendor/${vendor_id}/quotes/${booking?.bookingId}`}
                                                        className="text-xs text-gray-500 hover:text-gray-700 underline"
                                                    >
                                                        View Details
                                                    </Link>
                                                    <Link 
                                                        href={`/vendor/${vendor_id}/quotes/${booking?.bookingId}/submit`}
                                                        className="bg-black text-white text-xs font-bold px-4 py-2 rounded-full hover:bg-gray-800 transition"
                                                    >
                                                        Submit Quote
                                                    </Link>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="text-center py-8">
                                        <p className="text-sm text-gray-400">No recent quote requests</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Upcoming Bookings */}
                        <div>
                            <h3 className="text-sm font-bold text-gray-900 mb-4">Upcoming Bookings</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {upcomingBookings.length > 0 ? (
                                    upcomingBookings.map((booking: any, index: number) => {
                                        const eventTitle = getEventTitle(booking?.eventId);
                                        const serviceDate = booking?.requirements?.serviceDate;
                                        const location = booking?.requirements?.location;
                                        
                                        return (
                                            <div key={booking?.bookingId || index} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                                                <div className="flex items-center justify-between mb-3">
                                                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider ${getStatusBadge(booking?.status)}`}>
                                                        {getStatusLabel(booking?.status)}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400 font-medium">
                                                        {booking?.bookingId}
                                                    </span>
                                                </div>
                                                
                                                <h4 className="font-bold text-gray-900 mb-2">{eventTitle}</h4>
                                                
                                                <div className="space-y-1.5 mb-4">
                                                    <p className="text-xs text-gray-500 flex items-center gap-1.5">
                                                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                        {formatDate(serviceDate)}
                                                    </p>
                                                    <p className="text-xs text-gray-500 flex items-center gap-1.5">
                                                        <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        </svg>
                                                        {location || 'Location TBD'}
                                                    </p>
                                                </div>

                                                <Link 
                                                    href={`/vendor/${vendor_id}/bookings/${booking?.bookingId}/prepare`}
                                                    className="w-full block text-center bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold py-2.5 rounded-xl transition"
                                                >
                                                    Prepare
                                                </Link>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="col-span-2 bg-white rounded-2xl p-8 text-center shadow-sm border border-gray-100">
                                        <p className="text-sm text-gray-400">No upcoming bookings</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Revenue Overview */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <h3 className="text-sm font-bold text-gray-900 mb-4">Revenue Overview</h3>
                            <p className="text-xs text-gray-400 mb-1">Total This Month</p>
                            <p className="text-2xl font-bold text-gray-900 mb-6">{formatCurrency(thisMonthRevenue)}</p>
                            
                            <MiniBarChart data={weeklyRevenue} />
                            
                            <div className="flex justify-between mt-2 text-[10px] text-gray-400">
                                <span>{getWeekLabel(0)}</span>
                                <span>{getWeekLabel(3)}</span>
                                <span>{getWeekLabel(6)}</span>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <h3 className="text-sm font-bold text-gray-900 mb-4">Quick Actions</h3>
                            <div className="space-y-2">
                                <Link 
                                    href={`/vendor/${vendor_id}/quotes`}
                                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition"
                                >
                                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                                        <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-700">View All Quotes</p>
                                        <p className="text-xs text-gray-400">{activeQuotes.length} active</p>
                                    </div>
                                </Link>
                                <Link 
                                    href={`/vendor/${vendor_id}/bookings`}
                                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition"
                                >
                                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                                        <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-700">Manage Bookings</p>
                                        <p className="text-xs text-gray-400">{confirmedBookings.length} confirmed</p>
                                    </div>
                                </Link>
                                {/* <Link 
                                    href={`/vendor/${vendor_id}/portfolio`}
                                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition"
                                >
                                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                                        <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    {/* <div>
                                        <p className="text-sm font-medium text-gray-700">Update Portfolio</p>
                                        <p className="text-xs text-gray-400">Showcase your work</p>
                                    </div> */}
                                {/* </Link> */} 
                            </div>
                        </div>
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

    // Real weekly revenue (zeros when the vendor has no completed bookings yet).
    return weeks;
}

// --- Helper to get week label for chart ---
function getWeekLabel(weeksAgo: number): string {
    const date = new Date();
    date.setDate(date.getDate() - (6 - weeksAgo) * 7);
    return formatDate(date);
}