"use client";

import { Calendar, Clock, MapPin, ChevronDown, X, User, CheckCircle, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { createAgendaAction } from "@/src/features/agendas/actions/createAgenda.action";
import { Speaker } from "@/src/services/models/event.model";

interface CreateAgendaFormProps {
    eventId: string;
    organizerId: string;
    activeSpeakers?: Speaker[]; 
}

export default function CreateAgendaForm({ eventId, organizerId, activeSpeakers }: CreateAgendaFormProps) {
    const router = useRouter();

    const boundAction = createAgendaAction.bind(null, eventId, organizerId);
    const [state, formAction, isPending] = useActionState(boundAction, null);

    // Close / redirect back after success
    if (state?.success) {
        router.push(`/organizer/${organizerId}/events/${eventId}/agenda`);
    }

    return (
        <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] w-full max-w-4xl p-8 border border-gray-100">

            {/* Header */}
            <div className="flex justify-between items-center px-8 py-6 border-b border-gray-50">
                <h2 className="text-xl font-bold text-gray-900">Add New Session</h2>
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Error Banner */}
            {state?.error && (
                <div className="mx-8 mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                    <AlertCircle size={16} />
                    {state.error}
                </div>
            )}

            <form action={formAction}>
                {/* Form Body */}
                <div className="px-8 py-6 space-y-5 overflow-y-auto max-h-[75vh]">

                    {/* Session Title */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            Session Title <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            name="title"
                            required
                            placeholder="e.g., Opening Ceremony"
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400"
                        />
                    </div>

                    {/* Session Type + Status */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                Session Type <span className="text-red-400">*</span>
                            </label>
                            <div className="relative">
                                <select
                                    name="sessionType"
                                    required
                                    className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-gray-200 text-gray-700 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="talk">Talk</option>
                                    <option value="workshop">Workshop</option>
                                    <option value="panel">Panel</option>
                                    <option value="keynote">Keynote</option>
                                    <option value="networking">Networking</option>
                                    <option value="break">Break</option>
                                    <option value="qna">Q&amp;A</option>
                                    <option value="registration">Registration</option>
                                    <option value="closing">Closing</option>
                                </select>
                                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                                    <ChevronDown size={18} className="text-gray-400" />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                Status
                            </label>
                            <div className="relative">
                                <select
                                    name="status"
                                    className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-gray-200 text-gray-700 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="confirmed">Confirmed</option>
                                    <option value="tentative">Tentative</option>
                                    <option value="cancelled">Cancelled</option>
                                    <option value="completed">Completed</option>
                                </select>
                                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                                    <ChevronDown size={18} className="text-gray-400" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Date & Start Time */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                Date <span className="text-red-400">*</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Calendar size={18} className="text-gray-400" />
                                </div>
                                <input
                                    type="date"
                                    name="date"
                                    required
                                    className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                Start Time <span className="text-red-400">*</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Clock size={18} className="text-gray-400" />
                                </div>
                                <input
                                    type="time"
                                    name="startTime"
                                    required
                                    className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* End Time */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            End Time <span className="text-red-400">*</span>
                        </label>
                        <div className="relative w-full md:w-1/2">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Clock size={18} className="text-gray-400" />
                            </div>
                            <input
                                type="time"
                                name="endTime"
                                required
                                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* Location */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            Location / Room
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <MapPin size={18} className="text-gray-400" />
                            </div>
                            <input
                                type="text"
                                name="location"
                                placeholder="e.g., Main Hall A"
                                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {/* Speaker Names */}
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Speakers</label>
                        <div className="relative">
                            <select name="selectedEventId" className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 appearance-none outline-none">
                                {activeSpeakers && activeSpeakers.map((x) => (
                                    /* 2. Set the value to the event ID, but display the name */
                                    <option key={x.speakerId} value={x.speakerId}>
                                        {x.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    {/* Session Description */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                            Description
                        </label>
                        <textarea
                            name="description"
                            rows={3}
                            placeholder="Provide a brief overview of what attendees can expect..."
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 resize-none"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex flex-col-reverse md:flex-row justify-between items-center px-8 py-5 border-t border-gray-50 bg-white rounded-b-2xl gap-4 md:gap-0">

            

                    {/* Action Buttons */}
                    <div className="flex gap-3 w-full md:w-auto">
                        <button
                            type="button"
                            className="flex-1 md:flex-none px-6 py-2.5 rounded-xl font-bold text-gray-700 border-2 border-gray-200 hover:bg-gray-50 transition-colors"
                            onClick={() => router.back()}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isPending}
                            className="flex-1 md:flex-none px-6 py-2.5 rounded-xl font-bold text-white bg-black hover:bg-gray-800 transition-colors shadow-md disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 justify-center"
                        >
                            {isPending ? (
                                <>
                                    <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <CheckCircle size={16} />
                                    Save Session
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
