import { BookingServices } from "@/src/features/bookings/bookings.service";
import { BookingData, Quote, VendorQuote } from "@/src/features/bookings/types";
import { EventVendorService } from "@/src/features/event_vendors/event_venders.services";
import { EventService } from "@/src/services/event.service";
import { NotificationServices } from "@/src/services/notification.services";
import { revalidatePath } from "next/cache";
import { EventModel } from "@/src/services/models/event.model";
import Link from "next/link";
import { AcceptQuoteButton } from "@/src/features/bookings/components/AcceptQuoteButton";
import { ok, fail, type ActionResult } from "@/src/lib/action";
import { VendorData } from "@/src/services/models/vendor.model";
import { notFound } from "next/navigation";
import { formatDate, timeAgo } from "@/src/lib/datetime";
import { formatCurrency } from "@/src/lib/money";

function sanitizeForClient<T>(obj: T): T {
    if (!obj) return obj;
    return JSON.parse(JSON.stringify(obj, (key, value) => {
        // Convert Firestore Timestamps {_seconds, _nanoseconds} to ISO string
        if (value && typeof value === 'object' && '_seconds' in value) {
            return new Date(value._seconds * 1000).toISOString();
        }
        return value;
    }));
}

const accept_quote = async (booking: BookingData): Promise<ActionResult> => {
    'use server'
    try {
    const new_status_history = {
        status: 'quote_accepted',
        timestamp: new Date().toISOString()
    }

    booking?.statusHistory.push(new_status_history);
    booking.status = 'quote_accepted'
    await BookingServices.update_booking(booking);

    // Recipient read back from Firestore, not taken from the `booking` argument:
    // that argument arrives from a Client Component (see Acceptbutton.tsx), so its
    // vendorId is caller-controlled and would let anyone address an arbitrary
    // vendor's inbox.
    // ponytail: this action still has no ownership check at all — a pre-existing
    // gap, tracked separately. Whoever adds one should authorize on the re-read
    // doc and drop the client-supplied booking entirely.
    const fresh = await BookingServices.getBookingById(booking.bookingId);
    if (fresh) {
        await NotificationServices.createNotification({
            userId: fresh.vendorId,
            type: "booking_confirmation",
            title: "Quote accepted",
            message: "The organizer accepted your quote.",
            deepLink: `/vendor/${fresh.vendorId}/quotes/${fresh.bookingId}`,
        });
    }

    // Without these the write lands but nothing on screen changes, so accepting a
    // quote looks like it did nothing. Refresh the organizer's own list, and the
    // vendor's views under "layout" scope so their header unread badge picks up
    // the notification just written above.
    const target = fresh ?? booking;
    revalidatePath(`/organizer/${target.organizerId}/quotes`);
    revalidatePath(`/vendor/${target.vendorId}`, "layout");
    return ok();
    } catch (err) {
        console.error("[accept_quote:organizer]", err);
        return fail("Could not accept the quote. Please try again.");
    }
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
                <div className="bg-white rounded-xl p-6 md:p-8 shadow-sm ring-1 ring-gray-900/5">

                    {/* Header */}
                    <div className="flex items-start justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center ring-1 ring-indigo-100">
                                <span className="text-xl">🍴</span>
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900 text-lg">{businessName} - Standard Package</h3>
                                <p className="text-sm text-gray-400 mt-0.5">
                                    Submitted {timeAgo(submittedAt)} • Proposal #{proposalNumber}
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-bold text-gray-900 tracking-tight">{formatCurrency(totalAmount, currency)}</p>
                            <p className="text-sm text-gray-400 mt-1">Validity: {validity ? formatDate(validity) : '7 Days'}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        {/* Itemized Pricing */}
                        <div>
                            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-5">Itemized Pricing</h4>
                            <div className="space-y-4">
                                {breakdown.length > 0 ? (
                                    breakdown.map((item: any, i: number) => (
                                        <div key={i} className="flex justify-between items-center py-2">
                                            <span className="text-sm text-gray-600">{item?.item || 'Item'}</span>
                                            <span className="text-sm font-semibold text-gray-900">{formatCurrency(item?.total || 0, currency)}</span>
                                        </div>
                                    ))
                                ) : (
                                    <>
                                        <div className="flex justify-between items-center py-2">
                                            <span className="text-sm text-gray-600">Main Course (Continental)</span>
                                            <span className="text-sm font-semibold text-gray-900">PKR 95,000</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2">
                                            <span className="text-sm text-gray-600">Dessert Platter (Live)</span>
                                            <span className="text-sm font-semibold text-gray-900">PKR 25,000</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2">
                                            <span className="text-sm text-gray-600">Service Staff (5 Pax)</span>
                                            <span className="text-sm font-semibold text-gray-900">PKR 18,000</span>
                                        </div>
                                        <div className="flex justify-between items-center py-2">
                                            <span className="text-sm text-gray-600">Logistics & Setup</span>
                                            <span className="text-sm font-semibold text-gray-900">PKR 10,000</span>
                                        </div>
                                    </>
                                )}

                                <div className="border-t border-gray-100 pt-4 mt-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-semibold text-gray-900">Total Amount</span>
                                        <span className="text-xl font-bold text-gray-900">{formatCurrency(totalAmount, currency)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Negotiation History */}
                        <div>
                            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-5">Negotiation History</h4>
                            <div className="space-y-5">
                                {negotiations.length > 0 ? (
                                    negotiations.map((n: any, i: number) => {
                                        const isOrganizer = n?.from === "organizer";
                                        return (
                                            <div key={i} className="flex gap-3">
                                                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${isOrganizer ? 'bg-indigo-500' : 'bg-gray-300'}`} />
                                                <div>
                                                    <p className="text-xs font-semibold text-gray-900">
                                                        {isOrganizer ? "You (Organizer)" : businessName}
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
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
                                                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                                                    "No history"
                                                </p>
                                            </div>
                                        </div>

                                    </>
                                )}

                                {/* Terms */}
                                <div className="mt-6 pt-6 border-t border-gray-100">
                                    <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Terms & Conditions</h5>
                                    <p className="text-xs text-gray-500 leading-relaxed">
                                        {terms || "50% Advance payment required. Cancellation allowed up to 48 hours before the event with 10% penalty."}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 mt-10 pt-8 border-t border-gray-100">
                        {/* <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 border border-gray-200 py-2.5 px-5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
                                        <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                        Message Vendor
                                    </button> */}
                        <Link href={`/organizer/${organizer_id}/booking-details/${selectedQuote.bookingId}/counter-offer`} className="flex-1 sm:flex-none flex items-center justify-center gap-2 border border-gray-200 py-2.5 px-5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
                            <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                            Counter Offer
                        </Link>
                        {/* <button 
                                    onClick={()=>{accept_quote(selectedQuote)}}
                                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gray-900 text-white py-2.5 px-5 rounded-lg text-sm font-medium hover:bg-gray-800 transition ml-auto">
                                        <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Accept Quote
                                    </button> */}
                       <AcceptQuoteButton quote={sanitizeForClient(selectedQuote)} accept_quote={accept_quote} />
                    </div>
                </div>
            </>
        )
    }


    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-5xl mx-auto px-4 md:px-8 py-10">

                {/* Page Header */}
                <div className="mb-10">
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Quote Management</h1>
                    <p className="text-base text-gray-500 mt-2">Review vendor quotes</p>
                </div>

                <div className="">


                    {/* ================= RIGHT COLUMN: Quote List & Detail ================= */}
                    <div className="">

                        {/* Tabs */}
                        <div className="flex gap-8 border-b border-gray-200 mb-6">
                            <Link
                                href={`?tab=active`}
                                className={`pb-4 text-sm font-medium transition relative ${activeTab === "active"
                                    ? "text-gray-900"
                                    : "text-gray-400 hover:text-gray-600"
                                    }`}
                            >
                                Active Quotes ({activeQuotes.length})
                                {activeTab === "active" && (
                                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 rounded-full" />
                                )}
                            </Link>
                            <Link
                                href={`?tab=past`}
                                className={`pb-4 text-sm font-medium transition relative ${activeTab === "past"
                                    ? "text-gray-900"
                                    : "text-gray-400 hover:text-gray-600"
                                    }`}
                            >
                                Past Quotes
                                {activeTab === "past" && (
                                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 rounded-full" />
                                )}
                            </Link>
                        </div>

                        {/* Summary Badge */}
                        {activeTab === "active" && activeQuotes.length > 0 && (
                            <div className="flex items-center gap-3 mb-6">
                                <span className="bg-gray-900 text-white text-xs font-semibold px-3 py-1.5 rounded-full">
                                    {activeQuotes.length} Quotes Received
                                </span>
                                <span className="text-sm text-gray-500">
                                    {selectedQuote?.serviceType || "Catering Services"}
                                </span>
                                <button className="ml-auto text-gray-400 hover:text-gray-600 transition">
                                    <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Other Quotes</h3>
                                {activeQuotes.filter((b: any) => b?.bookingId !== selectedQuote?.bookingId).map((booking: any, i: number) => {
                                    const bq = booking?.quote?.vendorQuote || {};
                                    return (
                                        <Link
                                            key={booking?.bookingId || i}
                                            href={`?tab=active&quote=${booking?.bookingId}`}
                                            className="bg-white rounded-xl p-4 shadow-sm ring-1 ring-gray-900/5 flex items-center justify-between hover:bg-gray-50/50 transition group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-xs ring-1 ring-gray-100 group-hover:ring-gray-200 transition">
                                                    🍴
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">Vendor {booking?.vendorId} </p>
                                                    <p className="text-xs text-gray-400 mt-0.5">{formatCurrency(bq?.totalAmount , booking?.payment?.currency || "PKR")} • Pending response</p>
                                                </div>
                                            </div>
                                            <svg aria-hidden="true" className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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