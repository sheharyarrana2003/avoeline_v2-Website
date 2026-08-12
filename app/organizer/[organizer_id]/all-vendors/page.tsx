import Link from "next/link";
import { BookingServices } from "@/src/features/bookings/bookings.service";
import { BookingsCard } from "@/src/features/bookings/shared_components/BookingsCard";
import { Store } from "lucide-react";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { buttonClass } from "@/src/lib/ui";

const TABS = [
  { label: "Active", value: "active" },
  { label: "Past", value: "past" },
  { label: "Cancelled", value: "cancelled" },
];

export default async function Active_Vendors({ params, searchParams }: { params: Promise<{ organizer_id: string }>, searchParams: Promise<{ tab: string }> }) {
  const awaited_search_params = await searchParams;
  const resolvedParams = await params;
  const organizerId = resolvedParams.organizer_id;
  const basePath = `/organizer/${organizerId}`;

  const activeTab = awaited_search_params?.tab?.toString() || "active"; // Default to active

  // A null read and an empty read mean the same thing on screen, so they share
  // one path -- the duplicated "no bookings" copy of this page is gone.
  const bookings = (await BookingServices.getBookingsOfOrganizer(organizerId)) ?? [];

  const filteredBookings = bookings.filter((b) => {
    if (activeTab === "active") {
      return b.status !== "completed" && b.status !== "cancelled";
    } else if (activeTab === "past") {
      return b.status === "completed";
    } else {
      return b.status === "cancelled";
    }
  });

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">

        <PageHeader
          title="Vendor Bookings"
          description="Manage and track your ongoing vendor bookings and service statuses."
          actions={
            <Link href={`${basePath}/vendor-marketplace`} className={buttonClass("primary", "lg")}>
              <Store size={16} aria-hidden="true" />
              Visit Vendor Marketplace
            </Link>
          }
        />

        <nav className="mb-8 flex gap-7 border-b border-line" aria-label="Booking filters">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.value;
            return (
              <Link
                key={tab.value}
                href={`${basePath}/all-vendors?tab=${tab.value}`}
                className={`shrink-0 border-b-2 pb-3 text-sm font-medium transition ${isActive
                  ? "border-gray-900 text-ink"
                  : "border-transparent text-ink-soft hover:text-ink"
                  }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        {filteredBookings.length === 0 ? (
          <EmptyState
            icon={<Store size={28} />}
            title={`No ${activeTab} bookings`}
            description={
              activeTab === "active"
                ? "Book a provider from the marketplace and the engagement will be tracked here."
                : "Bookings move into this list once they reach that state."
            }
            action={
              activeTab === "active" ? (
                <Link href={`${basePath}/vendor-marketplace`} className={buttonClass()}>
                  Browse the marketplace
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredBookings.map((b) => (
              <BookingsCard key={b.bookingId} params={params} booking={b} />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
