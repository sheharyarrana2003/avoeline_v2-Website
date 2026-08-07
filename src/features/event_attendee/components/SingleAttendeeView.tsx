"use client"
import { Registration } from "@/src/services/models/reg.type";
import { Attendee } from "../type";
import { User } from "@/src/services/models/user.type";

import { 
    Mail, Phone, CheckCircle2, Trash2, X, Clock, 
    CreditCard, Tag, Award, MessageSquare, ShieldCheck, 
    Smartphone, History, ChevronDown, Star, Calendar, Ban
} from "lucide-react";

import { useState } from "react";
import { AttendeeClientSideProp } from "./AttendeeClientSide";
import { formatDateTime } from "@/src/lib/datetime";

interface SingleAttendeeViewProps {
    combined_data: AttendeeClientSideProp;
    onClose: () => void;
    update_registration?: (updatedRegistration: Registration) => Promise<void> | void;
}

const STATUS_OPTIONS: Registration["status"][] = [
    "pending",
    "confirmed",
    "checked_in",
    "attended",
    "cancelled",
    "no_show",
    "awaiting_payment",
];

const PAYMENT_STATUS_OPTIONS: Registration["payment"]["paymentStatus"][] = [
    "pending",
    "completed",
    "failed",
    "refunded",
];

function formatCurrency(amount: number | null | undefined, currency: string) {
    const value = amount ?? 0;
    return `${currency} ${value.toLocaleString("en-US")}`;
}

