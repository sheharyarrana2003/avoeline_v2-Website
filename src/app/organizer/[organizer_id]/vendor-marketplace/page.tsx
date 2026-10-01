import { EventVendorService } from "@/src/features/event_vendors/event_venders.services";
import { VendorData } from "@/src/services/models/vendor.model";
import Link from "next/link";
import { formatCurrency } from "@/src/lib/money";
import {
    BadgeCheck,
    Building2,
    Camera,
    LayoutGrid,
    MapPin,
    Music,
    Sparkles,
    Store,
    UtensilsCrossed,
} from "lucide-react";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { StarRating } from "@/src/shared_components/ui/StarRating";
import { buttonClass } from "@/src/lib/ui";
import { SearchField } from "@/src/shared_components/ui/SearchField";
import { matchesQuery, normalizeQuery } from "@/src/lib/search";

// Icons are components, not emoji, and this module renders them itself -- nothing
// crosses the RSC boundary. Decor was labelled with a microphone before.
const CATEGORIES = [
    { id: "all", label: "All", Icon: LayoutGrid },
    { id: "catering", label: "Catering", Icon: UtensilsCrossed },
    { id: "venues", label: "Venues", Icon: Building2 },
    { id: "photography", label: "Photography", Icon: Camera },
    { id: "decor", label: "Decor", Icon: Sparkles },
    { id: "music", label: "Music", Icon: Music },
    { id: "events", label: "Events", Icon: Store },
];

