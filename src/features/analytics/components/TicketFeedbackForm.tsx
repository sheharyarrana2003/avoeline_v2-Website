"use client";

import { useState, useTransition } from "react";
import { submitTicketFeedbackAction } from "@/src/features/analytics/actions/submitTicketFeedback.action";
import { buttonClass } from "@/src/lib/ui";

const TAG_OPTIONS = [
  { id: "venue", label: "Venue" },
  { id: "speakers", label: "Speakers" },
  { id: "content", label: "Content" },
  { id: "networking", label: "Networking" },
  { id: "organization", label: "Organization" },
  { id: "value", label: "Value" },
] as const;

type TagId = (typeof TAG_OPTIONS)[number]["id"];

export default function TicketFeedbackForm({
  eventId,
  registrationId,
  alreadySubmitted,
}: {
  eventId: string;
  registrationId: string;
  alreadySubmitted: boolean;
}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [tags, setTags] = useState<TagId[]>([]);
  const [done, setDone] = useState(alreadySubmitted);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (done) {
    return (
      <section className="mt-8 rounded-2xl border border-line bg-paper p-6 text-center">
        <h2 className="font-display text-base text-ink">Thanks for your feedback</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Your rating helps the organiser improve the next event.
        </p>
      </section>
    );
  }

  function toggleTag(id: TagId) {
    setTags((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  }

  return (
    <section className="mt-8 rounded-2xl border border-line bg-paper p-6">
      <h2 className="font-display text-base text-ink">How was the event?</h2>
      <p className="mt-1 text-sm text-ink-soft">Rate 1–5 and leave an optional comment.</p>

      <div className="mt-4 flex justify-center gap-2" role="group" aria-label="Rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={rating === n}
            className={`size-10 rounded-full border text-sm font-medium tabular-nums ${
              rating >= n
                ? "border-ink bg-ink text-ink-invert"
                : "border-line bg-paper text-ink-soft hover:border-ink"
            }`}
            onClick={() => setRating(n)}
          >
            {n}
          </button>
        ))}
      </div>

      <label className="mt-4 block text-xs text-ink-soft">
        Comment
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={2000}
          rows={3}
          className="mt-1 w-full rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink"
          placeholder="What worked? What could improve?"
        />
      </label>

      <div className="mt-3">
        <p className="text-2xs font-medium uppercase tracking-wide text-ink-soft">
          Tags (optional)
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {TAG_OPTIONS.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={tags.includes(t.id)}
              className={`rounded-md border px-2 py-1 text-xs ${
                tags.includes(t.id)
                  ? "border-ink bg-ink text-ink-invert"
                  : "border-line bg-paper text-ink-soft"
              }`}
              onClick={() => toggleTag(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}

      <div className="mt-4 flex justify-center">
        <button
          type="button"
          disabled={pending || rating < 1}
          className={buttonClass("primary", "md")}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const res = await submitTicketFeedbackAction({
                eventId,
                registrationId,
                rating,
                comment,
                tags,
              });
              if (!res.ok) {
                setError(res.error.message);
                return;
              }
              setDone(true);
            });
          }}
        >
          Submit feedback
        </button>
      </div>
    </section>
  );
}
