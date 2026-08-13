"use client";

import { useState } from "react";
import { ImageOff, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { MediaUpload } from "@/src/features/media/MediaUpload";
import { PortfolioImage } from "@/src/services/models/vendor.model";
import { DateField } from "@/src/shared_components/DateField";
import { addPortfolioImage, removePortfolioImage } from "../actions/updateVendorPortfolio.action";
import { useToast } from "@/src/shared_components/ui/Toast";
import { ConfirmButton } from "@/src/shared_components/ui/ConfirmDialog";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { buttonClass, fieldClass } from "@/src/lib/ui";

export function PortfolioImageManager({ vendorId, images }: { vendorId: string; images: PortfolioImage[] }) {
    const router = useRouter();
    const [url, setUrl] = useState("");
    const [caption, setCaption] = useState("");
    const [eventType, setEventType] = useState("");
    const [date, setDate] = useState("");
    const [saving, setSaving] = useState(false);
    const toast = useToast();

    const reset = () => { setUrl(""); setCaption(""); setEventType(""); setDate(""); };

    const save = async () => {
        if (!url) return;
        setSaving(true);
        const res = await addPortfolioImage(vendorId, { url, caption, eventType, date });
        setSaving(false);
        if (res.success) {
            reset();
            router.refresh();
            toast.success("Image added to your portfolio.");
        } else {
            toast.error(res.error ?? "Could not add the image. Please try again.");
        }
    };

    const remove = async (u: string) => {
        const res = await removePortfolioImage(vendorId, u);
        if (res.success) {
            router.refresh();
            toast.success("Image removed.");
        } else {
            toast.error(res.error ?? "Could not remove the image. Please try again.");
        }
    };

    return (
        <div className="space-y-4">
            {images.length === 0 ? (
                <EmptyState
                    size="sm"
                    icon={<ImageOff className="h-5 w-5" />}
                    title="No portfolio images yet"
                    description="Upload photographs of past work below — this is the first thing organizers look at."
                />
            ) : (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    {images.map((img, i) => (
                        <div key={img.url + i} className="group relative aspect-square overflow-hidden rounded-xl bg-muted">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={img.url} alt={img.caption || "portfolio image"} className="h-full w-full object-cover" />
                            <ConfirmButton
                                title="Remove this image?"
                                description={
                                    img.caption
                                        ? `"${img.caption}" will be taken off your public portfolio. This cannot be undone.`
                                        : "This image will be taken off your public portfolio. This cannot be undone."
                                }
                                confirmLabel="Remove image"
                                onConfirm={() => remove(img.url)}
                                className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/80 text-ink-invert opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                            >
                                <span className="sr-only">Remove image</span>
                                <X className="h-3.5 w-3.5" aria-hidden="true" />
                            </ConfirmButton>
                            {img.caption && (
                                <div className="absolute inset-x-0 bottom-0 truncate bg-black/70 px-2 py-1 text-2xs text-ink-invert">{img.caption}</div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <div className="space-y-3 rounded-xl border border-dashed border-line-loud p-4">
                <p className="text-2xs font-bold uppercase text-ink-soft">Add portfolio image</p>
                <MediaUpload folder="vendor-portfolio" accept="image/*" value={url || null} label="Upload image" onUploaded={(u) => setUrl(u)} />
                {url && (
                    <>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                            <input value={caption} onChange={(e) => setCaption(e.target.value)} aria-label="Caption" placeholder="Caption" className={fieldClass} />
                            <input value={eventType} onChange={(e) => setEventType(e.target.value)} aria-label="Event type" placeholder="Event type" className={fieldClass} />
                            <DateField value={date} onChange={(e) => setDate(e.target.value)} aria-label="Date" className={`${fieldClass} pr-10`} />
                        </div>
                        <button type="button" onClick={save} disabled={saving} className={buttonClass("primary", "md")}>
                            {saving ? "Saving…" : "Add to portfolio"}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
