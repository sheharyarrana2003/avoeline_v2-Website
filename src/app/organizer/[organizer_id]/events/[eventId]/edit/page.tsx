import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { EventService } from "@/src/services/event.service";
import { assertOwnedEvent } from "@/src/features/events/ownership";
import { EditBasicsForm } from "@/src/features/events/components/EditBasicsForm";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { buttonClass } from "@/src/lib/ui";

export const dynamic = "force-dynamic";

export default async function EditEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ organizer_id: string; eventId: string }>;
  searchParams: Promise<{ e?: string; ok?: string }>;
}) {
  const { organizer_id, eventId } = await params;
  const sp = await searchParams;
  const owned = await assertOwnedEvent(eventId);
  if (!owned) {
    const event = await EventService.getEventByID(eventId);
    if (!event) notFound();
    redirect(`/organizer/${organizer_id}/events/${eventId}`);
  }

  const tierPrice = owned.pricing?.tiers?.[0]?.price;
  const ticketPrice =
    typeof tierPrice === "number" && tierPrice > 0 ? tierPrice : Number(owned.PriceOfTicket) || 0;
  const isFree = owned.pricing?.isFree !== false && ticketPrice <= 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl text-ink">Edit event</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Update title, schedule, media, capacity, and ticket basics.
          </p>
        </div>
        <Link
          href={`/organizer/${organizer_id}/events/${eventId}`}
          className={buttonClass("ghost", "sm")}
        >
          Back to overview
        </Link>
      </div>
      <FormFeedback error={sp.e} success={sp.ok} />
      <EditBasicsForm
        initial={{
          eventId,
          organizerId: organizer_id,
          title: owned.title || "",
          description: owned.description || "",
          shortDescription: owned.shortDescription || "",
          startDate: String(owned.schedule?.startDate || ""),
          endDate: String(owned.schedule?.endDate || ""),
          startTime: String(owned.schedule?.startTime || ""),
          endTime: String(owned.schedule?.endTime || ""),
          bannerImage: typeof owned.bannerImage === "string" ? owned.bannerImage : "",
          galleryImages: (owned.galleryImages ?? []).filter(
            (u): u is string => typeof u === "string",
          ),
          totalSeats: Number(owned.capacity?.totalSeats) || 0,
          ticketType: isFree ? "free" : "paid",
          ticketPrice,
        }}
      />
    </div>
  );
}
