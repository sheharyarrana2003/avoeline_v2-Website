"use client"
import { Registration } from "@/src/services/models/reg.type";
import { Attendee } from "../type";
import { User } from "@/src/services/models/user.type";

import { 
    Mail, Phone, CheckCircle2, Trash2, X, QrCode, Clock, 
    CreditCard, Tag, Award, MessageSquare, ShieldCheck, 
    Smartphone, History, ChevronDown 
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
    const amountPaid = `${currency} ${(registration?.payment?.amountPaid ?? 0).toLocaleString("en-US")}`;
    const ticketType = registration?.pricingTier || "General";

    const isCheckedIn = Boolean(registration?.checkIn?.checkedIn) || registration?.status === "checked_in";

    const checkInTime = registration?.checkIn?.checkInTime ? formatDateTime(registration.checkIn.checkInTime) : null;
    const checkInMethod = registration?.checkIn?.checkInMethod || "—";
    const checkInDesk = registration?.checkIn?.deviceId || "—";

    const department = a?.academic?.department || "Not Specified";
    const studentId = a?.academic?.studentId || "Not Specified";
    const gradYear = a?.academic?.graduationYear || "Not Specified";
    const locationInfo = u?.location ? `${u.location.city}, ${u.location.country}` : "Not Specified";

    // Handler to handle status change and invoke prop
    const handleStatusChange = async (newStatus: Registration["status"]) => {
        console.log("about to change")
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

    return (
        <div className="h-full w-full bg-[#eef0f4] p-8 relative flex flex-col overflow-y-auto">
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

            {/* Organization & Payment Card */}
            <div className="bg-[#e4e7ed] rounded-3xl p-6 mb-4 shadow-sm border border-gray-300/30">
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
                            AMOUNT PAID
                        </p>
                        <p className="font-black text-slate-900 text-[14px]">
                            {amountPaid}
                        </p>
                    </div>
                </div>
                <div className="mt-5 flex gap-2 items-center flex-wrap">
                    <span className="bg-black text-white text-[9px] font-extrabold px-3 py-1.5 rounded-full uppercase tracking-wider shadow-sm">
                        {ticketType}
                    </span>
                    {registration?.registrationSource && (
                        <span className="bg-stone-200 text-stone-700 text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                            Source: {registration.registrationSource}
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
                        <p className="text-xs text-gray-400 font-medium">Method: {checkInMethod} • Desk {checkInDesk}</p>
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
                            <span className="text-gray-400 font-medium block">Student ID</span>
                            <span className="font-bold text-slate-800">{studentId}</span>
                        </div>
                        <div>
                            <span className="text-gray-400 font-medium block">Graduation Year</span>
                            <span className="font-bold text-slate-800">{gradYear}</span>
                        </div>
                        <div>
                            <span className="text-gray-400 font-medium block">Location</span>
                            <span className="font-bold text-slate-800">{locationInfo}</span>
                        </div>
                    </div>
                </div>

                {/* 2. Detailed Payment & Discount Info */}
                <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-200/60">
                    <h3 className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <CreditCard size={14} /> Payment & Billing Details
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-xs mb-3">
                        <div>
                            <span className="text-gray-400 font-medium block">Payment ID</span>
                            <span className="font-mono text-slate-800 font-semibold">{registration?.payment?.paymentId || "N/A"}</span>
                        </div>
                        <div>
                            <span className="text-gray-400 font-medium block">Method</span>
                            <span className="font-bold text-slate-800 uppercase">{registration?.payment?.paymentMethod || "N/A"}</span>
                        </div>
                        <div>
                            <span className="text-gray-400 font-medium block">Payment Status</span>
                            <span className="font-extrabold text-slate-900 uppercase">{registration?.payment?.paymentStatus || "N/A"}</span>
                        </div>
                        <div>
                            <span className="text-gray-400 font-medium block">Transaction ID</span>
                            <span className="font-mono text-slate-800 font-semibold">{registration?.payment?.transactionId || "N/A"}</span>
                        </div>
                    </div>

                    {registration?.discountApplied && (
                        <div className="mt-3 pt-3 border-t border-gray-100 text-xs">
                            <span className="text-stone-500 font-medium flex items-center gap-1.5 mb-1">
                                <Tag size={12} /> Discount Applied ({registration.discountApplied.type}):
                            </span>
                            <div className="flex justify-between font-bold text-slate-800">
                                <span>{registration.discountApplied.percentage}% OFF</span>
                                <span>
                                    <span className="line-through text-gray-400 mr-2">{registration.discountApplied.originalPrice}</span>
                                    {registration.discountApplied.discountedPrice} {currency}
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* 3. QR Code & Ticket Info */}
                {registration?.qrCode && (
                    <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-200/60">
                        <h3 className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <QrCode size={14} /> Ticket QR Code
                        </h3>
                        <div className="flex items-center gap-4">
                            {registration.qrCode.imageUrl ? (
                                <img 
                                    src={registration.qrCode.imageUrl} 
                                    alt="QR Code" 
                                    className="w-20 h-20 border rounded-xl p-1 bg-stone-50"
                                />
                            ) : (
                                <div className="w-20 h-20 rounded-xl bg-stone-100 flex items-center justify-center text-xs text-stone-400">
                                    No Image
                                </div>
                            )}
                            <div className="space-y-1 text-xs">
                                <p className="font-bold text-slate-800">Scans: {registration.qrCode.scanCount || 0}</p>
                                <p className="text-gray-500">
                                    Last Scanned: {registration.qrCode.lastScanned ? formatDateTime(registration.qrCode.lastScanned) : "Never"}
                                </p>
                                <p className="font-mono text-[10px] text-gray-400 truncate max-w-[180px]">
                                    Data: {registration.qrCode.data || "—"}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. Certificate Info */}
                {registration?.certificate && (
                    <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-200/60">
                        <h3 className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Award size={14} /> Certificate Info
                        </h3>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                                <span className="text-gray-400 font-medium block">Issued Status</span>
                                <span className="font-bold text-slate-800">{registration.certificate.issued ? "Issued" : "Not Issued"}</span>
                            </div>
                            <div>
                                <span className="text-gray-400 font-medium block">Certificate ID</span>
                                <span className="font-mono text-slate-800">{registration.certificate.certificateId || "N/A"}</span>
                            </div>
                            {registration.certificate.downloadUrl && (
                                <div className="col-span-2 pt-1">
                                    <a 
                                        href={registration.certificate.downloadUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="text-blue-600 hover:underline font-bold text-xs"
                                    >
                                        Download Certificate
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 5. Communication Log & Metadata */}
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
                                        <p className="text-[10px] text-gray-400">{comm.channel} • {formatDateTime(comm.sentAt)}</p>
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

                {/* 6. Metadata & Device Log */}
                {registration?.metadata && (
                    <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-200/60 text-xs">
                        <h3 className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Smartphone size={14} /> Device & System Metadata
                        </h3>
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <div>
                                <span className="text-gray-400">Device:</span> <span className="font-semibold text-slate-700">{registration.metadata.deviceType}</span>
                            </div>
                            <div>
                                <span className="text-gray-400">IP:</span> <span className="font-mono text-slate-700">{registration.metadata.ipAddress}</span>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}