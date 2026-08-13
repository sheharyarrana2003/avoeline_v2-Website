import Link from "next/link";
import { BookingServices } from "@/src/features/bookings/bookings.service";
import { Store } from "lucide-react";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { Card } from "@/src/shared_components/ui/Card";
import { Breadcrumbs } from "@/src/shared_components/ui/Breadcrumbs";
import { FilterTabs } from "@/src/shared_components/ui/FilterTabs";
import { DataTable, CellStack, type Column } from "@/src/shared_components/ui/DataTable";
import { formatDate } from "@/src/lib/datetime";
import { formatCurrency } from "@/src/lib/money";
import { buttonClass } from "@/src/lib/ui";

// getBookingsOfOrganizer returns a narrow server-side projection rather than the
// whole booking, so this row type is what actually arrives — not BookingData.
type BookingRow = Awaited<ReturnType<typeof BookingServices.getBookingsOfOrganizer>> extends
  | (infer R)[]
  | null
  ? R
  : never;

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

  // Counts on the tabs, from the same in-memory list the filter already uses.
  const tabs = [
    {
      label: "Active",
      value: "active",
      href: `${basePath}/all-vendors?tab=active`,
      count: bookings.filter((b) => b.status !== "completed" && b.status !== "cancelled").length,
    },
    {
      label: "Past",
      value: "past",
      href: `${basePath}/all-vendors?tab=past`,
      count: bookings.filter((b) => b.status === "completed").length,
    },
    {
      label: "Cancelled",
      value: "cancelled",
      href: `${basePath}/all-vendors?tab=cancelled`,
      count: bookings.filter((b) => b.status === "cancelled").length,
    },
  ];

  const columns: Column<BookingRow>[] = [
    {
      key: "vendor",
      header: "Vendor",
      width: "w-[20%] max-w-0",
      cell: (b) => (
        <Link
          href={`${basePath}/view-vendor/${b.vendor?.vendorId}`}
          className="group/row block rounded-xs focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <CellStack
            primary={<span className="group-hover/row:underline">{b.vendor?.businessName || "Vendor"}</span>}
            // The projection returns the whole category array and the card showed
            // only the first one.
            secondary={b.vendor?.serviceCategories?.join(" · ")}
          />
        </Link>
      ),
    },
    {
      key: "event",
      header: "Event",
      width: "w-[18%] max-w-0",
      cell: (b) => (
        <CellStack
          primary={<span className="font-normal">{b.eventName || "—"}</span>}
          // eventDate was in the projection and rendered nowhere.
          secondary={b.eventDate ? formatDate(b.eventDate) : undefined}
        />
      ),
    },
    {
      key: "service",
      header: "Service",
      // requirements.description was fetched for every row and never displayed.
      cell: (b) => (
        <span className="line-clamp-2 max-w-64 text-ink-soft">
          {b.requirements?.description || "—"}
        </span>
      ),
    },
    {
      key: "serviceDate",
      header: "Service date",
      cell: (b) => formatDate(b.requirements?.serviceDate),
    },
    { key: "status", header: "Status", cell: (b) => <StatusBadge status={b.status} size="sm" /> },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      cell: (b) =>
        b.quote?.vendorQuote?.totalAmount
          ? formatCurrency(b.quote.vendorQuote.totalAmount, "PKR")
          : <span className="text-ink-faint">Not quoted</span>,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (b) => (
        <Link href={`${basePath}/booking-details/${b.bookingId}`} className={buttonClass("ghost", "sm")}>
          Details
        </Link>
      ),
    },
  ];

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Breadcrumbs items={[{ label: "Dashboard", href: `${basePath}/dashboard` }, { label: "Vendor bookings" }]} />

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

        <FilterTabs tabs={tabs} activeValue={activeTab} label="Booking filters" />

        {/* Was a three-column card grid where each card carried six short facts and
            most of its area was padding. In a table the same rows compare. */}
        <Card>
          <DataTable
            caption={`${activeTab} vendor bookings`}
            rows={filteredBookings}
            columns={columns}
            getKey={(b) => b.bookingId}
            empty={
              <div className="p-6">
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
              </div>
            }
          />
        </Card>
      </div>
    </div>
  );
}
