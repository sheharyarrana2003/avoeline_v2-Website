import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { formatCurrency } from "@/src/lib/money";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { buttonClass } from "@/src/lib/ui";
import Link from "next/link";
import {
  Utensils,
  Volume2,
  Aperture,
  Star,
  Phone,
  LayoutDashboard,
  BadgeCheck,
} from "lucide-react";
import { EventVendorService } from "@/src/features/event_vendors/event_venders.services";
import { VendorData, PricingPackage } from "@/src/services/models/vendor.model";
import { listExternalVendors } from "@/src/features/event_external_vendors/externalVendors.service";
import { AddOwnVendorModal } from "@/src/features/event_external_vendors/components/AddOwnVendorModal";
import { deleteExternalVendorAction } from "@/src/features/event_external_vendors/actions/externalVendors.action";

export default async function Vendors({
  params,
}: {
  params: Promise<{ eventId: string; organizer_id: string }>;
}) {
  const resolvedParams = await params;
  const event_id = resolvedParams.eventId;
  const organizer_id = resolvedParams.organizer_id;

  const [vendors, ownVendors] = await Promise.all([
    EventVendorService.getVendorsByEvent(event_id),
    listExternalVendors(event_id),
  ]);

  const renderIcon = (categories: string[]) => {
    if (categories.includes("catering") || categories.includes("food")) {
      return <Utensils size={20} aria-hidden="true" />;
    }
    if (categories.includes("av") || categories.includes("sound")) {
      return <Volume2 size={20} aria-hidden="true" />;
    }
    if (categories.includes("photography") || categories.includes("video")) {
      return <Aperture size={20} aria-hidden="true" />;
    }
    return <LayoutDashboard size={20} aria-hidden="true" />;
  };

  const getStartingPrice = (packages: PricingPackage[]) => {
    if (!packages || packages.length === 0) return null;
    return Math.min(...packages.map((pkg) => pkg.price));
  };

  const total = (vendors?.length ?? 0) + ownVendors.length;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
        <h2 className="flex items-center gap-3 font-display text-xl text-ink">
          Vendors
          <span className="text-sm text-ink-soft tabular-nums">{total}</span>
        </h2>
        <div className="flex flex-wrap gap-2">
          <AddOwnVendorModal eventId={event_id} />
          <Link
            href={`/organizer/${organizer_id}/vendor-marketplace`}
            className={buttonClass("primary")}
          >
            Find vendors
          </Link>
        </div>
      </div>

      {!total ? (
        <EmptyState
          icon={<LayoutDashboard className="h-5 w-5" />}
          title="No vendors yet"
          description="Book from the marketplace or add your own vendor. Own vendors are free on every plan."
          action={
            <div className="flex flex-wrap gap-2">
              <AddOwnVendorModal eventId={event_id} />
              <Link
                href={`/organizer/${organizer_id}/vendor-marketplace`}
                className={buttonClass("primary")}
              >
                Browse the marketplace
              </Link>
            </div>
          }
        />
      ) : (
        <ul className="space-y-4">
          {ownVendors.map((v) => (
            <li
              key={v.id}
              className="flex flex-col gap-4 rounded-2xl border border-line bg-paper p-5 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-medium text-ink">{v.name}</h3>
                  <span className="rounded-md bg-muted px-2 py-0.5 text-2xs font-semibold uppercase text-ink-soft">
                    Own
                  </span>
                  <StatusBadge
                    status={
                      v.status === "cancelled"
                        ? "cancelled"
                        : v.status === "paid"
                          ? "confirmed"
                          : "pending"
                    }
                    label={v.status}
                    size="sm"
                  />
                </div>
                <p className="text-sm text-ink-soft">
                  {v.vendorType || "Vendor"}
                  {v.budget != null ? ` · Budget ${formatCurrency(v.budget)}` : ""}
                </p>
                {v.contact ? <p className="mt-1 text-xs text-ink-soft">{v.contact}</p> : null}
                {v.description ? <p className="mt-2 text-sm text-ink">{v.description}</p> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={`/organizer/${organizer_id}/events/${event_id}/expenses?external_vendor_id=${v.id}`}
                    className={buttonClass("secondary", "sm")}
                  >
                    Create expense from this vendor
                  </Link>
                  <form action={deleteExternalVendorAction}>
                    <input type="hidden" name="eventId" value={event_id} />
                    <input type="hidden" name="id" value={v.id} />
                    <button type="submit" className={buttonClass("destructive", "sm")}>
                      Remove
                    </button>
                  </form>
                </div>
              </div>
            </li>
          ))}

          {(vendors ?? []).map((vendor, index) => {
            const startingPrice = getStartingPrice(vendor.pricingPackages);
            return (
              <li
                key={vendor.vendorId || index}
                className="flex flex-col gap-5 rounded-2xl border border-line bg-paper p-5 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-4">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-muted text-ink">
                    {renderIcon(vendor.serviceCategories)}
                  </span>
                  <div className="min-w-0">
                    <h3 className="flex items-center gap-1.5 truncate text-base font-medium text-ink">
                      <span className="truncate">{vendor.businessName}</span>
                      <span className="rounded-md bg-muted px-2 py-0.5 text-2xs font-semibold uppercase text-ink-soft">
                        Marketplace
                      </span>
                      {vendor.verification?.verified ? (
                        <BadgeCheck
                          size={14}
                          className="shrink-0 text-success"
                          aria-label="Verified vendor"
                        />
                      ) : null}
                    </h3>
                    <div className="mt-1 flex flex-wrap items-center gap-4 text-xs text-ink-soft tabular-nums">
                      {vendor.ratings.totalReviews > 0 ? (
                        <span className="flex items-center gap-1">
                          <Star size={13} className="fill-ink text-ink" aria-hidden="true" />
                          {vendor.ratings.averageRating.toFixed(1)}
                          <span>({vendor.ratings.totalReviews})</span>
                        </span>
                      ) : (
                        <span className="text-ink-faint">No reviews yet</span>
                      )}
                      <span className="flex items-center gap-1.5">
                        <Phone size={13} className="text-ink-faint" aria-hidden="true" />
                        {vendor.contact.primaryPhone}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link
                        href={`/organizer/${organizer_id}/view-vendor/${vendor.vendorId}`}
                        className={buttonClass("secondary", "sm")}
                      >
                        View profile
                      </Link>
                      <Link
                        href={`/organizer/${organizer_id}/view-vendor/${vendor.vendorId}/req-quote`}
                        className={buttonClass("primary", "sm")}
                      >
                        Request quote
                      </Link>
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 flex-row items-center justify-between gap-4 sm:flex-col sm:items-end">
                  <StatusBadge
                    status={
                      vendor.status === "active" && vendor.verification.verified
                        ? "confirmed"
                        : vendor.status
                    }
                    label={
                      vendor.status === "active" && vendor.verification.verified
                        ? "Verified"
                        : undefined
                    }
                    size="sm"
                  />
                  <div className="sm:text-right">
                    <p className="text-2xs font-medium uppercase text-ink-soft">
                      {startingPrice ? "Starting price" : "Estimated"}
                    </p>
                    <p className="text-lg font-medium text-ink tabular-nums">
                      {startingPrice ? formatCurrency(startingPrice) : "TBD"}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
