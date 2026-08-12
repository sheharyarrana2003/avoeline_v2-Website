import Link from 'next/link';
import { formatDate } from "@/src/lib/datetime";
import { formatCurrency } from "@/src/lib/money";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { buttonClass } from "@/src/lib/ui";

export async function BookingsCard({ params, booking }: { params: Promise<{ organizer_id: string }>, booking: any }) {
  const resolvedParams = await params;
  const organizerId = resolvedParams.organizer_id;
  const basePath = `/organizer/${organizerId}`;

  // Safe destructuring based on typical data shape. Adjust to your exact schema.
  const vendorName = booking?.vendor?.businessName || "Unknown Vendor";
  const vendorInitials = vendorName.substring(0, 2).toUpperCase();
  const serviceType = booking?.vendor?.serviceCategories?.[0]?.replace(/_/g, ' ') || "Service";
  const eventName = booking?.eventName || "Event";
  const date = formatDate(booking?.requirements?.serviceDate);

  // Try to get total amount, default to 0
  const amount = booking?.quote?.vendorQuote?.totalAmount || booking?.estimatedAmount || 0;
  const status = booking?.status || "pending";

  return (
    <div className="flex h-full flex-col rounded-2xl border border-line bg-paper p-6">

      <div className="mb-6 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-canvas text-sm font-medium text-ink-soft" aria-hidden="true">
            {vendorInitials}
          </div>
          <div>
            <h3 className="font-medium leading-tight text-ink">{vendorName}</h3>
            <p className="text-sm capitalize text-ink-soft">{serviceType}</p>
          </div>
        </div>
        <StatusBadge status={status} size="sm" />
      </div>

      <div className="mb-6">
        <p className="font-display text-xl text-ink tabular-nums">{formatCurrency(amount)}</p>
        <p className="mt-1 text-sm text-ink-soft tabular-nums">{eventName} • {date}</p>
      </div>

      {/* buttonClass, not a hand-rolled pill: the old one was `w-full` on a <Link>,
          which renders an inline <a> where width does nothing at all. */}
      <Link
        href={`${basePath}/booking-details/${booking?.bookingId}`}
        className={buttonClass("primary", "md", "mt-auto w-full")}
      >
        View details
      </Link>
    </div>
  );
}
