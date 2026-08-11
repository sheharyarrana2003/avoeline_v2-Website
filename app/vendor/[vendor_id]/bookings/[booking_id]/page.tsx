import { BookingServices } from "@/src/features/bookings/bookings.service";
import { EventVendorService } from "@/src/features/event_vendors/event_venders.services";
import { EventService } from "@/src/services/event.service";
import { OrganizerService } from "@/src/services/organizer.service";
import Link from "next/link";
import { formatDate, formatTime } from "@/src/lib/datetime";
import { MediaUploadField } from "@/src/features/media/MediaUploadField";
import { formatCurrency } from "@/src/lib/money";

// --- Helper Functions ---
export default async function EventDetailsPage({ params }: { params: Promise<{ vendor_id: string, booking_id: string }> }) {
    const { vendor_id, booking_id } = await params;

    // Fetch data
    const raw_booking = await BookingServices.getBookingById(booking_id);
    console.log(raw_booking?.organizerId);

    const [organizer, vendor, event] = await Promise.all([
        OrganizerService.getOrganizerById(raw_booking?.organizerId || ''),
        EventVendorService.getVendorById(vendor_id || ''),
        EventService.getEventByID(raw_booking?.eventId || '')
    ])

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans text-gray-900">
            <div className="max-w-7xl mx-auto">

                {/* Header / Title */}
                <div className="mb-8">
                    <h1 className="text-3xl font-extrabold tracking-tight">{organizer?.organization.name || "Organizer Details"}</h1>
                </div>

                {/* Main Grid Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                    {/* ================= LEFT COLUMN (Col span 8) ================= */}
                    <div className="lg:col-span-7 xl:col-span-8 space-y-6">

                        {/* 1. BOOKING JOURNEY */}
                        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100">
                            <h3 className="text-xs font-bold text-gray-500 tracking-wider uppercase mb-6 flex items-center gap-2">
                                <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                Booking Journey
                            </h3>

                            <div className="relative pl-4 border-l-2 border-gray-100 space-y-8 mb-8">
                                {raw_booking?.statusHistory?.map((s: any, index: number) => {
                                    const isCompleted = true;
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
                                                <span className="text-sm text-gray-500 font-medium">{formatDate(s?.timestamp)}</span>
                                            </div>
                                        </div>
                                    );
                                }) || <p className="text-sm text-gray-500">No status history available.</p>}
                            </div>
                            <div className="border-t border-gray-100 pt-4 flex items-center gap-2">
                                <svg aria-hidden="true" className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                <span className="text-sm font-medium text-gray-600">Completed: <strong>{formatDate(raw_booking?.completedAt || "")}</strong></span>
                            </div>
                        </div>

                        {/* 2. SERVICE OVERVIEW */}
                        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100">
                            <h3 className="text-xs font-bold text-gray-500 tracking-wider uppercase mb-6 flex items-center gap-2">
                                <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                Service Overview
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-4">
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-1">Service Type</p>
                                    <p className="font-semibold capitalize">{raw_booking?.serviceType || 'N/A'} </p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-1">Event</p>
                                    <p className="font-semibold">{event?.title || "Event Title"}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-1">Location</p>
                                    <p className="font-semibold">{raw_booking?.requirements?.location || 'Not specified'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-1">Guest Count</p>
                                    <p className="font-semibold">{raw_booking?.requirements?.guestCount || 0} Pax</p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-1">Service Time</p>
                                    <p className="font-semibold">{formatTime(raw_booking?.requirements?.startTime || "")} - {formatTime(raw_booking?.requirements?.endTime || "")}</p>
                                </div>

                            </div>
                        </div>

                        {/* 3. DELIVERY & LOGISTICS */}
                        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xs font-bold text-gray-500 tracking-wider uppercase flex items-center gap-2">
                                    <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                                    Delivery & Logistics
                                </h3>
                                <button className="text-xs font-bold border border-gray-200 px-3 py-1.5 rounded-full hover:bg-gray-50 transition">REPORT ISSUE</button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                <div className="border border-gray-100 rounded-xl p-4">
                                    <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">Delivery Schedule</p>
                                    <p className="font-bold text-lg">{formatTime(raw_booking?.delivery?.scheduledTime || "")}</p>
                                    <p className="text-[10px] font-bold text-gray-900 mt-2 flex items-center gap-1">
                                        <svg aria-hidden="true" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                        ARRIVED {formatTime(raw_booking?.delivery?.actualDeliveryTime || "")}
                                    </p>
                                </div>

                            </div>

                        </div>

                    </div>

                    {/* ================= RIGHT COLUMN (Col span 4) ================= */}
                    <div className="lg:col-span-5 xl:col-span-4 space-y-6">

                        {/* 4. FINANCIALS */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <h3 className="text-xs font-bold text-gray-500 tracking-wider uppercase mb-4 flex justify-between items-center">
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
                                            <svg aria-hidden="true" className={`w-4 h-4 ${installment?.status === 'paid' ? 'text-gray-900' : 'text-gray-500'}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                            <span className="text-sm font-medium">{installment?.installment || 'Unknown'} Installment</span>
                                        </div>
                                        {installment?.status === 'paid'
                                            ? <span className="bg-black text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase">PAID</span>
                                            : <span className="bg-gray-200 text-gray-800 text-[10px] font-bold px-3 py-1 rounded-full uppercase">PENDING</span>
                                        }
                                    </div>
                                )) || <p className="text-sm text-gray-500">No payment schedule available.</p>}
                            </div>
                            <p className="text-center text-[10px] text-gray-500 mt-4 uppercase tracking-wider">
                                Platform Commission: {formatCurrency(raw_booking?.payment?.commission?.platformCommission || 0, raw_booking?.payment?.currency || 'PKR')} included
                            </p>
                        </div>

                        {/* 5. CONTRACT */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <h3 className="text-xs font-bold text-gray-500 tracking-wider uppercase mb-4 flex items-center gap-2">
                                <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                Contract
                            </h3>

                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <div className="border border-gray-100 p-3 rounded-xl">
                                    <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Organizer</p>
                                    <p className="text-sm font-semibold truncate text-gray-900">{raw_booking?.contract?.signedByOrganizer || 'Not signed'}</p>
                                </div>
                                <div className="border border-gray-100 p-3 rounded-xl">
                                    <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Vendor</p>
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
                            <h3 className="text-xs font-bold text-gray-500 tracking-wider uppercase mb-4 flex items-center gap-2">
                                <svg aria-hidden="true" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" /></svg>
                                Documents
                            </h3>

                         


                            <MediaUploadField
                                name="booking-images"
                                folder="booking-images"
                                multiple
                                accept="image/*,video/*,pdf/*"
                                buttonClassName="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gray-200 text-[10px] text-gray-500 transition hover:border-gray-300 disabled:opacity-60"
                            />
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}