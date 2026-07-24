"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addPastEvent, removePastEvent } from "../actions/updateVendorPortfolio.action";

export interface BookedEventOption { id: string; title: string; }

export function PastEventsManager({
    vendorId,
    pastEvents,
    bookedEvents,
}: {
    vendorId: string;
    pastEvents: string[];
    bookedEvents: BookedEventOption[];
}) {
    const router = useRouter();
    const [selected, setSelected] = useState("");
    const [saving, setSaving] = useState(false);

    const titleFor = (id: string) => bookedEvents.find((e) => e.id === id)?.title || id;
    const available = bookedEvents.filter((e) => !pastEvents.includes(e.id));

    const add = async () => {
        if (!selected) return;
        setSaving(true);
        const res = await addPastEvent(vendorId, selected);
        setSaving(false);
        if (res.success) { setSelected(""); router.refresh(); }
    };

    const remove = async (id: string) => {
        const res = await removePastEvent(vendorId, id);
        if (res.success) router.refresh();
    };

    return (
        <div className="space-y-4">
            {pastEvents.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {pastEvents.map((id) => (
                        <span key={id} className="flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700">
                            {titleFor(id)}
                            <button type="button" onClick={() => remove(id)} aria-label="Remove past event" className="text-gray-400 hover:text-gray-700">×</button>
                        </span>
                    ))}
                </div>
            )}

            <div className="space-y-2 rounded-xl border border-dashed border-gray-300 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Add a past event</p>
                {available.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-2">
                        <select value={selected} onChange={(e) => setSelected(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-200">
                            <option value="">Select an event you worked…</option>
                            {available.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
                        </select>
                        <button type="button" onClick={add} disabled={!selected || saving} className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-60">
                            {saving ? "Adding…" : "Add"}
                        </button>
                    </div>
                ) : (
                    <p className="text-sm text-gray-400">No booked events available to add.</p>
                )}
            </div>
        </div>
    );
}