export function SingleAttendeeView({ 
    combined_data, 
    onClose, 
    update_registration 
}: SingleAttendeeViewProps) {
    // 1. Safely extract core data
    const a = combined_data?.a || {} as any;
    const u = combined_data?.user || {} as any;
    const r = combined_data?.register || {} as any;

    // State for local registration updates
    const [registration, setRegistration] = useState<Registration>(r);
    const [isUpdating, setIsUpdating] = useState(false);

    const fullName = u?.profile?.fullName || "Unknown Attendee";
    const email = u?.email || "No email provided";
    const phone = u?.profile?.phoneNumber || "No phone provided"; 
    
    const organization = a?.academic?.university || "Not Provided";
    const currency = registration?.payment?.currency || "PKR";

    const amountPaid = registration?.payment?.amountPaid ?? 0;
    const finalPrice = registration?.finalPrice ?? amountPaid;
    const ticketType = registration?.pricingTier || "General";
    const discount = registration?.discountApplied;

    const isCheckedIn = Boolean(registration?.checkIn?.checkedIn) || registration?.status === "checked_in";

    const checkInTime = registration?.checkIn?.checkInTime ? formatDateTime(registration.checkIn.checkInTime) : null;
    const checkInMethod = registration?.checkIn?.checkInMethod
        ? registration.checkIn.checkInMethod.replace("_", " ")
        : "—";

    const department = a?.academic?.department || "Not Specified";
    const gradYear = a?.academic?.graduationYear || "Not Specified";
    const locationInfo = u?.location ? `${u.location.city}, ${u.location.country}` : "Not Specified";

    const registeredOn = registration?.registrationDate ? formatDateTime(registration.registrationDate) : null;
    const cancelledOn = registration?.cancelledAt ? formatDateTime(registration.cancelledAt) : null;

    // Handler to handle status change and invoke prop
    const handleStatusChange = async (newStatus: Registration["status"]) => {
        const updated = {
            ...registration,
            status: newStatus,
            statusHistory: [
                ...(registration.statusHistory || []),
                { status: newStatus, timestamp: new Date().toISOString() }
            ]
        };
        setRegistration(updated);

        if (update_registration) {
            setIsUpdating(true);
            try {
                await update_registration(updated);
            } catch (err) {
                console.error("Failed to update registration status:", err);
            } finally {
                setIsUpdating(false);
            }
        }
    };

    // Handler to handle payment status change and invoke prop
    const handlePaymentStatusChange = async (newPaymentStatus: Registration["payment"]["paymentStatus"]) => {
        const updated = {
            ...registration,
            payment: {
                ...registration.payment,
                paymentStatus: newPaymentStatus,
            },
        };
        setRegistration(updated);

        if (update_registration) {
            setIsUpdating(true);
            try {
                await update_registration(updated);
            } catch (err) {
                console.error("Failed to update payment status:", err);
            } finally {
                setIsUpdating(false);
            }
        }
    };

    return (
        <div className="h-full w-full bg-gray-100 p-8 relative flex flex-col overflow-y-auto">
            {onClose && (
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 text-gray-400 hover:text-black transition-colors"
                >
                    <X size={20} />
                </button>
            )}

            {/* Header Section */}
            <div className="mb-6 pr-8">
                <div className="flex justify-between items-start mb-2">
                    <h2 className="text-[32px] leading-none font-black text-slate-900 tracking-tight">
                        {fullName}
                    </h2>
                    {isCheckedIn && (
                        <span className="bg-black text-white text-[10px] font-extrabold px-3 py-1.5 rounded-full tracking-wider uppercase mt-1">
                            CHECKED IN
                        </span>
                    )}
                </div>
                <div className="space-y-1 mt-3">
                    <div className="flex items-center gap-2.5 text-gray-500 text-[13px] font-medium">
                        <Mail size={14} className="text-gray-400" />
                        {email}
                    </div>
                    <div className="flex items-center gap-2.5 text-gray-500 text-[13px] font-medium">
                        <Phone size={14} className="text-gray-400" />
                        {phone}
                    </div>
                </div>
            </div>

            {/* Organizer Controls: Registration Status Dropdown */}
            <div className="bg-white rounded-2xl p-4 mb-6 shadow-sm border border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                    <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">
                        REGISTRATION STATUS
                    </p>
                    <p className="text-xs text-stone-500">Change attendee registration state</p>
                </div>
                <div className="relative">
                    <select
                        value={registration.status || "pending"}
                        disabled={isUpdating}
                        onChange={(e) => handleStatusChange(e.target.value as Registration["status"])}
                        className="appearance-none bg-stone-100 text-stone-900 font-extrabold text-[12px] uppercase tracking-wider px-4 py-2 pr-8 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black cursor-pointer disabled:opacity-50"
                    >
                        {STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                                {status.replace("_", " ")}
                            </option>
                        ))}
                    </select>
                    <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-500 pointer-events-none" />
                </div>
            </div>

            {/* Organization & Ticket Card */}
            <div className="bg-gray-200 rounded-3xl p-6 mb-4 shadow-sm border border-gray-300/30">
                <div className="flex justify-between items-start">
                    <div className="max-w-[65%]">
                        <p className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest mb-1.5">
                            ORGANIZATION
                        </p>
                        <p className="font-extrabold text-slate-900 text-[13px] leading-tight pr-4">
                            {organization}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest mb-1.5">
                            FINAL PRICE
                        </p>
                        <p className="font-black text-slate-900 text-[14px]">
                            {formatCurrency(finalPrice, currency)}
                        </p>
                    </div>
                </div>
                <div className="mt-5 flex gap-2 items-center flex-wrap">
                    <span className="bg-black text-white text-[9px] font-extrabold px-3 py-1.5 rounded-full uppercase tracking-wider shadow-sm">
                        {ticketType}
                    </span>
                    {registration?.registrationSource && (
                        <span className="bg-stone-200 text-stone-700 text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                            Source: {registration.registrationSource.replace("_", " ")}
                        </span>
                    )}
                </div>
            </div>

            {/* Check-in Status Card */}
            {isCheckedIn && (
                <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 rounded-full border-2 border-gray-100 flex items-center justify-center shrink-0">
                        <CheckCircle2 size={20} className="text-black" />
                    </div>
                    <div>
                        <p className="font-extrabold text-slate-900 text-[14px] mb-0.5">Checked In{checkInTime ? ` at ${checkInTime}` : ""}</p>
                        <p className="text-xs text-gray-400 font-medium capitalize">Method: {checkInMethod}</p>
                    </div>
                </div>
            )}

            {/* DETAILED REGISTRATION DATA BREAKDOWN */}
            <div className="space-y-4 mb-6">
                
                {/* 1. Academic & User Profile Info */}
                <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-200/60">
                    <h3 className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        Academic Details
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                            <span className="text-gray-400 font-medium block">Department</span>
                            <span className="font-bold text-slate-800">{department}</span>
                        </div>
                        <div>
                            <span className="text-gray-400 font-medium block">Graduation Year</span>
                            <span className="font-bold text-slate-800">{gradYear}</span>
                        </div>
                        <div className="col-span-2">
                            <span className="text-gray-400 font-medium block">Location</span>
                            <span className="font-bold text-slate-800">{locationInfo}</span>
                        </div>
                    </div>
                </div>

                {/* 2. Payment, Pricing & Discount Breakdown */}
                <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-200/60">
                    <h3 className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <CreditCard size={14} /> Payment & Pricing
                    </h3>

                    <div className="grid grid-cols-2 gap-3 text-xs mb-1">
                        <div>
                            <span className="text-gray-400 font-medium block">Payment Method</span>
                            <span className="font-bold text-slate-800 uppercase">
                                {registration?.payment?.paymentMethod?.replace("_", " ") || "N/A"}
                            </span>
                        </div>
                        <div>
                            <span className="text-gray-400 font-medium block mb-1">Payment Status</span>
                            <div className="relative inline-block">
                                <select
                                    value={registration?.payment?.paymentStatus || "pending"}
                                    disabled={isUpdating}
                                    onChange={(e) => handlePaymentStatusChange(e.target.value as Registration["payment"]["paymentStatus"])}
                                    className="appearance-none bg-stone-100 text-slate-900 font-extrabold text-[11px] uppercase tracking-wider pl-3 pr-7 py-1.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black cursor-pointer disabled:opacity-50"
                                >
                                    {PAYMENT_STATUS_OPTIONS.map((status) => (
                                        <option key={status} value={status}>
                                            {status}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-500 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {/* Pricing summary block - grouped together */}
                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-2 text-xs">
                        {discount && (
                            <div className="flex justify-between items-center text-slate-500">
                                <span>Original Price</span>
                                <span className="line-through">{formatCurrency(discount.originalPrice, currency)}</span>
                            </div>
                        )}

                        {discount && (
                            <div className="flex justify-between items-center bg-emerald-50 text-emerald-700 font-bold px-3 py-2 rounded-xl">
                                <span className="flex items-center gap-1.5">
                                    <Tag size={12} /> {discount.type} Discount
                                </span>
                                <span>-{discount.percentage}%</span>
                            </div>
                        )}

                        <div className="flex justify-between items-center font-bold text-slate-800 pt-1">
                            <span>Final Price</span>
                            <span>{formatCurrency(finalPrice, currency)}</span>
                        </div>

                        <div className="flex justify-between items-center font-black text-slate-900">
                            <span>Amount Paid</span>
                            <span>{formatCurrency(amountPaid, currency)}</span>
                        </div>

                        {finalPrice > amountPaid && (
                            <div className="flex justify-between items-center text-red-500 font-semibold">
                                <span>Balance Due</span>
                                <span>{formatCurrency(finalPrice - amountPaid, currency)}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. Certificate Info */}
                {registration?.certificate && (
                    <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-200/60">
                        <h3 className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Award size={14} /> Certificate Info
                        </h3>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                                <span className="text-gray-400 font-medium block">Status</span>
                                <span className="font-bold text-slate-800">{registration.certificate.issued ? "Issued" : "Not Issued"}</span>
                            </div>
                            <div>
                                <span className="text-gray-400 font-medium block">Type</span>
                                <span className="font-bold text-slate-800 capitalize">{registration.certificate.type || "N/A"}</span>
                            </div>
                            {registration.certificate.issueDate && (
                                <div>
                                    <span className="text-gray-400 font-medium block">Issue Date</span>
                                    <span className="font-bold text-slate-800">{formatDateTime(registration.certificate.issueDate) || "-"}</span>
                                </div>
                            )}
                           
                        </div>
                    </div>
                )}

                {/* 4. Communication Log */}
                <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-200/60">
                    <h3 className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <MessageSquare size={14} /> Communication History
                    </h3>
                    {registration?.communications && registration.communications.length > 0 ? (
                        <div className="space-y-2">
                            {registration.communications.map((comm, idx) => (
                                <div key={idx} className="flex justify-between items-center text-xs p-2 bg-stone-50 rounded-xl">
                                    <div>
                                        <p className="font-bold text-slate-800 capitalize">{comm.type.replace("_", " ")}</p>
                                        <p className="text-[10px] text-gray-400 capitalize">{comm.channel} • {formatDateTime(comm.sentAt)}</p>
                                    </div>
                                    <span className="font-bold uppercase text-[10px] px-2 py-0.5 rounded bg-stone-200">
                                        {comm.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-gray-400">No communication logs available.</p>
                    )}
                </div>

                {/* 5. Feedback */}
                {registration?.feedbackSubmitted && (
                    <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-200/60">
                        <h3 className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Star size={14} /> Feedback
                        </h3>
                        <div className="flex items-center gap-2 text-xs">
                            <span className="text-gray-400 font-medium">Rating:</span>
                            <span className="font-bold text-slate-800">{registration.rating ? `${registration.rating} / 5` : "Not rated"}</span>
                        </div>
                    </div>
                )}

             
            </div>
        </div>
    );
}