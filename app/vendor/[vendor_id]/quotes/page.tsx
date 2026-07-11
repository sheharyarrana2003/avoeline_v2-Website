import { AcceptButton } from "@/app/organizer/[organizer_id]/quotes/Acceptbutton";
import { BookingServices } from "@/src/features/bookings/bookings.service";
import { BookingData } from "@/src/features/bookings/types";
import { EventService } from "@/src/services/event.service";
import Link from "next/link";
AcceptButton

const formatCurrency = (amount: number, currency: string = "PKR") => {
    if (!amount && amount !== 0) return "N/A";
    return new Intl.NumberFormat('en-PK', {
        style: 'currency',
        currency: currency,
        maximumFractionDigits: 0,
    }).format(amount);
};

const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
        'negotiating': 'bg-yellow-100 text-yellow-700 border-yellow-200',
        'new': 'bg-green-100 text-green-700 border-green-200',
        'quote_accepted': 'bg-blue-100 text-blue-700 border-blue-200',
        'confirmed': 'bg-gray-100 text-gray-700 border-gray-200',
        'completed': 'bg-gray-100 text-gray-500 border-gray-200',
        'quote_received': 'bg-green-100 text-green-700 border-green-200',
        'quote_sent': 'bg-purple-100 text-purple-700 border-purple-200',
        'quote_requested': 'bg-yellow-100 text-yellow-700 border-yellow-200',
    };
    return styles[status?.toLowerCase()] || 'bg-gray-100 text-gray-600 border-gray-200';
};

const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
        'quote_requested': 'QUOTE REQUESTED',
        'quote_sent': 'QUOTE SENT',
        'quote_accepted': 'ACCEPTED',
        'confirmed': 'CONFIRMED',
        'completed': 'COMPLETED',
        'quote_received': 'QUOTE RECEIVED',
        'cancelled': 'QUOTE CANCELLED'
    };
    return labels[status?.toLowerCase()] || status?.toUpperCase() || 'UNKNOWN';
};

