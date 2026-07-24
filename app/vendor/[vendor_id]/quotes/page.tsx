import { AcceptButton } from "@/app/organizer/[organizer_id]/quotes/Acceptbutton";
import { BookingServices } from "@/src/features/bookings/bookings.service";
import { BookingData } from "@/src/features/bookings/types";
import { EventService } from "@/src/services/event.service";
import Link from "next/link";
import { formatDate } from "@/src/lib/datetime";

const formatCurrency = (amount: number, currency: string = "PKR") => {
    if (!amount && amount !== 0) return "N/A";
    return new Intl.NumberFormat('en-PK', {
        style: 'currency',
        currency: currency,
        maximumFractionDigits: 0,
    }).format(amount);
};

const timeAgo = (timestamp: string | Date) => {
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
        'negotiating': 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20',
        'new': 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20',
        'quote_accepted': 'bg-sky-50 text-sky-700 ring-1 ring-sky-600/20',
        'confirmed': 'bg-slate-50 text-slate-700 ring-1 ring-slate-600/20',
        'completed': 'bg-slate-50 text-slate-500 ring-1 ring-slate-600/20',
        'quote_received': 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20',
        'quote_sent': 'bg-violet-50 text-violet-700 ring-1 ring-violet-600/20',
        'quote_requested': 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20',
    };
    return styles[status?.toLowerCase()] || 'bg-slate-50 text-slate-600 ring-1 ring-slate-600/20';
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
                    className={`${sizeClass} ${i < fullStars ? 'text-indigo-500 fill-indigo-500' : 'text-slate-200 fill-slate-200'}`}
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

    const ev = selectedEvent;
    const eventName = ev?.eventName || ev?.name || selectedQuote?.eventId || "Unknown Event";
    const organizerName = ev?.organizerName || selectedQuote?.organizerId || "Unknown Organizer";

    const quote = selectedQuote?.quote;
    const vendorQuote = quote?.vendorQuote;
    const breakdown = vendorQuote?.breakdown || [];
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

    const displaying_selected_quote = () => {
        if (!selectedQuote) {
            return <></>;
        }

        return (
            <>
                <div className="bg-white rounded-xl p-6 md:p-8 shadow-sm ring-1 ring-slate-900/5">

                    {/* Header */}
                    <div className="flex items-start justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center ring-1 ring-indigo-100">
                                <span className="text-xl">📋</span>
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900 text-lg">{eventName}</h3>
                                <p className="text-sm text-slate-400 mt-0.5">
                                    {organizerName} • Submitted {timeAgo(submittedAt)} • Proposal #{proposalNumber}
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-bold text-slate-900 tracking-tight">{formatCurrency(totalAmount, currency)}</p>
                            {validity && (
                                <p className="text-sm text-slate-400 mt-1">Validity: {formatDate(validity)}</p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        {/* Itemized Pricing */}
                        <div>
                            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-5">Itemized Pricing</h4>
                            <div className="space-y-4">
                                {breakdown.length > 0 ? (
                                    breakdown.map((item: any, i: number) => (
                                        <div key={i} className="flex justify-between items-center py-2">
                                            <span className="text-sm text-slate-600">{item?.item || 'Item'}</span>
                                            <span className="text-sm font-semibold text-slate-900">{formatCurrency(item?.total || 0, currency)}</span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-slate-400">No itemized breakdown provided.</p>
                                )}

                                <div className="border-t border-slate-100 pt-4 mt-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-semibold text-slate-900">Total Amount</span>
                                        <span className="text-xl font-bold text-slate-900">{formatCurrency(totalAmount, currency)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Negotiation History */}
                        <div>
                            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-5">Negotiation History</h4>
                            <div className="space-y-5">
                                {negotiations.length > 0 ? (
                                    negotiations.map((n: any, i: number) => {
                                        const isOrganizer = n?.from === "organizer";
                                        return (
                                            <div key={i} className="flex gap-3">
                                                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${isOrganizer ? 'bg-slate-300' : 'bg-indigo-500'}`} />
                                                <div>
                                                    <p className="text-xs font-semibold text-slate-900">
                                                        {isOrganizer ? organizerName : "You (Vendor)"}
                                                    </p>
                                                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                                        {n?.message || "No message"}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <p className="text-sm text-slate-400">No negotiation history yet.</p>
                                )}

                                {/* Terms */}
                                <div className="mt-6 pt-6 border-t border-slate-100">
                                    <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Terms & Conditions</h5>
                                    <p className="text-xs text-slate-500 leading-relaxed">
                                        {terms || "No terms specified."}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 mt-10 pt-8 border-t border-slate-100">
                        <Link
                            href={`/vendor/${vendor_id}/quotes/prep-quote/${selectedQuote.bookingId}`}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 border border-slate-200 py-2.5 px-5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                            Prepare Offer
                        </Link>

                        <Link
                            href={`/vendor/${vendor_id}/bookings/${selectedQuote.bookingId}/counter-offer`}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 border border-slate-200 py-2.5 px-5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                            Counter Offer
                        </Link>
                        <Link
                            href={`/vendor/${vendor_id}/bookings/${selectedQuote.bookingId}`}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 border border-slate-200 py-2.5 px-5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
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
            </>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="max-w-5xl mx-auto px-4 md:px-8 py-10">

                {/* Page Header */}
                <div className="mb-10">
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Quote Management</h1>
                    <p className="text-base text-slate-500 mt-2">Review and respond to booking requests</p>
                </div>

                <div className="">

                    {/* ================= Quote List & Detail ================= */}
                    <div className="">

                        {/* Tabs */}
                        <div className="flex gap-8 border-b border-slate-200 mb-6">
                            <Link
                                href={`?tab=active`}
                                className={`pb-4 text-sm font-medium transition relative ${activeTab === "active"
                                    ? "text-slate-900"
                                    : "text-slate-400 hover:text-slate-600"
                                    }`}
                            >
                                Active Quotes ({activeQuotes.length})
                                {activeTab === "active" && (
                                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900 rounded-full" />
                                )}
                            </Link>
                            <Link
                                href={`?tab=past`}
                                className={`pb-4 text-sm font-medium transition relative ${activeTab === "past"
                                    ? "text-slate-900"
                                    : "text-slate-400 hover:text-slate-600"
                                    }`}
                            >
                                Past Quotes
                                {activeTab === "past" && (
                                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900 rounded-full" />
                                )}
                            </Link>
                        </div>

                        {/* Summary Badge */}
                        {activeTab === "active" && activeQuotes.length > 0 && (
                            <div className="flex items-center gap-3 mb-6">
                                <span className="bg-slate-900 text-white text-xs font-semibold px-3 py-1.5 rounded-full">
                                    {activeQuotes.length} Active Requests
                                </span>
                                <span className="text-sm text-slate-500">
                                    {selectedQuote?.serviceType || ""}
                                </span>
                                <button className="ml-auto text-slate-400 hover:text-slate-600 transition">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                    </svg>
                                </button>
                            </div>
                        )}

                        {/* Quote Detail Card */}
                        {selectedQuote && displaying_selected_quote()}

                        {/* Other Quotes Accordion */}
                        {activeTab === "active" && activeQuotes.length > 1 && (
                            <div className="space-y-3 mt-8">
                                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Other Requests</h3>
                                {activeQuotes.filter((b: any) => b?.bookingId !== selectedQuote?.bookingId).map((booking: any, i: number) => {
                                    const bq = booking?.quote?.vendorQuote || {};
                                    return (
                                        <Link
                                            key={booking?.bookingId || i}
                                            href={`?tab=active&quote=${booking?.bookingId}`}
                                            className="bg-white rounded-xl p-4 shadow-sm ring-1 ring-slate-900/5 flex items-center justify-between hover:bg-slate-50/50 transition group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-xs ring-1 ring-slate-100 group-hover:ring-slate-200 transition">
                                                    📋
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-slate-900">Organizer {booking?.organizerId}</p>
                                                    <p className="text-xs text-slate-400 mt-0.5">
                                                        {formatCurrency(bq?.totalAmount || 0, booking?.payment?.currency || "PKR")} • {getStatusLabel(booking?.status)}
                                                    </p>
                                                </div>
                                            </div>
                                            <svg className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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