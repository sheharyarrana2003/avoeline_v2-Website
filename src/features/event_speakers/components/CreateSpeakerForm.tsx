"use client"

import { User, Link as LinkIcon, Share2, Mail, Phone, Plus, X } from "lucide-react";

import { useRouter } from 'next/navigation';
export default function CreateSpeakerForm(handle_speaker_submission : any) {
    const router = useRouter();

    return (
        <>
            <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] w-full max-w-4xl p-8 border border-gray-100">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-extrabold text-gray-900">Add New Speaker</h2>
                    <button className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <form action={handle_speaker_submission}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">

                        {/* LEFT COLUMN */}
                        <div className="space-y-6">
                            {/* Upload Photo Area */}
                            <div className="bg-gray-50/50 rounded-2xl border border-gray-100 p-8 flex flex-col items-center justify-center">
                                <div className="w-24 h-24 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-100/50 mb-4">
                                    <User className="text-gray-400" size={32} />
                                </div>
                                <span className="font-bold text-sm text-gray-900">Upload Photo</span>
                            </div>

                            {/* Text Inputs */}
                            <div>
                                <label className="block text-sm font-bold text-gray-900 mb-2">Full Name *</label>
                                <input name="speakerName" type="text" placeholder="e.g. Sarah Jenkins" className="w-full border border-gray-200 rounded-xl p-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-black placeholder:text-gray-400" required />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-900 mb-2">Title/Designation *</label>
                                <input name="title" type="text" placeholder="e.g. Chief Innovation Officer" className="w-full border border-gray-200 rounded-xl p-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-black placeholder:text-gray-400" required />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-900 mb-2">Company/Organization *</label>
                                <input name="company" type="text" placeholder="e.g. Acme Tech Global" className="w-full border border-gray-200 rounded-xl p-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-black placeholder:text-gray-400" required />
                            </div>
                        </div>

                        {/* RIGHT COLUMN */}
                        <div className="space-y-6">
                            {/* Bio Textarea */}
                            <div>
                                <div className="flex justify-between items-end mb-2">
                                    <label className="block text-sm font-bold text-gray-900">Biography</label>
                                    <span className="text-xs font-medium text-gray-400">0 / 500</span>
                                </div>
                                <textarea name="bio" placeholder="Tell us about the speaker..." className="w-full border border-gray-200 rounded-xl p-3.5 text-sm h-[132px] resize-none focus:outline-none focus:ring-2 focus:ring-black placeholder:text-gray-400"></textarea>
                            </div>

                            {/* Social Profiles */}
                            <div>
                                <label className="block text-sm font-bold text-gray-900 mb-2">Social Profiles</label>
                                <div className="space-y-3">
                                    <div className="flex">
                                        <span className="bg-gray-50 border border-gray-200 border-r-0 rounded-l-xl px-4 flex items-center justify-center text-gray-500">
                                            <LinkIcon size={16} />
                                        </span>
                                        <input name="linkedin" type="url" placeholder="LinkedIn URL" className="w-full border border-gray-200 rounded-r-xl p-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-black placeholder:text-gray-400" />
                                    </div>
                                    <div className="flex">
                                        <span className="bg-gray-50 border border-gray-200 border-r-0 rounded-l-xl px-4 flex items-center justify-center text-gray-500">
                                            <Share2 size={16} />
                                        </span>
                                        <input name="twitter" type="url" placeholder="Twitter URL" className="w-full border border-gray-200 rounded-r-xl p-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-black placeholder:text-gray-400" />
                                    </div>
                                </div>
                            </div>

                            {/* Assigned Sessions */}
                            <div>
                                <label className="block text-sm font-bold text-gray-900 mb-2">Assigned Sessions</label>
                                <div className="border border-gray-200 rounded-xl p-4 flex flex-wrap gap-2 items-center bg-gray-50/30">
                                    <span className="bg-black text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
                                        Keynote: Future of AI <X size={14} className="cursor-pointer hover:text-gray-300" />
                                    </span>
                                    <span className="bg-gray-200 text-gray-800 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
                                        Panel: Tech Ethics <X size={14} className="cursor-pointer hover:text-gray-500" />
                                    </span>
                                    <button type="button" className="text-gray-400 hover:text-blue-600 transition-colors ml-1 border border-gray-300 rounded-full p-0.5">
                                        <Plus size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Divider */}
                    <hr className="my-8 border-gray-100" />

                    {/* Direct Contact Section */}
                    <div>
                        <label className="block text-xs font-extrabold text-gray-500 uppercase tracking-widest mb-4">Direct Contact</label>
                        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-6">
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 text-gray-400">
                                    <Mail size={18} />
                                    <input type="email" name="email" placeholder="Email Address" className="border-none focus:ring-0 p-0 text-sm placeholder-gray-400 outline-none w-64 text-gray-900 font-medium" />
                                </div>
                                <div className="flex items-center gap-3 text-gray-400">
                                    <Phone size={18} />
                                    <input type="tel" name="phone" placeholder="+1 (555) 000-0000" className="border-none focus:ring-0 p-0 text-sm placeholder-gray-400 outline-none w-64 text-gray-900 font-medium" />
                                </div>
                            </div>

                            {/* Custom Toggle Switch */}
                            <label className="flex items-center cursor-pointer gap-3">
                                <div className="relative">
                                    <input type="checkbox" name="isPublic" className="sr-only peer" />
                                    <div className="w-10 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </div>
                                <span className="text-sm font-medium text-gray-600">Show contact info publicly</span>
                            </label>
                        </div>
                    </div>

                    {/* Footer Section */}
                    <div className="mt-8 pt-6 bg-gray-50/50 -mx-8 -mb-8 p-8 rounded-b-2xl flex flex-col md:flex-row justify-between items-center gap-6 border-t border-gray-100">

                        {/* Keyboard Shortcuts */}
                        <div className="flex items-center gap-4 text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                            <span className="flex items-center gap-2">
                                <kbd className="border border-gray-200 rounded px-2 py-1 bg-white text-gray-500 shadow-sm font-sans">ESC</kbd> to cancel
                            </span>
                            <span className="flex items-center gap-2">
                                <kbd className="border border-gray-200 rounded px-2 py-1 bg-white text-gray-500 shadow-sm font-sans">⌘+S</kbd> to save
                            </span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 w-full md:w-auto">
                            <button type="button" onClick={()=>router.back()} className="flex-1 md:flex-none px-6 py-3 border border-gray-200 rounded-xl font-bold text-sm bg-white text-gray-700 hover:bg-gray-50 transition-colors">
                                Cancel
                            </button>
                            <button type="submit" className="flex-1 md:flex-none px-6 py-3 bg-black text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-colors shadow-md">
                                Save Speaker
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </>
    )
}