import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { formatCurrency } from "@/src/lib/money";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { buttonClass } from "@/src/lib/ui";
import Link from 'next/link';
import { Utensils, Volume2, Aperture, Star, Phone, LayoutDashboard, BadgeCheck, Briefcase } from 'lucide-react';
import { EventVendorService } from '@/src/features/event_vendors/event_venders.services';
import { VendorData } from '@/src/services/models/vendor.model';
import { PricingPackage } from '@/src/services/models/vendor.model';

export default async function Vendors({ params }: { params: Promise<{ eventId: string; organizer_id: string }> }) {
    const resolvedParams = await params;
    const event_id = resolvedParams.eventId;
    const organizer_id = resolvedParams.organizer_id;

    const vendors: VendorData[] | null = await EventVendorService.getVendorsByEvent(event_id);

    const renderIcon = (categories: string[]) => {
        if (categories.includes('catering') || categories.includes('food')) {
            return <Utensils size={20} aria-hidden="true" />;
        } else if (categories.includes('av') || categories.includes('sound')) {
            return <Volume2 size={20} aria-hidden="true" />;
        } else if (categories.includes('photography') || categories.includes('video')) {
            return <Aperture size={20} aria-hidden="true" />;
        }
        return <LayoutDashboard size={20} aria-hidden="true" />;
    };

    const getStartingPrice = (packages: PricingPackage[]) => {
        if (!packages || packages.length === 0) return null;
        return Math.min(...packages.map(pkg => pkg.price));
    };

    return (
        // No padding and no <h1>: the event layout renders the event's name, status
        // and tabs. This page is the Vendors section of it.
        <div className="mx-auto max-w-4xl">
            <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
                <h2 className="flex items-center gap-3 font-display text-xl text-ink">
                    Vendors
                    <span className="text-sm text-ink-soft tabular-nums">{vendors?.length ?? 0}</span>
                </h2>

                <Link href={`/organizer/${organizer_id}/vendor-marketplace`} className={buttonClass("primary")}>
                    Find vendors
                </Link>
            </div>

            {!vendors?.length ? (
                <EmptyState
                    icon={<LayoutDashboard className="h-5 w-5" />}
                    title="No vendors assigned yet"
                    description="Book a vendor from the marketplace and they will appear here alongside their quote and contact details."
                    action={
                        <Link href={`/organizer/${organizer_id}/vendor-marketplace`} className={buttonClass("primary")}>
                            Browse the marketplace
                        </Link>
                    }
                />
            ) : (
                <ul className="space-y-4">
                    {vendors.map((vendor, index) => {
                        const startingPrice = getStartingPrice(vendor.pricingPackages);

                        return (
                            // A real card here: each row is its own clickable record.
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
                                            {/* Loaded on every vendor here and rendered on none —
                                                the same gap the marketplace grid had. */}
                                            {vendor.verification?.verified ? (
                                                <BadgeCheck size={14} className="shrink-0 text-success" aria-label="Verified vendor" />
                                            ) : null}
                                        </h3>

                                        <div className="mt-1 flex flex-wrap items-center gap-4 text-xs text-ink-soft tabular-nums">
                                            <span className="flex items-center gap-1">
                                                <Star size={13} className="fill-ink text-ink" aria-hidden="true" />
                                                {vendor.ratings.averageRating.toFixed(1)}
                                                <span>({vendor.ratings.totalReviews})</span>
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                {/* ink-faint = 2.5:1, decoration only -- the number beside it is the content. */}
                                                <Phone size={13} className="text-ink-faint" aria-hidden="true" />
                                                {vendor.contact.primaryPhone}
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <Briefcase size={13} className="text-ink-faint" aria-hidden="true" />
                                                {vendor.stats?.completedBookings ?? 0} completed
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
                                    {/* A verified, active vendor is the good outcome, so it
                                        borrows the confirmed tone; anything else still needs
                                        somebody's attention. `verified` is not a key in
                                        src/lib/status.ts, hence the label override. */}
                                    <StatusBadge
                                        status={vendor.status === "active" && vendor.verification.verified ? "confirmed" : vendor.status}
                                        label={vendor.status === "active" && vendor.verification.verified ? "Verified" : undefined}
                                        size="sm"
                                    />
                                    <div className="sm:text-right">
                                        <p className="text-2xs font-medium uppercase text-ink-soft">
                                            {startingPrice ? 'Starting price' : 'Estimated'}
                                        </p>
                                        <p className="text-lg font-medium text-ink tabular-nums">
                                            {startingPrice ? formatCurrency(startingPrice) : 'TBD'}
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
