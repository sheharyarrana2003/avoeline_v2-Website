"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addPortfolioVideo, removePortfolioVideo } from "../actions/updateVendorPortfolio.action";

export function PortfolioVideoManager({ vendorId, videos }: { vendorId: string; videos: string[] }) {
    const router = useRouter();
    const [url, setUrl] = useState("");
    const [saving, setSaving] = useState(false);

    const add = async () => {
        const value = url.trim();
        if (!value) return;
        setSaving(true);
        const res = await addPortfolioVideo(vendorId, value);
        setSaving(false);
        if (res.success) { setUrl(""); router.refresh(); }
    };

    const remove = async (v: string) => {
        const res = await removePortfolioVideo(vendorId, v);
        if (res.success) router.refresh();
    };

    return (
        <div className="space-y-4">
            {videos.length > 0 && (
                <ul className="space-y-2">
                    {videos.map((v, i) => (
                        <li key={v + i} className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
                            <svg className="h-4 w-4 shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <a href={v} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-sm text-blue-600 hover:underline">{v}</a>
                            <button type="button" onClick={() => remove(v)} aria-label="Remove video" className="shrink-0 text-gray-400 hover:text-gray-700">×</button>
                        </li>
                    ))}
                </ul>
            )}

            <div className="space-y-2 rounded-xl border border-dashed border-gray-300 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Add video URL</p>
                <div className="flex flex-wrap items-center gap-2">
                    <input
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://youtube.com/… or a video link"
                        className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-200"
                    />
                    <button type="button" onClick={add} disabled={!url.trim() || saving} className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-60">
                        {saving ? "Adding…" : "Add"}
                    </button>
                </div>
            </div>
        </div>
    );
}
