"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DescriptionEditor } from "@/src/features/events/components/wizard/DescriptionEditor";
import { MediaUpload } from "@/src/features/media/MediaUpload";
import { isVideoUrl, IMAGE_AND_VIDEO_ACCEPT } from "@/src/features/media/media.utils";
import { updateEventBasics } from "@/src/features/events/actions/updateEventBasics.action";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";

export type EditBasicsInitial = {
  eventId: string;
  organizerId: string;
  title: string;
  description: string;
  shortDescription: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  bannerImage: string;
  galleryImages: string[];
  totalSeats: number;
  ticketType: "free" | "paid";
  ticketPrice: number;
};

export function EditBasicsForm({ initial }: { initial: EditBasicsInitial }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [shortDescription, setShortDescription] = useState(initial.shortDescription);
  const [startDate, setStartDate] = useState(toDateInput(initial.startDate));
  const [endDate, setEndDate] = useState(toDateInput(initial.endDate || initial.startDate));
  const [startTime, setStartTime] = useState(toTimeInput(initial.startTime));
  const [endTime, setEndTime] = useState(toTimeInput(initial.endTime));
  const [bannerImage, setBannerImage] = useState(initial.bannerImage);
  const [galleryImages, setGalleryImages] = useState(initial.galleryImages);
  const [unlimitedSeats, setUnlimitedSeats] = useState(initial.totalSeats <= 0);
  const [totalSeats, setTotalSeats] = useState(Math.max(0, initial.totalSeats));
  const [ticketType, setTicketType] = useState<"free" | "paid">(initial.ticketType);
  const [ticketPrice, setTicketPrice] = useState(initial.ticketPrice);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await updateEventBasics({
        eventId: initial.eventId,
        title,
        description,
        shortDescription,
        startDate,
        endDate: endDate || startDate,
        startTime,
        endTime,
        bannerImage,
        galleryImages,
        totalSeats: unlimitedSeats ? 0 : totalSeats,
        unlimitedSeats,
        ticketType,
        ticketPrice,
      });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      router.push(
        `/organizer/${initial.organizerId}/events/${initial.eventId}?ok=${encodeURIComponent("Event updated.")}`,
      );
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-3xl space-y-8">
      {error ? (
        <p
          className="rounded-lg border border-danger-line bg-danger-soft px-3 py-2 text-sm text-danger"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <section className="space-y-4">
        <h2 className="font-display text-lg text-ink">Basics</h2>
        <label className="block">
          <span className={labelClass}>Title</span>
          <input
            className={`${fieldClass} mt-1`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={200}
          />
        </label>
        <label className="block">
          <span className={labelClass}>Short description</span>
          <input
            className={`${fieldClass} mt-1`}
            value={shortDescription}
            onChange={(e) => setShortDescription(e.target.value)}
            maxLength={500}
          />
        </label>
        <div>
          <span className={labelClass}>Description</span>
          <div className="mt-1">
            <DescriptionEditor
              id="edit-description"
              value={description}
              onChange={setDescription}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-lg text-ink">Schedule</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={labelClass}>Start date</span>
            <input
              type="date"
              className={`${fieldClass} mt-1`}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>
          <label className="block">
            <span className={labelClass}>End date</span>
            <input
              type="date"
              className={`${fieldClass} mt-1`}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </label>
          <label className="block">
            <span className={labelClass}>Start time</span>
            <input
              type="time"
              className={`${fieldClass} mt-1`}
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </label>
          <label className="block">
            <span className={labelClass}>End time</span>
            <input
              type="time"
              className={`${fieldClass} mt-1`}
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-lg text-ink">Media</h2>
        <MediaUpload
          folder="banners"
          accept="image/*"
          value={bannerImage}
          label="Banner (4:5)"
          onUploaded={setBannerImage}
          buttonClassName="relative mx-auto flex aspect-[4/5] w-full max-w-xs flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border-2 border-dashed border-line-loud bg-muted text-ink-soft transition hover:border-line-loud disabled:opacity-60"
        />
        <p className="text-xs text-ink-soft">Portrait 4:5 recommended for the event banner.</p>
        <div>
          <span className={labelClass}>Gallery</span>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <MediaUpload
              folder="gallery"
              accept={IMAGE_AND_VIDEO_ACCEPT}
              multiple
              label="+"
              className="shrink-0"
              buttonClassName="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-dashed border-line-loud bg-muted text-lg text-ink-soft"
              onUploaded={(url) => setGalleryImages((prev) => [...prev, url])}
            />
            {galleryImages.map((img, i) => (
              <div key={img + i} className="group relative h-16 w-16 overflow-hidden rounded-xl">
                {isVideoUrl(img) ? (
                  <video src={img} muted className="h-full w-full object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img} alt="" className="h-full w-full object-cover" />
                )}
                <button
                  type="button"
                  onClick={() => setGalleryImages((prev) => prev.filter((_, idx) => idx !== i))}
                  className="absolute right-0.5 top-0.5 h-4 w-4 rounded-full bg-black/70 text-2xs text-ink-invert opacity-0 group-hover:opacity-100"
                  aria-label="Remove"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-lg text-ink">Capacity & tickets</h2>
        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={unlimitedSeats}
            onChange={(e) => setUnlimitedSeats(e.target.checked)}
          />
          Unlimited seats
        </label>
        {!unlimitedSeats ? (
          <label className="block max-w-xs">
            <span className={labelClass}>Total seats</span>
            <input
              type="number"
              min={0}
              className={`${fieldClass} mt-1`}
              value={totalSeats}
              onChange={(e) => setTotalSeats(Number(e.target.value) || 0)}
            />
          </label>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {(["free", "paid"] as const).map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => setTicketType(kind)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${
                ticketType === kind ? "bg-ink text-ink-invert" : "bg-muted text-ink-soft"
              }`}
            >
              {kind}
            </button>
          ))}
        </div>
        {ticketType === "paid" ? (
          <label className="block max-w-xs">
            <span className={labelClass}>Ticket price (PKR)</span>
            <input
              type="number"
              min={0}
              className={`${fieldClass} mt-1`}
              value={ticketPrice}
              onChange={(e) => setTicketPrice(Number(e.target.value) || 0)}
            />
          </label>
        ) : null}
      </section>

      <div className="flex flex-wrap gap-3 border-t border-line pt-6">
        <button
          type="submit"
          className={buttonClass("primary", "md")}
          disabled={pending}
          aria-busy={pending}
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          className={buttonClass("secondary", "md")}
          disabled={pending}
          onClick={() => router.push(`/organizer/${initial.organizerId}/events/${initial.eventId}`)}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

/** Prefer YYYY-MM-DD for `<input type="date">`. */
function toDateInput(value: string): string {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const m = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) {
    const d = m[1].padStart(2, "0");
    const mo = m[2].padStart(2, "0");
    return `${m[3]}-${mo}-${d}`;
  }
  const t = Date.parse(raw);
  if (Number.isFinite(t)) return new Date(t).toISOString().slice(0, 10);
  return "";
}

/** Prefer HH:MM for `<input type="time">`. */
function toTimeInput(value: string): string {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const hm = raw.match(/^(\d{1,2}):(\d{2})/);
  if (hm && !/am|pm/i.test(raw)) {
    return `${hm[1].padStart(2, "0")}:${hm[2]}`;
  }
  const ampm = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampm) {
    let h = Number(ampm[1]) % 12;
    if (/pm/i.test(ampm[3])) h += 12;
    return `${String(h).padStart(2, "0")}:${ampm[2]}`;
  }
  return "";
}
