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
        <div className="h-full w-full bg-[#f8f9fa] p-8 relative flex flex-col overflow-y-auto">

            {onClose && (
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 text-gray-400 hover:text-black transition-colors bg-gray-100 hover:bg-gray-200 p-1.5 rounded-full"
                >
                    <X size={20} />
                </button>
            )}

            {/* Header Section */}
            <div className="mb-8 pr-8">
                <div className="flex justify-between items-start mb-3">
                    <h2 className="text-[32px] leading-none font-extrabold text-slate-900 tracking-tight">
                        {fullName}
                    </h2>
                    <span className={`text-[11px] font-bold px-3 py-1.5 rounded-full tracking-wide ${isCheckedIn ? "bg-black text-white" : "bg-gray-200 text-gray-600"
                        }`}>
                        {status}
                    </span>
                </div>
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5 text-gray-500 text-sm font-medium">
                        <Mail size={15} className="text-gray-400" />
                        {email}
                    </div>
                    <div className="flex items-center gap-2.5 text-gray-500 text-sm font-medium">
                        <Phone size={15} className="text-gray-400" />
                        {phone}
                    </div>
                </div>
            </div>

            {/* Organization & Payment Card */}
            <div className="bg-[#eef0f4] rounded-[1.25rem] p-6 mb-4">
                <div className="flex justify-between items-start">
                    <div className="max-w-[65%]">
                        <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1">
                            Organization
                        </p>
                        <p className="font-bold text-gray-900 leading-snug">
                            {organization}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1">
                            Amount Paid
                        </p>
                        <p className="font-bold text-gray-900">
                            {amountPaid}
                        </p>
                    </div>
                </div>
                <div className="mt-5">
                    <span className="bg-black text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">
                        {ticketType}
                    </span>
                </div>
            </div>

            {/* Dynamic Check-in Status Card */}
            {isCheckedIn ? (
                <div className="bg-white border border-gray-100 rounded-[1.25rem] p-5 shadow-sm flex items-center gap-4 mb-8">
                    <div className="bg-gray-50 w-10 h-10 rounded-full flex items-center justify-center shrink-0">
                        <CheckCircle2 size={20} className="text-black" />
                    </div>
                    <div>
                        <p className="font-bold text-slate-900 text-sm mb-0.5">Checked In at {checkInTime}</p>
                        <p className="text-xs text-gray-400 font-medium">Method: {checkInMethod} • Desk {checkInDesk}</p>
                    </div>
                </div>
            ) : (
                <div className="bg-white border border-gray-100 rounded-[1.25rem] p-5 shadow-sm flex items-center gap-4 mb-8 opacity-70">
                    <div className="bg-gray-50 w-10 h-10 rounded-full flex items-center justify-center shrink-0">
                        <Clock size={20} className="text-gray-400" />
                    </div>
                    <div>
                        <p className="font-bold text-gray-500 text-sm mb-0.5">Not Checked In Yet</p>
                        <p className="text-xs text-gray-400 font-medium">Awaiting arrival</p>
                    </div>
                </div>
            )}

            {/* Registration Responses Section */}
            <div>
                <h3 className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest mb-5">
                    Registration Responses
                </h3>
{/* 
                <div className="grid grid-cols-2 gap-y-6 gap-x-4 mb-6">
                    <div>
                        <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1">Dietary Preference</p>
                        <p className="text-sm font-medium text-slate-900">{dietaryPreference}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1">Experience Level</p>
                        <p className="text-sm font-medium text-slate-900">{experienceLevel}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1">T-Shirt Size</p>
                        <p className="text-sm font-medium text-slate-900">{tShirtSize}</p>
                    </div>
                    <div>
                        <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1">Referral</p>
                        <p className="text-sm font-medium text-slate-900">{referral}</p>
                    </div>
                </div> */}
            </div>

            {/* QR Code Section */}
            <div className="bg-white border border-gray-100 rounded-[1.25rem] p-8 shadow-sm flex flex-col items-center mt-2 mb-8">
                <div className="w-28 h-28 bg-[#f4f5f7] rounded-xl flex items-center justify-center mb-5 relative overflow-hidden">
                    {/* Decorative mockup triangle */}
                    <div className="absolute top-0 right-0 w-16 h-16 bg-white/50 transform rotate-45 translate-x-8 -translate-y-8"></div>
                    <QrCode size={32} className="text-gray-300" />
                </div>
                <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-2">
                    Unique Access Key
                </p>
                <div className="flex gap-4">
                    <button className="text-[13px] font-bold text-slate-700 underline decoration-gray-300 underline-offset-4 hover:text-black">
                        Download QR
                    </button>
                    <button className="text-[13px] font-bold text-slate-700 underline decoration-gray-300 underline-offset-4 hover:text-black">
                        Resend Email
                    </button>
                </div>
            </div>

            {/* Spacer to push buttons to bottom if container is tall */}
            <div className="flex-grow"></div>

            {/* Bottom Actions */}
            <div className="flex gap-3 mt-4">
                <button className="flex-1 bg-[#0a0a0a] text-white font-bold text-sm rounded-xl py-4 hover:bg-black transition-colors shadow-md">
                    SEND ANNOUNCEMENT
                </button>
                <button className="px-4 border border-gray-200 bg-transparent rounded-xl text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all">
                    <Trash2 size={20} />
                </button>
            </div>

        </div>
    );
}