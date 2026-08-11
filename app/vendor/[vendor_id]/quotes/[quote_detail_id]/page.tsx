import { BookingServices } from "@/src/features/bookings/bookings.service";
import { EventService } from "@/src/services/event.service";
import Link from "next/link";
import { formatDate, formatTime, formatDateTime, parseScheduleDateTime, timeAgo } from "@/src/lib/datetime";
import { formatCurrency } from "@/src/lib/money";

// --- Helper Functions ---
const getDaysRemaining = (validityDate: string="") => {
    if (!validityDate) return null;
    // validity is stored DD/MM/YYYY (or legacy ISO) — new Date() can't parse
    // DD/MM, so use the shared parser.
    const validity = parseScheduleDateTime(validityDate, "");
    if (!validity) return null;
    const now = new Date();
    const diffMs = validity.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { label: 'Expired', urgent: true };
    if (diffDays === 0) return { label: 'Deadline: Today', urgent: true };
    if (diffDays === 1) return { label: 'Deadline: Tomorrow', urgent: true };
    return { label: `${diffDays} days remaining`, urgent: false };
};

export default async function QuoteDetailPage({
    params
}: {
    params: Promise<{ vendor_id: string; quote_detail_id: string }>
}) {
    const { vendor_id, quote_detail_id } = await params;

    const booking = await BookingServices.getBookingById(quote_detail_id);

    if (!booking) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Quote Not Found</h1>
                    <p className="text-gray-500 mb-4">The requested quote could not be found.</p>
                    <Link
                        href={`/vendor/${vendor_id}/quotes`}
                        className="bg-black text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-gray-800 transition"
                    >
                        Back to Quotes
                    </Link>
                </div>
            </div>
        );
    }

    let event = null;
    try {
        event = await EventService.getEventByID(booking.eventId);
    } catch {
        // Event not found
    }

    // Fetch organizer details (mock - replace with actual service)
    // const organizer = await UserService.getUserById(booking.organizerId);

    // Extract booking data with fallbacks
    const b = booking;
    const requirements = b?.requirements ;
    const quote = b?.quote ;
    const vendorQuote = quote?.vendorQuote ;
    const breakdown = vendorQuote?.breakdown || [];
    const negotiation = quote?.negotiation || [];
    const contract = b?.contract || {};
    const payment = b?.payment || {};
    const delivery = b?.delivery || {};
    const qualityCheck = b?.qualityCheck || {};
    const communications = b?.communications || [];
    const documents = b?.documents || {};
    const review = b?.review || {};

    const eventTitle = event?.title || b?.eventId || "Unknown Event";
    const eventDate = requirements?.serviceDate || event?.schedule?.startDate;
    const organizerName = b?.organizerId === "org_001" ? "Dr. Sarah Khan" : b?.organizerId;
    const organizerEmail = "s.khan@techverse.io";
    const organizerPhone = "(555) 123-4567";

    const deadline = getDaysRemaining(vendorQuote?.validity ||"");

    // Mock attachments (in real app, these would come from booking documents or a separate attachments field)
    const attachments = [
        { name: "Floor_Plan.pdf", size: "2.4 MB", url: documents?.quotePdf || "#" },
        { name: "Menu_Requirements.docx", size: "1.1 MB", url: "#" },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-4xl mx-auto px-4 md:px-8 py-8">

                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
                    <Link href={`/vendor/${vendor_id}`} className="hover:text-gray-700">Inbox</Link>
                    <span>/</span>
                    <Link href={`/vendor/${vendor_id}/quotes`} className="hover:text-gray-700">Quote Requests</Link>
                </div>

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Inbox</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage and respond to incoming event inquiries.</p>
                </div>

                {/* Quote Detail Card */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">

                    {/* Card Header */}
                    <div className="p-6 md:p-8 border-b border-gray-100">
                        <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4">
                                <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center flex-shrink-0">
                                    <svg aria-hidden="true" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Expanded View</span>
                                    <h2 className="text-xl font-bold text-gray-900 mt-0.5">{eventTitle}</h2>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Request ID: #{b?.bookingId} • Event Date: {formatDate(eventDate || "")}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button className="px-5 py-2.5 border border-gray-200 rounded-full text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">
                                    Decline
                                </button>
                                <Link
                                    href={`/vendor/${vendor_id}/quotes/prep-quote/${quote_detail_id}`}
                                    className="px-5 py-2.5 bg-black text-white rounded-full text-sm font-semibold hover:bg-gray-800 transition"
                                >
                                    Prepare Quote
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-6 md:p-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                            {/* Left: Full Requirements */}
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Full Requirements</h3>
                                    <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                                        {requirements?.description || "No description provided."}
                                    </p>
                                </div>

                                {/* Special Instructions */}
                                {requirements?.specialInstructions && (
                                    <div>
                                        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Special Instructions</h3>
                                        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                                            <p className="text-sm text-gray-600 leading-relaxed">
                                                "{requirements.specialInstructions}"
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Service Details */}
                                <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                                    <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-4">Service Details</h3>
                                    <div className="space-y-3">
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-500">Service Type</span>
                                            <span className="text-sm font-semibold text-gray-900 capitalize">{b?.serviceType || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-500">Service Date</span>
                                            <span className="text-sm font-semibold text-gray-900">{formatDate(requirements?.serviceDate)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-500">Time</span>
                                            <span className="text-sm font-semibold text-gray-900">{formatTime(requirements?.startTime)} - {formatTime(requirements?.endTime)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-500">Location</span>
                                            <span className="text-sm font-semibold text-gray-900">{requirements?.location || 'TBD'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-sm text-gray-500">Guest Count</span>
                                            <span className="text-sm font-semibold text-gray-900">{requirements?.guestCount || 0} participants</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Negotiation History */}
                                {negotiation.length > 0 && (
                                    <div>
                                        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Negotiation History</h3>
                                        <div className="space-y-3">
                                            {negotiation.map((n: any, i: number) => (
                                                <div key={i} className={`flex gap-3 p-4 rounded-2xl ${n?.from === 'organizer' ? 'bg-gray-50 border border-gray-100' : 'bg-gray-50 border border-gray-200'}`}>
                                                    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${n?.from === 'organizer' ? 'bg-gray-400' : 'bg-gray-900'}`} />
                                                    <div>
                                                        <p className="text-xs font-bold text-gray-700 capitalize">{n?.from === 'organizer' ? 'Organizer' : 'You (Vendor)'}</p>
                                                        <p className="text-sm text-gray-600 mt-1">{n?.message}</p>
                                                        <p className="text-[10px] text-gray-500 mt-1">{timeAgo(n?.timestamp)}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Communications */}
                                {communications.length > 0 && (
                                    <div>
                                        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Communications</h3>
                                        <div className="space-y-3">
                                            {communications.map((comm: any, i: number) => (
                                                <div key={i} className="flex gap-3 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                                                    <div className="w-2 h-2 rounded-full bg-gray-400 mt-2 flex-shrink-0" />
                                                    <div>
                                                        <p className="text-xs font-bold text-gray-700 capitalize">{comm?.from} → {comm?.to}</p>
                                                        <p className="text-sm text-gray-600 mt-1">{comm?.message}</p>
                                                        <p className="text-[10px] text-gray-500 mt-1">{timeAgo(comm?.timestamp)}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right: Attachments & Contact */}
                            <div className="space-y-6">

                                {/* Attachments */}
                                <div>
                                    <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Attachments</h3>
                                    <div className="space-y-3">
                                        {attachments.map((file, i) => (
                                            <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-gray-100 transition">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                                                        <svg aria-hidden="true" className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                        </svg>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-gray-900">{file.name}</p>
                                                        <p className="text-xs text-gray-500">{file.size}</p>
                                                    </div>
                                                </div>
                                                <a href={file.url} target="_blank" className="text-gray-500 hover:text-gray-600 transition">
                                                    <svg aria-hidden="true" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                    </svg>
                                                </a>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Contact Info */}
                                <div>
                                    <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Contact Info</h3>
                                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-sm font-bold text-gray-600">
                                                {organizerName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900">{organizerName}</p>
                                                <p className="text-xs text-gray-500">{organizerEmail} • {organizerPhone}</p>
                                            </div>
                                        </div>
                                        <button className="px-4 py-2 border border-gray-200 rounded-full text-xs font-semibold text-gray-700 hover:bg-white transition">
                                            Contact
                                        </button>
                                    </div>
                                </div>

                                {/* Quote Summary (if quote exists) */}
                                {vendorQuote?.totalAmount || 0> 0 && (
                                    <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                                        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-4">Current Quote</h3>
                                        <div className="space-y-3">
                                            <div className="flex justify-between">
                                                <span className="text-sm text-gray-500">Base Price</span>
                                                <span className="text-sm font-semibold text-gray-900">{formatCurrency(vendorQuote?.basePrice || 0)}</span>
                                            </div>

                                            {vendorQuote?.additionalCharges?.map((charge: any, i: number) => (
                                                <div key={i} className="flex justify-between">
                                                    <span className="text-sm text-gray-500">{charge?.description}</span>
                                                    <span className="text-sm font-semibold text-gray-900">+{formatCurrency(charge?.amount)}</span>
                                                </div>
                                            ))}

                                            {vendorQuote?.discount || 0 > 0 && (
                                                <div className="flex justify-between">
                                                    <span className="text-sm text-gray-500">Discount</span>
                                                    <span className="text-sm font-semibold text-gray-900">-{formatCurrency(vendorQuote?.discount || 0)}</span>
                                                </div>
                                            )}

                                            <div className="border-t border-gray-200 pt-3">
                                                <div className="flex justify-between">
                                                    <span className="text-sm font-bold text-gray-900">Total Amount</span>
                                                    <span className="text-lg font-bold text-gray-900">{formatCurrency(vendorQuote?.totalAmount)}</span>
                                                </div>
                                            </div>

                                            {vendorQuote?.terms && (
                                                <p className="text-xs text-gray-500 mt-2">{vendorQuote.terms}</p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Payment Status */}
                                {payment?.paymentSchedule && payment.paymentSchedule.length > 0 && (
                                    <div>
                                        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Payment Schedule</h3>
                                        <div className="space-y-2">
                                            {payment.paymentSchedule.map((inst: any, i: number) => (
                                                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2 h-2 rounded-full ${inst?.status === 'paid' ? 'bg-gray-900' : 'bg-gray-300'}`} />
                                                        <span className="text-sm font-medium text-gray-700">{inst?.installment}</span>
                                                    </div>
                                                    <span className="text-sm font-semibold text-gray-900">{formatCurrency(inst?.amount)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Delivery Status */}
                                {delivery?.scheduledDate && (
                                    <div>
                                        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Delivery</h3>
                                        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                                            <div className="space-y-2">
                                                <div className="flex justify-between">
                                                    <span className="text-sm text-gray-500">Scheduled</span>
                                                    <span className="text-sm font-semibold text-gray-900">{formatDate(delivery?.scheduledDate)} at {formatTime(delivery?.scheduledTime)}</span>
                                                </div>
                                                {delivery?.actualDeliveryTime && (
                                                    <div className="flex justify-between">
                                                        <span className="text-sm text-gray-500">Actual</span>
                                                        <span className="text-sm font-semibold text-gray-900">{delivery?.actualDeliveryTime}</span>
                                                    </div>
                                                )}
                                                {delivery?.deliveryNotes && (
                                                    <p className="text-xs text-gray-500 mt-2">"{delivery.deliveryNotes}"</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Quality Check */}
                                {qualityCheck?.organizerCheck?.checked && (
                                    <div>
                                        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Quality Review</h3>
                                        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="flex">
                                                    {[...Array(5)].map((_, i) => (
                                                        <svg aria-hidden="true" key={i} className={`w-4 h-4 ${i < (qualityCheck.organizerCheck?.rating || 0) ? 'text-gray-900 fill-gray-900' : 'text-gray-300 fill-gray-300'}`} viewBox="0 0 20 20">
                                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                        </svg>
                                                    ))}
                                                </div>
                                                <span className="text-sm font-bold text-gray-900">{qualityCheck.organizerCheck?.rating}/5</span>
                                            </div>
                                            <p className="text-sm text-gray-600">"{qualityCheck.organizerCheck?.comments}"</p>
                                        </div>
                                    </div>
                                )}

                                {/* Documents */}
                                {documents && (documents.quotePdf || documents.invoicePdf || documents.receiptPdf) && (
                                    <div>
                                        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3">Documents</h3>
                                        <div className="space-y-2">
                                            {documents.quotePdf && (
                                                <a href={documents.quotePdf} target="_blank" className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100 hover:bg-gray-100 transition">
                                                    <svg aria-hidden="true" className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                    <span className="text-sm font-medium text-gray-700">Quote PDF</span>
                                                </a>
                                            )}
                                            {documents.invoicePdf && (
                                                <a href={documents.invoicePdf} target="_blank" className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100 hover:bg-gray-100 transition">
                                                    <svg aria-hidden="true" className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                    <span className="text-sm font-medium text-gray-700">Invoice PDF</span>
                                                </a>
                                            )}
                                            {documents.receiptPdf && (
                                                <a href={documents.receiptPdf} target="_blank" className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100 hover:bg-gray-100 transition">
                                                    <svg aria-hidden="true" className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                    </svg>
                                                    <span className="text-sm font-medium text-gray-700">Receipt PDF</span>
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                )}

                            </div>
                        </div>
                    </div>

                    {/* Card Footer */}
                    <div className="px-6 md:px-8 py-4 border-t border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <svg aria-hidden="true" className="w-4 h-4 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {deadline ? (
                                <span className={`text-sm font-semibold ${deadline.urgent ? 'text-gray-900' : 'text-gray-600'}`}>
                                    {deadline.label}
                                </span>
                            ) : (
                                <span className="text-sm text-gray-500">No deadline set</span>
                            )}
                        </div>
                        <button className="text-gray-500 hover:text-gray-600 transition">
                            <svg aria-hidden="true" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Status History Timeline */}
                {b?.statusHistory && b.statusHistory.length > 0 && (
                    <div className="mt-8 bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
                        <h3 className="text-sm font-bold text-gray-900 mb-6">Status History</h3>
                        <div className="relative pl-4 border-l-2 border-gray-100 space-y-6">
                            {b.statusHistory.map((s: any, index: number) => (
                                <div key={index} className="relative">
                                    <div className="absolute -left-[25px] bg-white p-1 rounded-full">
                                        <div className="w-3 h-3 rounded-full bg-black" />
                                    </div>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-bold text-sm text-gray-900 capitalize">{s?.status?.replace('_', ' ')}</h4>
                                            <p className="text-xs text-gray-500 mt-0.5">Status updated</p>
                                        </div>
                                        <span className="text-xs text-gray-500">{formatDateTime(s?.timestamp)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}