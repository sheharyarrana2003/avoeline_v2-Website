import Link from "next/link";
import Image from "next/image";
import { MapPin } from "lucide-react";
import { Card, CardBody } from "./Card";
import { StatusBadge } from "./StatusBadge";
import { formatDateMedium, formatTime } from "@/src/lib/datetime";
import { formatCurrency } from "@/src/lib/money";

export type EventCardModel = {
  id: string;
  title: string;
  shortDescription?: string | null;
  category?: string | null;
  eventType?: string | null;
  schedule?: { startDate?: string | null; startTime?: string | null } | null;
  location?: { venueName?: string | null; city?: string | null } | null;
  href: string;
  priceLabel?: string | null;
  currency?: string | null;
  price?: number | null;
  /** Optional card thumbnail (next/image; keep under ~200KB). */
  imageUrl?: string | null;
};

/**
 * Public / discovery event card (ENGINEERING_RULES C3).
 * Interaction container — Link wraps the card.
 */
export function EventCard({ event }: { event: EventCardModel }) {
  const venue = [event.location?.venueName, event.location?.city].filter(Boolean).join(", ");
  const priceText =
    event.priceLabel ??
    (event.price == null ? null : formatCurrency(event.price, event.currency ?? "PKR"));

  return (
    <Link
      href={event.href}
      className="block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <Card tone="raised" interactive className="h-full">
        <CardBody>
          {event.imageUrl ? (
            <div className="relative mb-3 aspect-[4/5] w-full overflow-hidden rounded-lg bg-muted">
              <Image
                src={event.imageUrl}
                alt=""
                fill
                sizes="(max-width: 768px) 100vw, 320px"
                className="object-cover"
              />
            </div>
          ) : null}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {event.category ? <StatusBadge status="info" label={event.category} size="sm" /> : null}
            {event.eventType ? (
              <span className="text-2xs font-medium uppercase text-ink-soft">
                {event.eventType}
              </span>
            ) : null}
          </div>
          <h2 className="font-display text-lg text-ink">{event.title}</h2>
          {event.shortDescription ? (
            <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{event.shortDescription}</p>
          ) : null}
          <dl className="mt-4 space-y-1.5 text-sm text-ink-soft">
            <div className="flex items-center gap-2">
              <span className="text-2xs uppercase text-ink-faint">When</span>
              <span className="text-ink">
                {formatDateMedium(event.schedule?.startDate)}
                {event.schedule?.startTime ? `, ${formatTime(event.schedule.startTime)}` : ""}
              </span>
            </div>
            {venue ? (
              <div className="flex items-center gap-2">
                <MapPin size={13} className="shrink-0 text-ink-faint" aria-hidden="true" />
                <span className="truncate">{venue}</span>
              </div>
            ) : null}
            {priceText ? (
              <div className="flex items-center gap-2">
                <span className="text-2xs uppercase text-ink-faint">From</span>
                <span className="text-ink">{priceText}</span>
              </div>
            ) : null}
          </dl>
        </CardBody>
      </Card>
    </Link>
  );
}
