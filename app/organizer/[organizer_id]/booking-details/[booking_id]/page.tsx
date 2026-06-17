import { BookingServices } from "@/src/features/bookings/bookings.service";
import { EventVendorService } from "@/src/features/event_vendors/event_venders.services";
import { EventService } from "@/src/services/event.service";
import Link from "next/link";

// --- Helper Functions ---
const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-PK', {
        style: 'currency',
        currency: currency || 'PKR',
        maximumFractionDigits: 0,
    }).format(amount || 0);
};

const formatDate = (dateString: string) => {
    if (!dateString) return "Pending";
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const formatTime = (timeString: string) => {
    if (!timeString) return "";
    // Handles standard "13:00" string or ISO dates
    if (timeString.includes('T')) {
        return new Date(timeString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

export default async function EventDetailsPage({ params }: { params: Promise<{ organizer_id: string, booking_id: string }> }) {
    const { organizer_id, booking_id } = await params;

    // Fetch data
    const raw_booking = await BookingServices.getBookingById(booking_id);
    const vendor = await EventVendorService.getVendorById(raw_booking?.vendorId || '');
    const event = await EventService.getEventByID(raw_booking?.eventId || '');

    return (
        <div className="min-h-screen bg-[#f8f9fa] p-4 md:p-8 font-sans text-gray-900">
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
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                Booking Journey
                            </h3>

                            <div className="relative pl-4 border-l-2 border-gray-100 space-y-8 mb-8">
                                {raw_booking?.statusHistory?.map((s: any, index: number) => {
                                    const isCompleted = true; // Based on your mock data, they are all in the past
                                    return (
                                        <div key={index} className="relative">
                                            {/* Timeline Dot */}
                                            <div className="absolute -left-[25px] bg-white p-1 rounded-full">
                                                <div className={`w-4 h-4 rounded-full flex items-center justify-center ${isCompleted ? 'bg-black text-white' : 'border-2 border-gray-300'}`}>
                                                    {isCompleted && <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
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
                                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                <span className="text-sm font-medium text-gray-600">Completed: <strong>{formatDate(raw_booking?.completedAt)}</strong></span>
                            </div>
                        </div>

                        {/* 2. SERVICE OVERVIEW */}
                        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100">
                            <h3 className="text-xs font-bold text-gray-400 tracking-wider uppercase mb-6 flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
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

                        {/* 3. DELIVERY & LOGISTICS */}
                        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xs font-bold text-gray-400 tracking-wider uppercase flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                                    Delivery & Logistics
                                </h3>
                                <button className="text-xs font-bold border border-gray-200 px-3 py-1.5 rounded-full hover:bg-gray-50 transition">REPORT ISSUE</button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                <div className="border border-gray-100 rounded-xl p-4">
                                    <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Delivery Schedule</p>
                                    <p className="font-bold text-lg">{formatTime(raw_booking?.delivery?.scheduledTime)}</p>
                                    <p className="text-[10px] font-bold text-green-600 mt-2 flex items-center gap-1">
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                        ARRIVED {formatTime(raw_booking?.delivery?.actualDeliveryTime)}
                                    </p>
                                </div>
                                <div className="border border-gray-100 rounded-xl p-4">
                                    <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Setup Completion</p>
                                    <p className="font-bold text-lg">12:30 PM</p>
                                    <p className="text-[10px] font-bold text-gray-500 mt-2">COMPLETED</p>
                                </div>
                                <div className="border border-gray-100 rounded-xl p-4">
                                    <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Teardown Schedule</p>
                                    <p className="font-bold text-lg">06:00 PM</p>
                                    <p className="text-[10px] font-bold text-gray-500 mt-2">COMPLETED</p>
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-xl p-4 flex gap-3 text-sm text-gray-600">
                                <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                <p>"{raw_booking?.delivery?.deliveryNotes || 'No delivery notes provided.'}"</p>
                            </div>
                        </div>

                    </div>

                    {/* ================= RIGHT COLUMN (Col span 4) ================= */}
                    <div className="lg:col-span-5 xl:col-span-4 space-y-6">

                        {/* 4. FINANCIALS */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <h3 className="text-xs font-bold text-gray-400 tracking-wider uppercase mb-4 flex justify-between items-center">
                                <span className="flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
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
                                            <svg className={`w-4 h-4 ${installment?.status === 'paid' ? 'text-green-500' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
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
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
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

                        {/* 6. CHAT PREVIEW */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col">
                            <h3 className="text-xs font-bold text-gray-400 tracking-wider uppercase mb-6 flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                Chat Preview
                            </h3>

                            {/* Chat Messages Area */}
                            <div className="flex-1 space-y-4 mb-4 overflow-y-auto max-h-[300px] pr-2">
                                {raw_booking?.communications?.map((msg: any, index: number) => {
                                    const isOrganizer = msg.from === "organizer";

                                    return (
                                        <div key={index} className={`flex gap-3 items-end ${isOrganizer ? 'justify-start' : 'justify-end'}`}>

                                            {/* Organizer Avatar (Left) */}
                                            {isOrganizer && (
                                                <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden flex items-center justify-center">
                                                    <span className="text-xs font-bold text-gray-500">
                                                        {raw_booking?.contract?.signedByOrganizer?.charAt(0) || "O"}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Chat Bubble */}
                                            <div className={`p-4 rounded-2xl max-w-[85%] ${isOrganizer
                                                    ? 'bg-[#f8f9fa] rounded-bl-none text-left'
                                                    : 'bg-black rounded-br-none text-right'
                                                }`}>
                                                <p className={`text-sm font-bold mb-1 ${isOrganizer ? 'text-gray-900' : 'text-white'}`}>
                                                    {isOrganizer ? (raw_booking?.contract?.signedByOrganizer || "Organizer") : (vendor?.businessName || "Vendor")}
                                                </p>
                                                <p className={`text-sm ${isOrganizer ? 'text-gray-600' : 'text-gray-300'}`}>
                                                    {msg.message}
                                                </p>
                                            </div>

                                            {/* Vendor Avatar (Right) */}
                                            {!isOrganizer && (
                                                <div className="w-8 h-8 rounded-full bg-black flex-shrink-0 flex items-center justify-center text-white">
                                                    <span className="text-[10px] font-bold">
                                                        {vendor?.businessName?.substring(0, 2).toUpperCase() || "V"}
                                                    </span>
                                                </div>
                                            )}

                                        </div>
                                    );
                                })}

                                {/* Fallback if communications array is empty */}
                                {(!raw_booking?.communications || raw_booking.communications.length === 0) && (
                                    <p className="text-center text-sm text-gray-400 italic py-4">No messages yet.</p>
                                )}
                            </div>

                            {/* Chat Input Area */}
                            <div className="flex gap-2 items-center mt-2 border-t border-gray-50 pt-4">
                                <div className="flex-1 bg-gray-50 border border-gray-100 rounded-full px-5 py-3">
                                    <input
                                        type="text"
                                        placeholder="Type a message..."
                                        className="bg-transparent w-full outline-none text-sm text-gray-700 placeholder-gray-400"
                                        disabled // Disabled since it's a server component displaying a preview
                                    />
                                </div>
                                <button className="w-11 h-11 rounded-full bg-black flex items-center justify-center flex-shrink-0 hover:bg-gray-800 transition-colors">
                                    <svg className="w-4 h-4 text-white ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* 7. DOCUMENTS */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <h3 className="text-xs font-bold text-gray-400 tracking-wider uppercase mb-4 flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" /></svg>
                                Documents
                            </h3>

                            <div className="space-y-3 mb-4">
                                <Link href={raw_booking?.documents?.quotePdf || '#'} target="_blank" className="flex justify-between items-center p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition group">
                                    <div className="flex items-center gap-3">
                                        <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-800">Booking_Quote.pdf</p>
                                            <p className="text-xs text-gray-400">PDF Document</p>
                                        </div>
                                    </div>
                                    <svg className="w-4 h-4 text-gray-300 group-hover:text-black transition" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                </Link>

                                <Link href={raw_booking?.documents?.invoicePdf || '#'} target="_blank" className="flex justify-between items-center p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition group">
                                    <div className="flex items-center gap-3">
                                        <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-800">Final_Invoice.pdf</p>
                                            <p className="text-xs text-gray-400">PDF Document</p>
                                        </div>
                                    </div>
                                    <svg className="w-4 h-4 text-gray-300 group-hover:text-black transition" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                </Link>
                            </div>

                            <button className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-xs font-bold text-gray-400 uppercase tracking-wider hover:border-gray-300 hover:text-gray-600 transition">
                                + Upload Document
                            </button>
                        </div>

                        {/* 8. QUALITY CONTROL */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <h3 className="text-xs font-bold text-gray-400 tracking-wider uppercase mb-5 flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                </svg>
                                Quality Control
                            </h3>

                            <div className="space-y-3 mb-6">

                                {/* Organizer Check */}
                                {raw_booking?.qualityCheck?.organizerCheck?.checked ? (
                                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Organizer Review</span>
                                            <div className="flex gap-0.5">
                                                {[...Array(5)].map((_, i) => (
                                                    <svg
                                                        key={i}
                                                        className={`w-3.5 h-3.5 ${i < (raw_booking?.qualityCheck?.organizerCheck?.rating || 0) ? 'text-yellow-400' : 'text-gray-200'}`}
                                                        fill="currentColor"
                                                        viewBox="0 0 20 20"
                                                    >
                                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                    </svg>
                                                ))}
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-700 italic">"{raw_booking?.qualityCheck?.organizerCheck?.comments || 'No comments provided.'}"</p>
                                        <p className="text-[9px] text-gray-400 mt-2 font-medium">
                                            Checked on: {raw_booking?.qualityCheck?.organizerCheck?.checkedAt ? new Date(raw_booking.qualityCheck.organizerCheck.checkedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                                        </p>
                                    </div>
                                ) : null}

                                {/* Vendor Self Check */}
                                {raw_booking?.qualityCheck?.vendorSelfCheck?.completed ? (
                                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5">Vendor Report</span>
                                        <p className="text-xs text-gray-700">"{raw_booking?.qualityCheck?.vendorSelfCheck?.report || 'No report provided.'}"</p>
                                    </div>
                                ) : null}

                            </div>

                            <button className="w-full border border-gray-200 text-gray-600 font-bold text-xs uppercase tracking-wider py-3 rounded-xl hover:bg-gray-50 hover:text-black transition-colors">
                                Report A Quality Issue
                            </button>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}