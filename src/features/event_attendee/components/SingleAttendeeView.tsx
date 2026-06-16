"use client"
import { Attendee } from "../type";
import { User } from "@/src/services/models/user.type";

import { Mail, Phone, CheckCircle2, Trash2, X, QrCode, Clock } from "lucide-react";

import { useState } from "react";
interface SingleAttendeeViewProps {
    a: Attendee,
    user: User
}

export function SingleAttendeeView({ combined_data, onClose }: { combined_data: SingleAttendeeViewProps, onClose: () => void }) {
    // 1. Safely extract core data
  const a = combined_data?.a || {} as any;
    const u = combined_data?.user || {} as any;

    const fullName = u?.profile?.fullName || a?.name || "Unknown Attendee";
    const email = u?.email || "No email provided";
    const phone = u?.profile?.phoneNumber  || "No phone provided"; 
    
        //!these things are not present in the schema but front end pa dispkay ho raha
        //! amount paid tak nai addeddd

    // const organization = a?.academic?.university || a?.organization || u?.profile?.company || "Not Provided";
    // const amountPaid = a?.amountPaid != null ? `PKR ${a.amountPaid}` : "N/A"; 
    // const ticketType = a?.academic?.isStudentVerified ? "STUDENT PASS" : (a?.ticketType || "STANDARD PASS");

    const organization = a?.academic?.university || "Not Provided";
    const amountPaid = "N?A";
    const ticketType ="Standard";
    
    const status = (u?.accountStatus === "active" ? "REGISTERED" : "PENDING");

    const isCheckedIn =  status === "CHECKED_IN" ;
    const dietaryPreference= "N/A";

    //!these things are not present in the schema but front end pa dispkay ho raha
    // const checkInTime = a?.checkInTime || "N/A";
    // const checkInMethod = a?.checkInMethod || "N/A";
    // const checkInDesk = a?.checkInDesk || "N/A";

     const checkInTime =  "N/A";
    const checkInMethod =  "N/A";
    const checkInDesk = "N/A";

    const department = a?.academic?.department || "Not Specified";
    const studentId = a?.academic?.studentId || "Not Specified";
    const gradYear = a?.academic?.graduationYear || "Not Specified";
    const locationInfo = u?.location ? `${u.location.city}, ${u.location.country}` : "Not Specified";
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
                <div className="mt-5">
                    <span className="bg-black text-white text-[9px] font-extrabold px-3 py-1.5 rounded-full uppercase tracking-wider shadow-sm">
                        {ticketType}
                    </span>
                </div>
            </div>

            {/* Check-in Status Card */}
            {isCheckedIn && (
                <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm flex items-center gap-4 mb-8">
                    <div className="w-10 h-10 rounded-full border-2 border-gray-100 flex items-center justify-center shrink-0">
                        <CheckCircle2 size={20} className="text-black" />
                    </div>
                    <div>
                        <p className="font-extrabold text-slate-900 text-[14px] mb-0.5">Checked In at {checkInTime}</p>
                        <p className="text-xs text-gray-400 font-medium">Method: {checkInMethod} • Desk {checkInDesk}</p>
                    </div>
                </div>
            )}

            {/* Registration Responses Section */}
            <div>
                <h3 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-4">
                    REGISTRATION RESPONSES
                </h3>
                <div className="grid grid-cols-2 gap-y-5 gap-x-4 mb-6">
                    <div>
                        <p className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest mb-1">DIETARY PREFERENCE</p>
                        <p className="text-[13px] font-bold text-slate-900">Vegetarian</p>
                    </div>
                    <div>
                        <p className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest mb-1">EXPERIENCE LEVEL</p>
                        <p className="text-[13px] font-bold text-slate-900">Intermediate</p>
                    </div>
                    <div>
                        <p className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest mb-1">T-SHIRT SIZE</p>
                        <p className="text-[13px] font-bold text-slate-900">Large (L)</p>
                    </div>
                    <div>
                        <p className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest mb-1">REFERRAL</p>
                        <p className="text-[13px] font-bold text-slate-900">Social Media</p>
                    </div>
                </div>
            </div>

            {/* QR Code Section */}
            <div className="bg-[#f8f9fa] border border-gray-200/60 rounded-3xl p-8 shadow-sm flex flex-col items-center mb-6">
                <div className="w-24 h-24 bg-[#e4e7ed] rounded-xl flex items-center justify-center mb-5">
                    <QrCode size={32} className="text-gray-400" />
                </div>
                <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-3">
                    UNIQUE ACCESS KEY
                </p>
                <div className="flex gap-4">
                    <button className="text-[12px] font-extrabold text-slate-800 underline decoration-gray-300 underline-offset-4 hover:text-black">
                        Download QR
                    </button>
                    <button className="text-[12px] font-extrabold text-slate-800 underline decoration-gray-300 underline-offset-4 hover:text-black">
                        Resend Email
                    </button>
                </div>
            </div>

            <div className="flex-grow"></div>

            {/* Bottom Actions */}
            <div className="flex gap-3 mt-4 pt-4">
                <button className="flex-1 bg-[#0a0a0a] text-white font-extrabold text-[11px] uppercase tracking-wider rounded-2xl py-4 hover:bg-black transition-colors shadow-lg">
                    SEND ANNOUNCEMENT
                </button>
                <button className="px-5 border border-gray-300 bg-white rounded-2xl text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all shadow-sm">
                    <Trash2 size={18} />
                </button>
            </div>
        </div>
    );
}