const StarRating = ({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) => {
    const fullStars = Math.floor(rating || 0);
    const sizeClass = size === "md" ? "w-4 h-4" : "w-3 h-3";

    return (
        <div className="flex items-center gap-0.5">
            {[...Array(5)].map((_, i) => (
                <svg
                    key={i}
                    className={`${sizeClass} ${i < fullStars ? 'text-gray-900 fill-gray-900' : 'text-gray-300 fill-gray-300'}`}
                    viewBox="0 0 20 20"
                >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
            ))}
        </div>
    );
};

const accept_quote = async (booking: BookingData) => {
    'use server'
    const new_status_history = {
        status: 'quote_accepted',
        timestamp: new Date().toISOString()
    }

    booking?.statusHistory.push(new_status_history);
    booking.status = 'quote_accepted'
    await BookingServices.update_booking(booking);
}

export default async function VendorQuoteManagementPage({
    params,
    searchParams
}: {
    params: Promise<{ id: string, organizer_id: string, vendor_id: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const { organizer_id, vendor_id } = await params;
    const awaitedSearchParams = await searchParams;

    // Get active tab from URL (active or past)
    const activeTab = (awaitedSearchParams?.tab as string) || "active";

    // NOTE: assumes BookingServices exposes a vendor-scoped fetch method,
    // mirroring getAllBookingsOfOrganizer. Adjust the method name if yours differs.
    const raw_bookings = await BookingServices.getAllBookingsOfVendor(vendor_id) || [];

    const activeStatuses = ['quote_requested', 'quote_sent', 'quote_accepted', 'inprogress', 'confirmed'];
    const pastStatuses = ['completed', 'cancelled'];

    const activeQuotes = raw_bookings.filter((b: any) =>
        activeStatuses.includes(b?.status?.toLowerCase())
    );

    const pastQuotes = raw_bookings.filter((b: any) =>
        pastStatuses.includes(b?.status?.toLowerCase())
    );

    const displayQuotes = activeTab === "active" ? activeQuotes : pastQuotes;

    // Get selected quote ID from URL
    const selectedQuoteId = awaitedSearchParams?.quote as string;
    const selectedQuote = displayQuotes.find((b: any) => b?.bookingId === selectedQuoteId) || displayQuotes[0];

    // Fetch event data for the selected quote (the vendor's counterpart is the event/organizer, not another vendor)
    let selectedEvent: any = null;
    if (selectedQuote?.eventId) {
        try {
            selectedEvent = await EventService.getEventByID(selectedQuote.eventId);
        } catch {
            selectedEvent = null;
        }
    }

    const ev = selectedEvent ;
    const eventName = ev?.eventName || ev?.name || selectedQuote?.eventId || "Unknown Event";
    const organizerName = ev?.organizerName || selectedQuote?.organizerId || "Unknown Organizer";

    const quote = selectedQuote?.quote ;
    const vendorQuote = quote?.vendorQuote ;
    const breakdown = vendorQuote?.breakdown ||[];
    const totalAmount = vendorQuote?.totalAmount || 0;
    const currency = selectedQuote?.payment?.currency || "PKR";
    const validity = quote?.vendorQuote?.validity || "";
    const proposalNumber = selectedQuote?.bookingId || "N/A";
    const submittedAt = quote?.respondedAt || quote?.requestedAt || "";
    const terms = vendorQuote?.terms || "";

    // Negotiation history
    const negotiations = quote?.negotiation || [];

    // Inclusions (from breakdown items)
    const inclusions = breakdown.map((item: any) => item?.item).filter(Boolean);

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">

                {/* Page Header */}
                <div className="mb-8">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Quote Management</h1>
                    <p className="text-sm text-gray-500 mt-1">Review and respond to booking requests</p>
                </div>

                <div className="">

                    {/* ================= Quote List & Detail ================= */}
                    <div className="">

                        {/* Tabs */}
                        <div className="">
                            <Link
                                href={`?tab=active`}
                                className={`pb-3 text-sm font-medium transition relative ${activeTab === "active"
                                    ? "text-gray-900 border-b-2 border-gray-900"
                                    : "text-gray-400 hover:text-gray-600"
                                    }`}
                            >
                                Active Quotes ({activeQuotes.length})
                            </Link>
                            <Link
                                href={`?tab=past`}
                                className={`pb-3 text-sm font-medium transition relative ${activeTab === "past"
                                    ? "text-gray-900 border-b-2 border-gray-900"
                                    : "text-gray-400 hover:text-gray-600"
                                    }`}
                            >
                                Past Quotes
                            </Link>
                        </div>

                        {/* Summary Badge */}
                        {activeTab === "active" && activeQuotes.length > 0 && (
                            <div className="flex items-center gap-2">
                                <span className="bg-black text-white text-xs font-bold px-3 py-1.5 rounded-full">
                                    {activeQuotes.length} Active Requests
                                </span>
                                <span className="text-sm text-gray-500">
                                    {selectedQuote?.serviceType || ""}
                                </span>
                                <button className="ml-auto text-gray-400 hover:text-gray-600">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                    </svg>
                                </button>
                            </div>
                        )}

                        {/* Quotes Table */}
                        {displayQuotes.length > 0 ? (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                {/* Table Header */}
                                <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                    <div className="col-span-4">Organizer / Event</div>
                                    <div className="col-span-3">Quote Amount</div>
                                    <div className="col-span-3">Inclusions</div>
                                    <div className="col-span-2 text-right">Status</div>
                                </div>

                                {/* Table Rows */}
                                {displayQuotes.map((booking: any, index: number) => {
                                    const bQuote = booking?.quote?.vendorQuote || {};
                                    const bTotal = bQuote?.totalAmount || 0;
                                    const bCurrency = booking?.payment?.currency || "PKR";
                                    const bStatus = booking?.status || "unknown";
                                    const bOrganizerId = booking?.organizerId || "";
                                    const bInclusions = (bQuote?.breakdown || []).map((item: any) => item?.item).filter(Boolean);
                                    const isSelected = selectedQuote?.bookingId === booking?.bookingId;

                                    return (
                                        <Link
                                            key={booking?.bookingId || index}
                                            href={`?tab=${activeTab}&quote=${booking?.bookingId}`}
                                            className={`grid grid-cols-12 gap-4 px-6 py-4 border-b border-gray-50 hover:bg-gray-50 transition items-center ${isSelected ? 'bg-gray-50' : ''}`}
                                        >
                                            {/* Organizer / Event */}
                                            <div className="col-span-4 flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600">
                                                    {bOrganizerId.slice(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900">Organizer {bOrganizerId}</p>
                                                    {booking?.eventName && (
                                                        <p className="text-xs text-gray-400">{booking.eventName}</p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Quote Amount */}
                                            <div className="col-span-3">
                                                <p className="text-sm font-bold text-gray-900">{formatCurrency(bTotal, bCurrency)}</p>
                                            </div>

                                            {/* Inclusions */}
                                            <div className="col-span-3 flex items-center gap-1">
                                                {bInclusions.length > 0 ? (
                                                    bInclusions.slice(0, 3).map((item: string, i: number) => (
                                                        <div key={i} className="w-5 h-5 rounded-full flex items-center justify-center bg-green-100" title={item}>
                                                            <svg className="w-3 h-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <span className="text-xs text-gray-400">No breakdown yet</span>
                                                )}
                                            </div>

                                            {/* Status */}
                                            <div className="col-span-2 text-right">
                                                <span className={`inline-block text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider ${getStatusBadge(bStatus)}`}>
                                                    {getStatusLabel(bStatus)}
                                                </span>
                                            </div>
                                        </Link>
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
                                <h3 className="text-lg font-bold text-gray-900 mb-2">
                                    {activeTab === "active" ? "No Active Requests" : "No Past Quotes"}
                                </h3>
                                <p className="text-sm text-gray-500">
                                    {activeTab === "active"
                                        ? "New booking requests will appear here."
                                        : "Completed bookings will appear here."}
                                </p>
                            </div>
                        )}

                        {/* Quote Detail Card */}
                        {selectedQuote && activeTab === "active" && (
                            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-200">

                                {/* Header */}
                                <div className="flex items-start justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                                            <span className="text-lg">📋</span>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900">{eventName}</h3>
                                            <p className="text-xs text-gray-400">
                                                {organizerName} • Submitted {timeAgo(submittedAt)} • Proposal #{proposalNumber}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-extrabold text-gray-900">{formatCurrency(totalAmount, currency)}</p>
                                        {validity && (
                                            <p className="text-xs text-gray-400">Validity: {formatDate(validity)}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Itemized Pricing */}
                                    <div>
                                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-4">Itemized Pricing</h4>
                                        <div className="space-y-3">
                                            {breakdown.length > 0 ? (
                                                breakdown.map((item: any, i: number) => (
                                                    <div key={i} className="flex justify-between items-center">
                                                        <span className="text-sm text-gray-600">{item?.item || 'Item'}</span>
                                                        <span className="text-sm font-semibold text-gray-900">{formatCurrency(item?.total || 0, currency)}</span>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-xs text-gray-400">No itemized breakdown provided.</p>
                                            )}

                                            <div className="border-t border-gray-100 pt-3 mt-3">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm font-bold text-gray-900">Total Amount</span>
                                                    <span className="text-lg font-extrabold text-gray-900">{formatCurrency(totalAmount, currency)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Negotiation History */}
                                    <div>
                                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-4">Negotiation History</h4>
                                        <div className="space-y-4">
                                            {negotiations.length > 0 ? (
                                                negotiations.map((n: any, i: number) => {
                                                    const isOrganizer = n?.from === "organizer";
                                                    return (
                                                        <div key={i} className="flex gap-3">
                                                            <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${isOrganizer ? 'bg-gray-300' : 'bg-black'}`} />
                                                            <div>
                                                                <p className="text-xs font-bold text-gray-900">
                                                                    {isOrganizer ? organizerName : "You (Vendor)"}
                                                                </p>
                                                                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                                                                    {n?.message || "No message"}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <p className="text-xs text-gray-400">No negotiation history yet.</p>
                                            )}

                                            {/* Terms */}
                                            <div className="mt-4 pt-4 border-t border-gray-100">
                                                <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Terms & Conditions</h5>
                                                <p className="text-xs text-gray-500 leading-relaxed">
                                                    {terms || "No terms specified."}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-col sm:flex-row gap-3 mt-8 pt-6 border-t border-gray-100">
                                    <Link
                                        href={`/vendor/${vendor_id}/quotes/prep-quote/${selectedQuote.bookingId}`}
                                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 border border-gray-300 py-2.5 px-5 rounded-full text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                        </svg>
                                        Counter Offer
                                    </Link>

                                    <Link
                                        href={`/vendor/${vendor_id}/bookings/${selectedQuote.bookingId}`}
                                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 border border-gray-300 py-2.5 px-5 rounded-full text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                        View Details
                                    </Link>

                                    <AcceptButton quote={selectedQuote} accept_quote={accept_quote} />
                                </div>
                            </div>
                        )}

                        {/* Other Quotes Accordion */}
                        {activeTab === "active" && activeQuotes.length > 1 && (
                            <div className="space-y-3">
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Other Requests</h3>
                                {activeQuotes.filter((b: any) => b?.bookingId !== selectedQuote?.bookingId).map((booking: any, i: number) => {
                                    const bq = booking?.quote?.vendorQuote || {};
                                    return (
                                        <Link
                                            key={booking?.bookingId || i}
                                            href={`?tab=active&quote=${booking?.bookingId}`}
                                            className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between hover:bg-gray-50 transition"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs">
                                                    📋
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900">Organizer {booking?.organizerId}</p>
                                                    <p className="text-xs text-gray-400">
                                                        {formatCurrency(bq?.totalAmount || 0, booking?.payment?.currency || "PKR")} • {getStatusLabel(booking?.status)}
                                                    </p>
                                                </div>
                                            </div>
                                            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
}