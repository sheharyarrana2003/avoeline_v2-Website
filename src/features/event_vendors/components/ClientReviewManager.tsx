"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClientTestimonial } from "@/src/services/models/vendor.model";
import { addClientTestimonial, removeClientTestimonial } from "../actions/updateVendorPortfolio.action";

export function ClientReviewManager({ vendorId, testimonials }: { vendorId: string; testimonials: ClientTestimonial[] }) {
    const router = useRouter();
    const [clientName, setClientName] = useState("");
    const [testimonial, setTestimonial] = useState("");
    const [rating, setRating] = useState(5);
    const [eventDate, setEventDate] = useState("");
    const [saving, setSaving] = useState(false);

    const save = async () => {
        if (!testimonial.trim()) return;
        setSaving(true);
        const res = await addClientTestimonial(vendorId, { clientName, testimonial, rating, eventDate });
        setSaving(false);
        if (res.success) {
            setClientName(""); setTestimonial(""); setRating(5); setEventDate("");
            router.refresh();
        }
    };

    const remove = async (index: number) => {
        const res = await removeClientTestimonial(vendorId, index);
        if (res.success) router.refresh();
    };

    return (
        <div className="space-y-4">
            {testimonials.length > 0 && (
                <div className="space-y-3">
                    {testimonials.map((t, i) => (
                        <div key={i} className="group relative rounded-xl bg-gray-50 p-4">
                            <button
                                type="button"
                                onClick={() => remove(i)}
                                aria-label="Remove review"
                                className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-sm leading-none text-white opacity-0 transition group-hover:opacity-100"
                            >
                                ×
                            </button>
                            <div className="mb-1 flex">
                                {[...Array(5)].map((_, s) => (
                                    <svg key={s} className={`h-3 w-3 ${s < t.rating ? "fill-yellow-400 text-yellow-400" : "fill-gray-300 text-gray-300"}`} viewBox="0 0 20 20">
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                ))}
                            </div>
                            <p className="text-sm italic text-gray-600">&ldquo;{t.testimonial}&rdquo;</p>
                            <p className="mt-2 text-xs text-gray-400">— {t.clientName}{t.eventDate ? ` • ${t.eventDate}` : ""}</p>
                        </div>
                    ))}
                </div>
            )}

            <div className="space-y-3 rounded-xl border border-dashed border-gray-300 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Add client review</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Client name" className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-200" />
                    <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-gray-200" />
                </div>
                <textarea value={testimonial} onChange={(e) => setTestimonial(e.target.value)} rows={3} placeholder="What did the client say?" className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-200" />
                <div className="flex items-center gap-3">
                    <label className="text-xs font-medium text-gray-500">Rating</label>
                    <select value={rating} onChange={(e) => setRating(Number(e.target.value))} className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-gray-200">
                        {[5, 4, 3, 2, 1].map((r) => <option key={r} value={r}>{r} ★</option>)}
                    </select>
                    <button type="button" onClick={save} disabled={saving} className="ml-auto rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-60">
                        {saving ? "Saving…" : "Add review"}
                    </button>
                </div>
            </div>
        </div>
    );
}
