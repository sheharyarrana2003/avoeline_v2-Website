"use client"


import { User, Calendar, Clock, MapPin, ChevronDown, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
export default function CreateAgendaForm(handle_agenda_submission : any) {
    const router = useRouter();
    const handle_submission_client_side = ()=>{
        handle_agenda_submission()
    }

    return (
        <>
            <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] w-full max-w-4xl p-8 border border-gray-100">

                {/* Header */}
                <div className="flex justify-between items-center px-8 py-6 border-b border-gray-50">
                    <h2 className="text-xl font-bold text-gray-900">Add New Session</h2>
                    <button className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>


                <form action={handle_submission_client_side}>
                    {/* Form Body */}
                    <div className="px-8 py-6 space-y-5 overflow-y-auto max-h-[75vh]">

                        {/* Session Title */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                Session Title <span className="text-gray-400">*</span>
                            </label>
                            <input
                                type="text"
                                name="title"
                                placeholder="e.g., Opening Ceremony"
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
                            />
                        </div>

                        {/* Speaker */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Speaker</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <User size={18} className="text-gray-400" />
                                </div>
                                <select
                                    name="speaker"
                                    className="w-full pl-11 pr-10 py-2.5 rounded-xl border border-gray-200 text-gray-700 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Select a speaker</option>
                                    <option value="1">Jane Doe</option>
                                    <option value="2">John Smith</option>
                                </select>
                                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                                    <ChevronDown size={18} className="text-gray-400" />
                                </div>
                            </div>
                        </div>

                        {/* Date & Start Time */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Date</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Calendar size={18} className="text-gray-400" />
                                    </div>
                                    <input
                                        type="date"
                                        name="date"
                                        className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Start Time</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Clock size={18} className="text-gray-400" />
                                    </div>
                                    <input
                                        type="time"
                                        name="startTime"
                                        className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* End Time */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">End Time</label>
                            <div className="flex items-center gap-4">
                                <div className="relative w-full md:w-1/2">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Clock size={18} className="text-gray-400" />
                                    </div>
                                    <input
                                        type="time"
                                        name="endTime"
                                        className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="hidden md:flex items-center px-4 py-2 bg-slate-50 text-slate-500 text-sm rounded-lg font-medium">
                                    Duration: 1 hour 30 minutes
                                </div>
                            </div>
                        </div>

                        {/* Location & Session Type */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Location/Room</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <MapPin size={18} className="text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        name="location"
                                        className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Session Type</label>
                                <div className="relative">
                                    <select
                                        name="sessionType"
                                        className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-gray-200 text-gray-700 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="Talk">Talk</option>
                                        <option value="Workshop">Workshop</option>
                                        <option value="Panel">Panel</option>
                                    </select>
                                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                                        <ChevronDown size={18} className="text-gray-400" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Session Description */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Session Description</label>
                            <textarea
                                name="description"
                                rows={3}
                                placeholder="Provide a brief overview of what attendees can expect..."
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 resize-none"
                            />
                        </div>

                        {/* Session Materials */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Session Materials</label>
                            {/* The original image leaves this blank before the footer, but an upload input fits the context best */}
                            <input
                                type="file"
                                className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100 cursor-pointer"
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex flex-col-reverse md:flex-row justify-between items-center px-8 py-5 border-t border-gray-50 bg-white rounded-b-2xl gap-4 md:gap-0">

                        {/* Keyboard Shortcuts */}
                        <div className="flex items-center gap-3 text-xs text-gray-400 font-medium">
                            <span className="flex items-center gap-1">
                                <span className="border border-gray-200 rounded px-1.5 py-0.5 shadow-sm bg-gray-50">⌘+S</span> to save
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="border border-gray-200 rounded px-1.5 py-0.5 shadow-sm bg-gray-50">Esc</span> to cancel
                            </span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 w-full md:w-auto">
                            <button className="flex-1 md:flex-none px-6 py-2.5 rounded-xl font-bold text-gray-700 border-2 border-gray-200 hover:bg-gray-50 transition-colors" onClick={router.back}>
                                Cancel
                            </button>
                            <button className="flex-1 md:flex-none px-6 py-2.5 rounded-xl font-bold text-white bg-black hover:bg-gray-800 transition-colors shadow-md">
                                Save Session
                            </button>
                        </div>

                    </div>
                </form>
            </div>
        </>
    );
}
