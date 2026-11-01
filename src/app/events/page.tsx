import Link from "next/link";
import { CalendarSearch } from "lucide-react";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { SearchField } from "@/src/shared_components/ui/SearchField";
import { BrandMark } from "@/src/shared_components/ui/BrandMark";
import { EventCard } from "@/src/shared_components/ui/EventCard";
import { buttonClass } from "@/src/lib/ui";
import { formatCurrency } from "@/src/lib/money";
import { normalizeQuery } from "@/src/lib/search";
import { getBrowsableEvents } from "@/src/features/events/browse.service";
import { ticketFor } from "@/src/features/registration/registration.service";

export const metadata = {
  title: "Browse events — Avoeline",
  description: "Find an event to attend.",
};

/**
 * Browse Events -- the public listing spec 2.1 requires.
 *
 * Unauthenticated: `proxy.ts` matches only the role prefixes, so this tree needs
 * nothing opened up. Only public, hybrid and tiered events appear; private and
 * invite-only are absent by construction, since `isListedPublicly` is the same
 * predicate the access rule uses rather than a second opinion about it.
 *
 * The wizard has been telling organizers their event would be "listed on our
 * discovery platform" since before one existed. It does now.
 */
export default async function BrowseEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const query = normalizeQuery((await searchParams)?.q);
  const events = await getBrowsableEvents(query);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <header className="mb-8">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 rounded-xs focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <BrandMark className="h-7 w-7" />
          <span className="text-2xs font-medium uppercase tracking-wider text-ink-soft">
            Avoeline
          </span>
        </Link>
        <h1 className="font-display text-3xl text-ink">Browse events</h1>
        <p className="mt-1 text-sm text-ink-soft">
          {query
            ? `${events.length} event${events.length === 1 ? "" : "s"} matching “${query}”`
            : "Events open for registration right now."}
        </p>
      </header>

      <div className="mb-8 max-w-md">
        <SearchField
          action="/events"
          placeholder="Search events, city, category"
          defaultValue={query}
          label="Search events"
        />
      </div>

      {events.length === 0 ? (
        <EmptyState
          icon={<CalendarSearch size={28} />}
          title={query ? `Nothing matches “${query}”` : "No events are open just now"}
          description={
            query
              ? "Try a shorter search, or clear it to see everything that is open."
              : "Check back soon — new events are published regularly."
          }
          action={
            query ? (
              <Link href="/events" className={buttonClass("secondary")}>
                Clear search
              </Link>
            ) : undefined
          }
        />
      ) : (
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {events.map((event) => {
            const { price } = ticketFor(event);
            return (
              <li key={event.id}>
                <EventCard
                  event={{
                    id: event.id,
                    title: event.title,
                    shortDescription: event.shortDescription,
                    category: event.category,
                    eventType: event.eventType,
                    schedule: event.schedule,
                    location: event.location,
                    href: `/events/${event.id}`,
                    priceLabel: formatCurrency(price, event.pricing?.currency || "PKR", "Free"),
                    imageUrl: event.bannerImage || null,
                  }}
                />
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
