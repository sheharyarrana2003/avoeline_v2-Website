import { BookingServices } from "@/src/features/bookings/bookings.service";
import { BookingData, Quote, VendorQuote } from "@/src/features/bookings/types";
import { EventVendorService } from "@/src/features/event_vendors/event_venders.services";
import { EventService } from "@/src/services/event.service";
import { EventModel } from "@/src/services/models/event.model";
import Link from "next/link";
import { AcceptButton } from "./Acceptbutton";
import { VendorData } from "@/src/services/models/vendor.model";
import { notFound } from "next/navigation";
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
        'negotiating': 'bg-yellow-100 text-yellow-700 border-yellow-200',
        'new': 'bg-green-100 text-green-700 border-green-200',
        'quote_accepted': 'bg-blue-100 text-blue-700 border-blue-200',
        'confirmed': 'bg-gray-100 text-gray-700 border-gray-200',
        'completed': 'bg-gray-100 text-gray-500 border-gray-200',
        'quote_received': 'bg-green-100 text-green-700 border-green-200',
    };
    return styles[status?.toLowerCase()] || 'bg-gray-100 text-gray-600 border-gray-200';
};

const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
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
    console.log("This booking is accepteddd");
}


export default async function QuoteManagementPage({
    params,
    searchParams
}: {
    params: Promise<{ id: string, organizer_id: string, vendor_id: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const { organizer_id } = await params;
    const { vendor_id } = await params;
    const awaitedSearchParams = await searchParams;

    // Get active tab from URL (active or past)
    const activeTab = (awaitedSearchParams?.tab as string) || "active";
    const raw_bookings = await BookingServices.getAllBookingsOfOrganizer(organizer_id) || [];
    console.log("these are the bookings ,  ", raw_bookings)
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
    if(! selectedQuoteId){

    }
    const selectedQuote = displayQuotes.find((b: any) => b?.bookingId === selectedQuoteId) || null ;

    // Fetch vendor data for selected quote
    let selectedVendor = null;
    if (selectedQuote?.vendorId) {
        try {
            selectedVendor = await EventVendorService.getVendorById(selectedQuote.vendorId);
        } catch {
            selectedVendor = null;
        }
    }


    const displaying_selected_quote = () => {
         if (!selectedVendor ||  !selectedQuote) {
        console.log("selected venodr is null");
        return(
            <></>
        )

    }
        const v: VendorData = selectedVendor || null;
        const businessName = v?.businessName || selectedQuote?.vendorId || "Unknown Vendor";
        const vendorRating = v?.ratings?.averageRating || 0;
        const vendorInitials = businessName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

        const quote: Quote = selectedQuote?.quote;
        const vendorQuote: VendorQuote | null = quote?.vendorQuote;
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
        return (
            <>
                <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-200">

                    {/* Header */}
                    <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                                <span className="text-lg">🍴</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900">{businessName} - Standard Package</h3>
                                <p className="text-xs text-gray-400">
                                    Submitted {timeAgo(submittedAt)} • Proposal #{proposalNumber}
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-extrabold text-gray-900">{formatCurrency(totalAmount, currency)}</p>
                            <p className="text-xs text-gray-400">Validity: {validity ? formatDate(validity) : '7 Days'}</p>
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
                                    <>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-600">Main Course (Continental)</span>
                                            <span className="text-sm font-semibold text-gray-900">PKR 95,000</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-600">Dessert Platter (Live)</span>
                                            <span className="text-sm font-semibold text-gray-900">PKR 25,000</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-600">Service Staff (5 Pax)</span>
                                            <span className="text-sm font-semibold text-gray-900">PKR 18,000</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-600">Logistics & Setup</span>
                                            <span className="text-sm font-semibold text-gray-900">PKR 10,000</span>
                                        </div>
                                    </>
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
                                                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${isOrganizer ? 'bg-black' : 'bg-gray-300'}`} />
                                                <div>
                                                    <p className="text-xs font-bold text-gray-900">
                                                        {isOrganizer ? "You (Organizer)" : businessName}
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                                                        {n?.message || "No message"}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <>
                                        <div className="flex gap-3">
                                            <div className="w-2 h-2 rounded-full bg-gray-300 mt-2 flex-shrink-0" />
                                            <div>
                                                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                                                    "No history"
                                                </p>
                                            </div>
                                        </div>

                                    </>
                                )}

                                {/* Terms */}
                                <div className="mt-4 pt-4 border-t border-gray-100">
                                    <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Terms & Conditions</h5>
                                    <p className="text-xs text-gray-500 leading-relaxed">
                                        {terms || "50% Advance payment required. Cancellation allowed up to 48 hours before the event with 10% penalty."}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 mt-8 pt-6 border-t border-gray-100">
                        {/* <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 border border-gray-300 py-2.5 px-5 rounded-full text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                        Message Vendor
                                    </button> */}
                        <Link href={`/organizer/${organizer_id}/booking-details/${selectedQuote.bookingId}/counter-offer`} className="flex-1 sm:flex-none flex items-center justify-center gap-2 border border-gray-300 py-2.5 px-5 rounded-full text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                            Counter Offer
                        </Link>
                        {/* <button 
                                    onClick={()=>{accept_quote(selectedQuote)}}
                                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-black text-white py-2.5 px-5 rounded-full text-sm font-semibold hover:bg-gray-800 transition ml-auto">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Accept Quote
                                    </button> */}
                        <AcceptButton quote={selectedQuote} accept_quote={accept_quote} />
                    </div>
                </div>
            </>
        )
    }


    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">

                {/* Page Header */}
                <div className="mb-8">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Quote Management</h1>
                    <p className="text-sm text-gray-500 mt-1">Review vendor quotes</p>
                </div>

                <div className="">


                    {/* ================= RIGHT COLUMN: Quote List & Detail ================= */}
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
                                    {activeQuotes.length} Quotes Received
                                </span>
                                <span className="text-sm text-gray-500">
                                    {selectedQuote?.serviceType || "Catering Services"}
                                </span>
                                <button className="ml-auto text-gray-400 hover:text-gray-600">
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
                            <div className="space-y-3">
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Other Quotes</h3>
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
                                                    🍴
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900">Vendor {booking?.vendorId} </p>
                                                    <p className="text-xs text-gray-400">{formatCurrency(bq?.totalAmount , booking?.payment?.currency || "PKR")} • Pending response</p>
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

