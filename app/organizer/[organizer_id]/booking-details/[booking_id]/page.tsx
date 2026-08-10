import { BookingServices } from "@/src/features/bookings/bookings.service";
import { BookingData } from "@/src/features/bookings/types";
import { EventVendorService } from "@/src/features/event_vendors/event_venders.services";
import { EventService } from "@/src/services/event.service";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDate, formatTime } from "@/src/lib/datetime";
import { FeedbackService } from "@/src/services/feedback.service";
import { OrganizerReviewForm } from "@/src/features/bookings/components/OrganizerReviewForm";
import { formatCurrency } from "@/src/lib/money";

const STAR_PATH =
    "M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z";

function Stars({ rating }: { rating: number }) {
    return (
        <div className="flex">
            {[1, 2, 3, 4, 5].map((s) => (
                <svg aria-hidden="true" key={s} className={`h-4 w-4 ${s <= rating ? "fill-gray-900" : "fill-gray-200"}`} viewBox="0 0 20 20">
                    <path d={STAR_PATH} />
                </svg>
            ))}
        </div>
    );
}

// --- Helper Functions ---
export default async function EventDetailsPage({ params }: { params: Promise<{ organizer_id: string, booking_id: string }> }) {
    const { organizer_id, booking_id } = await params;

    // Fetch data
    const raw_booking : BookingData | null= await BookingServices.getBookingById(booking_id);
    if(!raw_booking){
        // raw_booking is null
        notFound();
    }


    const [vendor,event,existingReview] = await Promise.all([
        EventVendorService.getVendorById(raw_booking?.vendorId || ''),
         EventService.getEventByID(raw_booking?.eventId || ''),
         FeedbackService.getVendorReviewByBooking(booking_id)
    ])

    const isCompleted = raw_booking?.status === "completed";

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans text-gray-900">
            <div className="max-w-7xl mx-auto">

                {/* Header / Title */}
                <div className="mb-8">
                    <h1 className="text-3xl font-extrabold tracking-tight">{vendor?.businessName || "Vendor Details"}</h1>
                </div>

                {/* Main Grid Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                    {/* ================= LEFT COLUMN (Col span 8) ================= */}
                    <div className="lg:col-span-7 xl:col-span-8 space-y-6">

                        {/* 1. BOOKING JOURNEY */}
                        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100">
                            <h3 className="text-xs font-bold text-gray-400 tracking-wider uppercase mb-6 flex items-center gap-2">
                                <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                Booking Journey
                            </h3>

                            <div className="relative pl-4 border-l-2 border-gray-100 space-y-8 mb-8">
                                {raw_booking?.statusHistory?.map((s: any, index: number) => {
                                    const isCompleted = true
                                    return (
                                        <div key={index} className="relative">
                                            {/* Timeline Dot */}
                                            <div className="absolute -left-[25px] bg-white p-1 rounded-full">
                                                <div className={`w-4 h-4 rounded-full flex items-center justify-center ${isCompleted ? 'bg-black text-white' : 'border-2 border-gray-300'}`}>
                                                    {isCompleted && <svg aria-hidden="true" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                                </div>
                                            </div>

                                            <div className="flex justify-between items-start ml-4">
                                                <div>
                                                    <h4 className="font-bold text-gray-900 capitalize">{s?.status?.replace('_', ' ') || 'Unknown Status'}</h4>
                                                    <p className="text-sm text-gray-500 mt-0.5">Status updated</p>
                                                </div>
                                                <span className="text-sm text-gray-400 font-medium">{formatDate(s?.timestamp)}</span>
                                            </div>
                                        </div>
                                    );
                                }) || <p className="text-sm text-gray-400">No status history available.</p>}
                            </div>
                            <div className="border-t border-gray-100 pt-4 flex items-center gap-2">
                                <svg aria-hidden="true" className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                <span className="text-sm font-medium text-gray-600">Completed: <strong>{formatDate(raw_booking?.completedAt || "")}</strong></span>
                            </div>
                        </div>

                        {/* 2. SERVICE OVERVIEW */}
                        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100">
                            <h3 className="text-xs font-bold text-gray-400 tracking-wider uppercase mb-6 flex items-center gap-2">
                                <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                Service Overview
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-4">
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">Service Type</p>
                                    <p className="font-semibold capitalize">{raw_booking?.serviceType || 'N/A'} - Corporate</p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">Event</p>
                                    <p className="font-semibold">{event?.title || "TechVerse Hackathon 2026"}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">Location</p>
                                    <p className="font-semibold">{raw_booking?.requirements?.location || 'Not specified'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">Guest Count</p>
                                    <p className="font-semibold">{raw_booking?.requirements?.guestCount || 0} Pax</p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">Service Time</p>
                                    <p className="font-semibold">{formatTime(raw_booking?.requirements?.startTime)} - {formatTime(raw_booking?.requirements?.endTime)}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">Special Requirements</p>
                                    <div className="flex gap-2 mt-1">
                                        <span className="bg-gray-100 text-gray-700 text-[10px] font-bold px-2 py-1 rounded">VEGETARIAN</span>
                                        <span className="bg-gray-100 text-gray-700 text-[10px] font-bold px-2 py-1 rounded">GLUTEN-FREE</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 3. VENDOR REVIEW */}
                        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100">
                            <h3 className="text-xs font-bold text-gray-400 tracking-wider uppercase mb-6 flex items-center gap-2">
                                <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                                Your Review
                            </h3>

                            {existingReview ? (
                                <div className="rounded-xl bg-gray-50 p-5">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Stars rating={existingReview.rating} />
                                        <span className="text-sm font-bold text-gray-900">{existingReview.rating}.0</span>
                                        <span className="ml-auto text-xs text-gray-400">
                                            {existingReview.createdAt ? formatDate(existingReview.createdAt) : ''}
                                        </span>
                                    </div>
                                    {existingReview.title && (
                                        <p className="text-sm font-bold text-gray-900 mb-1">{existingReview.title}</p>
                                    )}
                                    <p className="text-sm text-gray-600 leading-relaxed">{existingReview.comment}</p>
                                    <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                        Published on {vendor?.businessName || "the vendor"}&apos;s profile
                                    </p>
                                </div>
                            ) : isCompleted ? (
                                <OrganizerReviewForm
                                    bookingId={booking_id}
                                    organizerId={organizer_id}
                                    vendorId={raw_booking?.vendorId || ''}
                                    vendorName={vendor?.businessName || "this vendor"}
                                />
                            ) : (
                                <p className="text-sm text-gray-400">
                                    You can review this vendor once the booking is completed.
                                </p>
                            )}
                        </div>

                    </div>

                    {/* ================= RIGHT COLUMN (Col span 4) ================= */}
                    <div className="lg:col-span-5 xl:col-span-4 space-y-6">

                        {/* 4. FINANCIALS */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <h3 className="text-xs font-bold text-gray-400 tracking-wider uppercase mb-4 flex justify-between items-center">
                                <span className="flex items-center gap-2">
                                    <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    Financials
                                </span>
                                <span className="text-[10px]">AGREED BUDGET</span>
                            </h3>

                            <div className="mb-6 flex justify-between items-end">
                                <h2 className="text-3xl font-extrabold">{formatCurrency(raw_booking?.payment?.totalAmount || 0, raw_booking?.payment?.currency || 'PKR')}</h2>
                            </div>

                            <div className="space-y-3">
                                {raw_booking?.payment?.paymentSchedule?.map((installment: any, i: number) => (
                                    <div key={i} className="flex justify-between items-center p-3 border border-gray-100 rounded-xl bg-gray-50">
                                        <div className="flex items-center gap-2">
                                            <svg aria-hidden="true" className={`w-4 h-4 ${installment?.status === 'paid' ? 'text-gray-900' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                            <span className="text-sm font-medium">{installment?.installment || 'Unknown'} Installment</span>
                                        </div>
                                        {installment?.status === 'paid'
                                            ? <span className="bg-black text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase">PAID</span>
                                            : <span className="bg-gray-200 text-gray-800 text-[10px] font-bold px-3 py-1 rounded-full uppercase">PENDING</span>
                                        }
                                    </div>
                                )) || <p className="text-sm text-gray-400">No payment schedule available.</p>}
                            </div>
                            <p className="text-center text-[10px] text-gray-400 mt-4 uppercase tracking-wider">
                                Platform Commission: {formatCurrency(raw_booking?.payment?.commission?.platformCommission || 0, raw_booking?.payment?.currency || 'PKR')} included
                            </p>
                        </div>

                        {/* 5. CONTRACT */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <h3 className="text-xs font-bold text-gray-400 tracking-wider uppercase mb-4 flex items-center gap-2">
                                <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                Contract
                            </h3>

                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <div className="border border-gray-100 p-3 rounded-xl">
                                    <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Organizer</p>
                                    <p className="text-sm font-semibold truncate text-gray-900">{raw_booking?.contract?.signedByOrganizer || 'Not signed'}</p>
                                </div>
                                <div className="border border-gray-100 p-3 rounded-xl">
                                    <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Vendor</p>
                                    <p className="text-sm font-semibold truncate text-gray-900">{vendor?.businessName || 'Unknown Vendor'}</p>
                                </div>
                            </div>

                            {raw_booking?.contract?.signed ? (
                                <Link href={raw_booking?.contract?.contractUrl || '#'} target="_blank" className="w-full block text-center bg-black hover:bg-gray-800 transition-colors text-white py-3 rounded-xl font-bold text-sm">
                                    VIEW CONTRACT PDF
                                </Link>
                            ) : (
                                <button disabled className="w-full bg-gray-200 text-gray-500 py-3 rounded-xl font-bold text-sm cursor-not-allowed">
                                    CONTRACT PENDING
                                </button>
                            )}

                            <ul className="mt-4 space-y-2">
                                <li className="text-xs text-gray-500 flex items-start gap-2">
                                    <span className="text-gray-300">•</span> {raw_booking?.contract?.terms?.cancellationPolicy || 'No cancellation policy specified.'}
                                </li>
                                <li className="text-xs text-gray-500 flex items-start gap-2">
                                    <span className="text-gray-300">•</span> {raw_booking?.contract?.terms?.liability || 'No liability terms specified.'}
                                </li>
                            </ul>
                        </div>



                        {/* 7. DOCUMENTS */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <h3 className="text-xs font-bold text-gray-400 tracking-wider uppercase mb-4 flex items-center gap-2">
                                <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" /></svg>
                                Documents
                            </h3>

                            <div className="space-y-3 mb-4">
                                <Link href={raw_booking?.documents?.quotePdf || '#'} target="_blank" className="flex justify-between items-center p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition group">
                                    <div className="flex items-center gap-3">
                                        <svg aria-hidden="true" className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                        <div>
                                        </div>
                                    </div>
                                    <svg aria-hidden="true" className="w-4 h-4 text-gray-300 group-hover:text-black transition" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                </Link>

                                <Link href={raw_booking?.documents?.invoicePdf || '#'} target="_blank" className="flex justify-between items-center p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition group">
                                    <div className="flex items-center gap-3">
                                        <svg aria-hidden="true" className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                        <div>
                                        </div>
                                    </div>
                                    <svg aria-hidden="true" className="w-4 h-4 text-gray-300 group-hover:text-black transition" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                </Link>
                            </div>

                            <button className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-xs font-bold text-gray-400 uppercase tracking-wider hover:border-gray-300 hover:text-gray-600 transition">
                                + Upload Document
                            </button>
                        </div>



                    </div>
                </div>
            </div>
        </div>
    );
}