"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitVendorReview } from "../actions/reviewVendor.action";

const STAR_PATH =
    "M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z";

export function OrganizerReviewForm({
    bookingId,
    organizerId,
    vendorId,
    vendorName,
}: {
    bookingId: string;
    organizerId: string;
    vendorId: string;
    vendorName: string;
}) {
    const router = useRouter();
    const [rating, setRating] = useState(0);
    const [hovered, setHovered] = useState(0);
    const [title, setTitle] = useState("");
    const [comment, setComment] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const shown = hovered || rating;

    const submit = async () => {
        setError(null);
        if (!rating) return setError("Pick a star rating first.");
        if (!comment.trim()) return setError("Please write a few words about the vendor.");

        setSaving(true);
        const res = await submitVendorReview({ bookingId, organizerId, vendorId, rating, title, comment });
        setSaving(false);

        if (res.success) {
            setRating(0); setTitle(""); setComment("");
            router.refresh();
        } else {
            setError(res.error || "Failed to submit the review.");
        }
    };

    return (
        <div className="space-y-4">
            <p className="text-sm text-gray-500">
                How did <span className="font-semibold text-gray-900">{vendorName}</span> do? Your rating is
                shown on their public profile.
            </p>

            {/* Star picker */}
            <div className="flex items-center gap-2">
                <div className="flex" onMouseLeave={() => setHovered(0)}>
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            type="button"
                            aria-label={`${star} star${star === 1 ? "" : "s"}`}
                            onClick={() => setRating(star)}
                            onMouseEnter={() => setHovered(star)}
                            className="p-0.5 transition-transform hover:scale-110"
                        >
                            <svg
                                className={`h-7 w-7 ${star <= shown ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200"}`}
                                viewBox="0 0 20 20"
                            >
                                <path d={STAR_PATH} />
                            </svg>
                        </button>
                    ))}
                </div>
                <span className="text-sm font-semibold text-gray-700">{rating ? `${rating}.0` : ""}</span>
            </div>

            <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Headline (optional)"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-200"
            />

            <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                placeholder="What went well? Anything they could improve?"
                className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-gray-200"
            />

            {error && <p className="text-sm font-medium text-red-500">{error}</p>}

            <button
                type="button"
                onClick={submit}
                disabled={saving}
                className="rounded-full bg-black px-8 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-60"
            >
                {saving ? "Submitting…" : "Submit review"}
            </button>
        </div>
    );
}
