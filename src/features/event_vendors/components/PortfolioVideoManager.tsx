"use client";

import { useState } from "react";
import { Video, VideoOff, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { addPortfolioVideo, removePortfolioVideo } from "../actions/updateVendorPortfolio.action";
import { useToast } from "@/src/shared_components/ui/Toast";
import { ConfirmButton } from "@/src/shared_components/ui/ConfirmDialog";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { buttonClass, fieldClass } from "@/src/lib/ui";

export function PortfolioVideoManager({ vendorId, videos }: { vendorId: string; videos: string[] }) {
    const router = useRouter();
    const [url, setUrl] = useState("");
    const [saving, setSaving] = useState(false);
    const toast = useToast();

    const add = async () => {
        const value = url.trim();
        if (!value) return;
        setSaving(true);
        const res = await addPortfolioVideo(vendorId, value);
        setSaving(false);
        if (res.success) {
            setUrl("");
            router.refresh();
            toast.success("Video added to your portfolio.");
        } else {
            toast.error(res.error ?? "Could not add the video. Please try again.");
        }
    };

    const remove = async (v: string) => {
        const res = await removePortfolioVideo(vendorId, v);
        if (res.success) {
            router.refresh();
            toast.success("Video removed.");
        } else {
            toast.error(res.error ?? "Could not remove the video. Please try again.");
        }
    };

    return (
        <div className="space-y-4">
            {videos.length === 0 ? (
                <EmptyState
                    size="sm"
                    icon={<VideoOff className="h-5 w-5" />}
                    title="No portfolio videos yet"
                    description="Paste a link to a showreel or an event recording below."
                />
            ) : (
                <ul className="space-y-2">
                    {videos.map((v, i) => (
                        <li key={v + i} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2">
                            <Video className="h-4 w-4 shrink-0 text-ink-soft" aria-hidden="true" />
                            <a href={v} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-sm text-ink hover:underline">{v}</a>
                            <ConfirmButton
                                title="Remove this video?"
                                description="This video will be taken off your public portfolio. This cannot be undone."
                                confirmLabel="Remove video"
                                onConfirm={() => remove(v)}
                                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-soft transition hover:bg-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                            >
                                <span className="sr-only">Remove video</span>
                                <X className="h-4 w-4" aria-hidden="true" />
                            </ConfirmButton>
                        </li>
                    ))}
                </ul>
            )}

            <div className="space-y-2 rounded-xl border border-dashed border-line-loud p-4">
                <p className="text-2xs font-bold uppercase text-ink-soft">Add video URL</p>
                <div className="flex flex-wrap items-center gap-2">
                    <input
                        type="url"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        aria-label="Video URL"
                        placeholder="https://youtube.com/… or a video link"
                        className={`${fieldClass} min-w-0 flex-1`}
                    />
                    <button type="button" onClick={add} disabled={!url.trim() || saving} className={buttonClass("primary", "md")}>
                        {saving ? "Adding…" : "Add"}
                    </button>
                </div>
            </div>
        </div>
    );
}
