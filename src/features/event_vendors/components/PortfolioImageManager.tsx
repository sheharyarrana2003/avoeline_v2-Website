"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MediaUpload } from "@/src/features/media/MediaUpload";
import { PortfolioImage } from "@/src/services/models/vendor.model";
import { DateField } from "@/src/shared_components/DateField";
import { addPortfolioImage, removePortfolioImage } from "../actions/updateVendorPortfolio.action";

export function PortfolioImageManager({ vendorId, images }: { vendorId: string; images: PortfolioImage[] }) {
    const router = useRouter();
    const [url, setUrl] = useState("");
    const [caption, setCaption] = useState("");
    const [eventType, setEventType] = useState("");
    const [date, setDate] = useState("");
    const [saving, setSaving] = useState(false);

    const reset = () => { setUrl(""); setCaption(""); setEventType(""); setDate(""); };

    const save = async () => {
        if (!url) return;
        setSaving(true);
        const res = await addPortfolioImage(vendorId, { url, caption, eventType, date });
        setSaving(false);
        if (res.success) { reset(); router.refresh(); }
    };

    const remove = async (u: string) => {
        const res = await removePortfolioImage(vendorId, u);
        if (res.success) router.refresh();
    };

    return (
        <div className="space-y-4">
            {images.length > 0 && (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    {images.map((img, i) => (
                        <div key={img.url + i} className="group relative aspect-square overflow-hidden rounded-xl bg-gray-100">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={img.url} alt={img.caption || "portfolio image"} className="h-full w-full object-cover" />
                            <button
                                type="button"
                                onClick={() => remove(img.url)}
                                aria-label="Remove image"
                                className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-sm leading-none text-white opacity-0 transition group-hover:opacity-100"
                            >
                                ×
                            </button>
                            {img.caption && (
                                <div className="absolute inset-x-0 bottom-0 truncate bg-black/50 px-2 py-1 text-[10px] text-white">{img.caption}</div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <div className="space-y-3 rounded-xl border border-dashed border-gray-300 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Add portfolio image</p>
                <MediaUpload folder="vendor-portfolio" accept="image/*" value={url || null} label="Upload image" onUploaded={(u) => setUrl(u)} />
                {url && (
                    <>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                            <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Caption" className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-200" />
                            <input value={eventType} onChange={(e) => setEventType(e.target.value)} placeholder="Event type" className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-200" />
                            <DateField value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-gray-200" />
                        </div>
                        <button type="button" onClick={save} disabled={saving} className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-60">
                            {saving ? "Saving…" : "Add to portfolio"}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