export default async function Vendor_Marketplace({
    params,
    searchParams,
    listingPath,
}: {
    params: Promise<{ organizer_id: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
    listingPath?: string;
}) {
    const { organizer_id } = await params;
    const { hasModuleAccess } = await import("@/src/features/permissions/permissions.service");
    if (!(await hasModuleAccess(organizer_id, "vendor_store"))) {
        const { LockedModulePanel } = await import("@/src/features/permissions/components/LockedModulePanel");
        return (
            <div className="px-4 py-8 sm:px-6 lg:px-8">
                <LockedModulePanel moduleKey="vendor_store" />
            </div>
        );
    }
    const awaited_search_params = await searchParams;

    const vendors: VendorData[] | null = await EventVendorService.getAllVendors();

    const category = awaited_search_params.category;
    const base_url = listingPath ?? `/organizer/${organizer_id}/vendor-marketplace`;

    const query = normalizeQuery(awaited_search_params.q);

    // Category and search compose: a term narrows within the chosen category
    // rather than replacing it.
    const filteredVendors = (vendors ?? []).filter((v: any) => {
        const inCategory =
            !category || category === "all" ||
            v?.serviceCategories?.some((c: string) => c.toLowerCase() === category.toString().toLowerCase());
        return (
            inCategory &&
            matchesQuery(query, [
                v?.businessName,
                v?.serviceCategories,
                v?.contact?.address?.city,
                v?.contact?.address?.country,
                v?.services?.map((s: any) => s?.name),
            ])
        );
    });

    return (
        <div className="px-4 py-8 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">

                <PageHeader
                    title="Discover Providers"
                    description="Browse verified vendors and request a quote for your event."
                    actions={
                        <SearchField
                            action={base_url}
                            placeholder="Search vendors, services, city"
                            defaultValue={query}
                            keep={{ category: category?.toString() }}
                        />
                    }
                />

                {/* Category Filter Pills */}
                <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-1">
                    {CATEGORIES.map(({ id, label, Icon }) => {
                        const isActive = category === id || (!category && id === "all");

                        return (
                            <Link
                                key={id}
                                href={
                                    id === "all"
                                        ? `${base_url}${query ? `?q=${encodeURIComponent(query)}` : ""}`
                                        : `${base_url}?category=${id}${query ? `&q=${encodeURIComponent(query)}` : ""}`
                                }
                                aria-current={isActive ? "page" : undefined}
                                className={buttonClass(isActive ? "primary" : "secondary", "sm")}
                            >
                                <Icon size={14} aria-hidden="true" />
                                {label}
                            </Link>
                        );
                    })}
                </div>

                {/* Vendor Grid */}
                {filteredVendors.length === 0 ? (
                    <EmptyState
                        icon={<Store size={28} />}
                        title={query ? `Nothing matches \u201c${query}\u201d` : category ? "No providers in this category" : "No providers listed yet"}
                        description={
                            category
                                ? "Clear the filter to see every provider on the marketplace."
                                : "Vendors appear here as soon as they publish a profile. Check back shortly."
                        }
                        action={
                            category ? (
                                <Link href={base_url} className={buttonClass("secondary")}>
                                    Show all providers
                                </Link>
                            ) : undefined
                        }
                    />
                ) : (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {filteredVendors.map((vendor: any, index: number) => {
                            const primaryCategory = vendor?.serviceCategories?.[0] || "service";
                            const secondaryCategory = vendor?.serviceCategories?.[1] || "";
                            // Deliberate cover first, then any portfolio image.
                            const coverImage = vendor?.portfolio?.coverImage || vendor?.portfolio?.images?.[0]?.url;
                            const logo = vendor?.logo;
                            const rating = vendor?.ratings?.averageRating || 0;
                            const totalReviews = vendor?.ratings?.totalReviews || 0;
                            const pricePackage = vendor?.pricingPackages?.[0];
                            const price = pricePackage?.price || 0;
                            const city = vendor?.contact?.address?.city || "Pakistan";
                            const country = vendor?.contact?.address?.country || "";

                            return (
                                <div
                                    key={vendor?.vendorId || index}
                                    className="overflow-hidden rounded-2xl border border-line bg-paper transition hover:border-line-loud"
                                >
                                    <div className="h-40 bg-muted">
                                        {coverImage ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={coverImage}
                                                alt=""
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center">
                                                {/* gray-400 = 2.5:1 — a placeholder glyph, aria-hidden, meaning is in the name below. */}
                                                <Building2 size={32} className="text-ink-faint" aria-hidden="true" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-5">
                                        <div className="mb-3 flex items-start gap-3">
                                            <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
                                                {logo ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={logo} alt="" className="h-full w-full object-contain p-1" />
                                                ) : (
                                                    <Store size={16} className="text-ink-faint" aria-hidden="true" />
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h3 className="flex items-center gap-1.5 truncate text-base font-semibold text-ink">
                                                    <span className="truncate">{vendor?.businessName}</span>
                                                    {/* verification.verified was loaded for every vendor in
                                                        this grid and the marketplace showed no badge at all —
                                                        the one signal an organizer picks a vendor on. */}
                                                    {vendor?.verification?.verified ? (
                                                        <BadgeCheck
                                                            size={15}
                                                            className="shrink-0 text-success"
                                                            aria-label="Verified vendor"
                                                        />
                                                    ) : null}
                                                </h3>
                                                <div className="mt-1 flex items-center gap-1.5">
                                                    {totalReviews > 0 ? <StarRating rating={rating} /> : null}
                                                    <span className="text-xs text-ink-soft tabular-nums">
                                                        {/* averageRating is seeded at 5.0 by the model and only
                                                            recomputed when someone leaves a review, so an unreviewed
                                                            vendor was advertising a perfect score. */}
                                                        {totalReviews > 0
                                                            ? `${rating} (${totalReviews} review${totalReviews === 1 ? "" : "s"})`
                                                            : "No reviews yet"}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mb-3 flex flex-wrap gap-2">
                                            <span className="rounded-md bg-muted px-2 py-1 text-2xs font-medium uppercase text-ink-soft">
                                                {primaryCategory}
                                            </span>
                                            {secondaryCategory && (
                                                <span className="rounded-md bg-muted px-2 py-1 text-2xs font-medium uppercase text-ink-soft">
                                                    {secondaryCategory}
                                                </span>
                                            )}
                                        </div>

                                        <p className="mb-3 flex items-center gap-1.5 text-xs text-ink-soft">
                                            <MapPin size={14} className="shrink-0 text-ink-faint" aria-hidden="true" />
                                            {city}{country ? `, ${country}` : ""}
                                        </p>

                                        {/* stats and services were fetched with every vendor and
                                            rendered nowhere on this grid. Track record is what
                                            separates two vendors with the same star rating. */}
                                        <dl className="mb-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-3 text-2xs text-ink-soft">
                                            <div className="flex gap-1">
                                                <dt>Services</dt>
                                                <dd className="font-medium text-ink tabular-nums">{vendor?.services?.length ?? 0}</dd>
                                            </div>

                                        </dl>

                                        <p className="mb-5">
                                            <span className="text-xl font-semibold text-ink tabular-nums">{formatCurrency(price)}</span>
                                            <span className="ml-1 text-xs text-ink-soft">
                                                / {pricePackage?.minOrder ? `min ${pricePackage.minOrder}` : "start"}
                                            </span>
                                        </p>

                                        <div className="flex gap-3">
                                            <Link
                                                href={`/organizer/${organizer_id}/view-vendor/${vendor?.vendorId}`}
                                                className={buttonClass("secondary", "md", "flex-1")}
                                            >
                                                View Profile
                                            </Link>
                                            <Link
                                                href={`/organizer/${organizer_id}/view-vendor/${vendor?.vendorId}/req-quote`}
                                                className={buttonClass("primary", "md", "flex-1")}
                                            >
                                                Request Quote
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
