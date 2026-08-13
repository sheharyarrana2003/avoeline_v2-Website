// app/vendor/[vendor_id]/profile/page.tsx
// Fully Server Component

import { EventVendorService } from "@/src/features/event_vendors/event_venders.services";
import { BookingServices } from "@/src/features/bookings/bookings.service";
import { EventService } from "@/src/services/event.service";
import { AuthService } from "@/src/features/auth/authService";
import { VendorLogoUpload } from "@/src/features/event_vendors/components/VendorLogoUpload";
import { VendorCoverUpload } from "@/src/features/event_vendors/components/VendorCoverUpload";
import { PortfolioImageManager } from "@/src/features/event_vendors/components/PortfolioImageManager";
import { PortfolioVideoManager } from "@/src/features/event_vendors/components/PortfolioVideoManager";
import { FeedbackService } from "@/src/services/feedback.service";
import { formatDate } from "@/src/lib/datetime";
import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { adminDb } from "@/data/admin_db";
import { COLLECTIONS } from "@/data/collections";
import { formatCurrency } from "@/src/lib/money";
import { StarRating } from "@/src/shared_components/ui/StarRating";
import { MetricTile } from "@/src/shared_components/ui/MetricTile";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import { CalendarCheck, Clock, Globe, ImageOff, MapPin, MessageSquare, Package, Repeat } from "lucide-react";

const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
        'catering': 'Catering',
        'event_management': 'Event Management',
        'venues': 'Venues',
        'photography': 'Photography',
        'decor': 'Decoration',
        'music': 'Music',
        'av_equipment': 'AV Equipment',
    };
    return labels[category?.trim().toLowerCase()] || category?.trim();
};

/**
 * Years since the account was created. Goes through formatDate rather than
 * `new Date(stored)`: createdAt arrives as a Firestore Timestamp, an ISO string
 * or DD/MM/YYYY depending on when the doc was written, and only the shared
 * parser handles all three. An unparseable value formats to "—" and yields 0.
 */
const getYearsInBusiness = (createdAt: unknown) => {
    const year = Number(formatDate(createdAt).split("/")[2]);
    if (!Number.isFinite(year)) return 0;
    return Math.max(0, new Date().getFullYear() - year);
};

export default async function VendorProfilePage({
    params,
    searchParams
}: {
    params: Promise<{ vendor_id: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const { vendor_id } = await params;
    const awaitedSearchParams = await searchParams;
    const isPreview = awaitedSearchParams?.preview === 'true';

    // Fetch vendor data alongside the reviews organizers have left for them.
    const [vendor, vendorReviews] = await Promise.all([
        EventVendorService.getVendorById(vendor_id),
        FeedbackService.getVendorReviews(vendor_id),
    ]);
    if (!vendor) {
        notFound();
    }

    const v = vendor;
    const businessName = v?.businessName || "Vendor Profile";
    const rating = v?.ratings?.averageRating || 0;
    const totalReviews = v?.ratings?.totalReviews || 0;
    const stats = v?.stats || {};
    const contact = v?.contact;
    const address = contact?.address;
    const portfolioImages = v?.portfolio?.images || [];
    // Prefer the deliberately-chosen cover; fall back to the first portfolio image.
    const coverImage = v?.portfolio?.coverImage || portfolioImages[0]?.url || "";
    const yearsInBusiness = getYearsInBusiness(v?.createdAt);

    // The vendor's real service catalogue. This used to run through a mapper that
    // dropped `description` and then rendered `service.description` anyway, so
    // every row showed a blank second line.
    const services = v?.services || [];
    const serviceCategories = (v?.serviceCategories || []).map((c) => c.trim()).filter(Boolean);

    // Real booking-derived stats from the bookings collection.
    const bookings = (await BookingServices.getAllBookingsOfVendor(vendor_id)) ?? [];
    const totalBookings = bookings.length;
    const bookingsByOrganizer: Record<string, number> = {};
    bookings.forEach((b: any) => {
        const orgId = b?.organizerId;
        if (orgId) bookingsByOrganizer[orgId] = (bookingsByOrganizer[orgId] ?? 0) + 1;
    });
    const repeatBookings = Object.values(bookingsByOrganizer).filter((c) => c > 1).reduce((s, c) => s + c, 0);
    const repeatPct = totalBookings > 0 ? Math.round((repeatBookings / totalBookings) * 100) : 0;
    const avgResponseTime = (stats as any)?.avgResponseTime || "—";

    // Portfolio sections (normalized by mapToPortfolio, so always arrays).
    const portfolioVideos: string[] = v?.portfolio?.videos || [];
    const clientTestimonials = v?.portfolio?.clientTestimonials || [];

    // Resolve the vendor's booked events (id → title) so past events read as
    // titles rather than raw IDs.
    const bookedEventIds = [...new Set(bookings.map((b: any) => b?.eventId).filter(Boolean))] as string[];
    const bookedEvents = (
        await Promise.all(
            bookedEventIds.map(async (id) => {
                try {
                    const ev = await EventService.getEventByID(id);
                    return ev ? { id, title: ev.title || id } : { id, title: id };
                } catch {
                    return { id, title: id };
                }
            })
        )
    );
    const eventTitleById = new Map(bookedEvents.map((e) => [e.id, e.title]));

    // Past events are *earned*, not chosen: every event this vendor actually
    // completed a booking for. The vendor used to hand-pick these from a
    // dropdown, which made the list a claim rather than a record.
    const completedEvents = [
        ...new Map(
            bookings
                .filter((b: any) => b?.status === "completed" && b?.eventId)
                .map((b: any) => [b.eventId, { id: b.eventId, title: eventTitleById.get(b.eventId) || b.eventId }])
        ).values(),
    ];

    const tabs = [
        { id: 'services', label: 'Services' },
        { id: 'portfolio', label: 'Portfolio' },
        { id: 'reviews', label: 'Reviews' },
    ];
    // Active tab from URL
    const activeTab = (awaitedSearchParams?.tab as string) || 'services';

    return (
        <div className="px-4 py-8 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl">
                <PageHeader
                    title="Profile"
                    description={isPreview ? "Exactly what an organizer sees when they open your profile." : "Your public profile, and the account details behind it."}
                    actions={
                        <Link
                            href={`/vendor/${vendor_id}/profile?preview=${!isPreview}`}
                            aria-pressed={isPreview}
                            className={buttonClass(isPreview ? "primary" : "secondary")}
                        >
                            {isPreview ? "Exit organizer preview" : "Preview as organizer"}
                        </Link>
                    }
                />

                {/* Hero */}
                <section className="overflow-hidden rounded-2xl border border-line bg-paper">
                    <div className="relative h-48 bg-muted">
                        {coverImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={coverImage}
                                alt=""
                                loading="lazy"
                                decoding="async"
                                className="h-full w-full object-cover grayscale"
                            />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center text-ink-faint">
                                {/* gray-400 = 2.5:1: decoration inside an aria-hidden placeholder. */}
                                <ImageOff size={28} aria-hidden="true" />
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-4">
                            {v.logo ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={v.logo}
                                    alt=""
                                    className="-mt-14 h-16 w-16 shrink-0 rounded-full border-4 border-paper bg-paper object-contain p-1.5"
                                />
                            ) : (
                                <div className="-mt-14 flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4 border-paper bg-ink font-display text-xl text-ink-invert">
                                    {businessName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                                </div>
                            )}

                            <div>
                                <h2 className="font-display text-2xl text-ink">{businessName}</h2>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                                    {/* No stars until someone has actually rated: averageRating is
                                        seeded at 5.0 and only reviewVendor recomputes it. */}
                                    {totalReviews > 0 ? (
                                        <>
                                            <StarRating rating={rating} />
                                            <span className="text-sm text-ink-soft tabular-nums">
                                                {rating.toFixed(1)} ({totalReviews} review{totalReviews === 1 ? "" : "s"})
                                            </span>
                                        </>
                                    ) : (
                                        <span className="text-sm text-ink-soft">Not rated yet</span>
                                    )}
                                </div>
                                <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-soft">
                                    <MapPin size={14} className="shrink-0 text-ink-faint" aria-hidden="true" />
                                    {[address?.city, address?.country].filter(Boolean).join(', ') || 'Location not set'}
                                </p>
                                {serviceCategories.length > 0 && (
                                    <ul className="mt-3 flex flex-wrap gap-2">
                                        {serviceCategories.map((cat) => (
                                            <li key={cat} className="rounded-full border border-line px-3 py-1 text-2xs font-medium uppercase text-ink-soft">
                                                {getCategoryLabel(cat)}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>

                        {/* The LinkedIn and GitHub icons that sat here were both href="#". */}
                        {contact?.website && (
                            <a
                                href={contact.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={buttonClass("secondary", "sm")}
                            >
                                <Globe size={14} aria-hidden="true" />
                                Website
                            </a>
                        )}
                    </div>
                </section>

                {/* The rest of vendor.stats was sitting one property away the whole
                    time — completed count, cancellation rate, lifetime revenue — and
                    "Bookings 41" on its own says nothing about whether they went well. */}
                <section className="grid grid-cols-1 rounded-2xl border border-line bg-paper shadow-sm sm:grid-cols-4">
                    <MetricTile
                        label="Bookings"
                        value={String(totalBookings)}
                        icon={<CalendarCheck size={14} />}
                        sublabel={`${bookings.filter((b: any) => b?.status?.toLowerCase() === "completed").length} completed`}
                    />
                    <MetricTile
                        label="Years active"
                        value={String(yearsInBusiness)}
                        icon={<Clock size={14} />}
                        sublabel={`${v.services?.length ?? 0} services listed`}
                    />
                    <MetricTile
                        label="Avg response"
                        value={String(avgResponseTime)}
                        icon={<MessageSquare size={14} />}
                        sublabel={`${totalBookings ? Math.round((bookings.filter((b: any) => b?.status?.toLowerCase() === "cancelled").length / totalBookings) * 100) : 0}% cancellation rate`}
                    />
                    <MetricTile
                        label="Repeat clients"
                        value={`${repeatPct}%`}
                        icon={<Repeat size={14} />}
                        sublabel={totalReviews > 0 ? `${totalReviews} review${totalReviews === 1 ? "" : "s"}` : "No reviews yet"}
                    />
                </section>

                {!isPreview && (
                    <section className="mt-10">
                        <h2 className="mb-4 border-b border-line pb-3 font-display text-xl text-ink">Branding</h2>
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                            <div>
                                <p className={labelClass}>Business logo</p>
                                <div className="mt-2">
                                    <VendorLogoUpload vendorId={vendor_id} currentLogo={v.logo} />
                                </div>
                            </div>
                            <div>
                                <p className={labelClass}>Cover image</p>
                                <div className="mt-2">
                                    <VendorCoverUpload vendorId={vendor_id} currentCover={v?.portfolio?.coverImage} />
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {/* Tabs */}
                <nav aria-label="Profile sections" className="mt-10 flex gap-6 border-b border-line">
                    {tabs.map((tab) => (
                        <Link
                            key={tab.id}
                            href={`/vendor/${vendor_id}/profile?tab=${tab.id}${isPreview ? '&preview=true' : ''}`}
                            aria-current={activeTab === tab.id ? "page" : undefined}
                            className={`-mb-px whitespace-nowrap border-b-2 pb-3 text-sm font-medium transition ${
                                activeTab === tab.id
                                    ? "border-ink text-ink"
                                    : "border-transparent text-ink-soft hover:text-ink"
                            }`}
                        >
                            {tab.label}
                        </Link>
                    ))}
                </nav>

                <div className="mt-8">
                    {activeTab === 'services' && (
                        services.length > 0 ? (
                            <ul className="divide-y divide-line">
                                {services.map((service, i) => (
                                    <li key={service.serviceId || i} className="flex items-start justify-between gap-4 py-4">
                                        <div>
                                            <p className="text-sm font-medium text-ink">{service.name}</p>
                                            {service.description && (
                                                <p className="mt-0.5 text-xs text-ink-soft">{service.description}</p>
                                            )}
                                        </div>
                                        <div className="shrink-0 text-right">
                                            <p className="text-sm font-medium text-ink tabular-nums">{formatCurrency(service.price)}</p>
                                            <p className="text-2xs text-ink-soft tabular-nums">
                                                {service.minOrder ? `min ${service.minOrder}` : 'per unit'}
                                            </p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <EmptyState
                                icon={<Package size={26} />}
                                title="No services listed"
                                description="Organizers search this catalogue. Until something is in it, you won't appear in their results."
                                action={
                                    !isPreview ? (
                                        <Link href={`/vendor/${vendor_id}/services/add-service`} className={buttonClass("primary")}>
                                            Add a service
                                        </Link>
                                    ) : undefined
                                }
                            />
                        )
                    )}

                    {activeTab === 'portfolio' && (
                        !isPreview ? (
                            <div className="space-y-8">
                                <PortfolioImageManager vendorId={vendor_id} images={portfolioImages} />
                                <div>
                                    <p className={labelClass}>Videos</p>
                                    <div className="mt-2">
                                        <PortfolioVideoManager vendorId={vendor_id} videos={portfolioVideos} />
                                    </div>
                                </div>
                                <div>
                                    <p className={labelClass}>Past events</p>
                                    {completedEvents.length > 0 ? (
                                        <ul className="mt-2 flex flex-wrap gap-2">
                                            {completedEvents.map((e) => (
                                                <li key={e.id} className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink-soft">{e.title}</li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="mt-2 text-sm text-ink-soft">
                                            Events you complete a booking for appear here automatically.
                                        </p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {portfolioImages.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                        {portfolioImages.map((img: any, i: number) => (
                                            <div key={i} className="aspect-square overflow-hidden rounded-xl bg-muted">
                                                {img?.url ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={img.url} alt={img.caption || ""} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                                                ) : null}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <EmptyState
                                        size="sm"
                                        icon={<ImageOff size={22} />}
                                        title="No portfolio images yet"
                                        description="Photographs of past work are the first thing an organizer looks at."
                                    />
                                )}

                                {portfolioVideos.length > 0 && (
                                    <div>
                                        <p className={labelClass}>Videos</p>
                                        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                            {portfolioVideos.map((url: string, i: number) => (
                                                <video key={i} src={url} controls className="aspect-video w-full rounded-xl bg-panel object-cover" />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {completedEvents.length > 0 && (
                                    <div>
                                        <p className={labelClass}>Past events</p>
                                        <ul className="mt-2 flex flex-wrap gap-2">
                                            {completedEvents.map((e) => (
                                                <li key={e.id} className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink-soft">{e.title}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )
                    )}

                    {activeTab === 'reviews' && (
                        <div className="space-y-8">
                            {/* Reviews come from organizers after a completed booking — the
                                vendor can't author these, only read them. */}
                            {vendorReviews.length > 0 && (
                                <ul className="divide-y divide-line">
                                    {vendorReviews.map((r) => (
                                        <li key={r.id} className="py-4">
                                            <div className="flex items-center justify-between gap-3">
                                                <StarRating rating={r.rating} />
                                                <span className="rounded-full border border-ink bg-ink px-2 py-0.5 text-2xs font-bold uppercase text-ink-invert">
                                                    Verified booking
                                                </span>
                                            </div>
                                            {r.title && <p className="mt-2 text-sm font-medium text-ink">{r.title}</p>}
                                            <p className="mt-1 text-sm text-ink-soft">{r.comment}</p>
                                            <p className="mt-2 text-xs text-ink-soft tabular-nums">
                                                {r.reviewerName || 'Event organizer'}{r.createdAt ? ` • ${formatDate(r.createdAt)}` : ""}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            )}

                            {clientTestimonials.length > 0 && (
                                <div>
                                    <p className={labelClass}>Your older testimonials</p>
                                    <ul className="mt-2 divide-y divide-line">
                                        {clientTestimonials.map((t: any, i: number) => (
                                            <li key={i} className="py-4">
                                                <StarRating rating={t?.rating || 5} />
                                                <p className="mt-2 text-sm italic text-ink-soft">&quot;{t?.testimonial}&quot;</p>
                                                <p className="mt-2 text-xs text-ink-soft tabular-nums">
                                                    {t?.clientName}{t?.eventDate ? ` • ${formatDate(t.eventDate)}` : ""}
                                                </p>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {vendorReviews.length === 0 && clientTestimonials.length === 0 && (
                                <EmptyState
                                    icon={<MessageSquare size={26} />}
                                    title="No reviews yet"
                                    description="Organizers can review you once a booking is completed. Delivering the first one is how this section fills up."
                                />
                            )}
                        </div>
                    )}
                </div>

                {/* Account details. Previously three inputs with no `name`, sitting
                    outside the <form>, above a "Save Changes" action whose body was a
                    console.log — so every edit was discarded twice over. One form,
                    named fields, and a write that lands. */}
                {!isPreview && (
                    <form action={saveProfileAction} className="mt-12">
                        <h2 className="mb-4 border-b border-line pb-3 font-display text-xl text-ink">Account details</h2>
                        <input type="hidden" name="vendorId" value={vendor_id} />

                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <label htmlFor="businessName" className={labelClass}>Business name</label>
                                <input
                                    id="businessName"
                                    type="text"
                                    name="businessName"
                                    defaultValue={v.businessName || ''}
                                    required
                                    className={`${fieldClass} mt-2`}
                                />
                            </div>
                            <div>
                                <label htmlFor="businessEmail" className={labelClass}>Business email</label>
                                <input
                                    id="businessEmail"
                                    type="email"
                                    name="businessEmail"
                                    defaultValue={contact?.businessEmail || ''}
                                    placeholder="business@email.com"
                                    className={`${fieldClass} mt-2`}
                                />
                            </div>
                            <div>
                                <label htmlFor="primaryPhone" className={labelClass}>Phone number</label>
                                <input
                                    id="primaryPhone"
                                    type="tel"
                                    name="primaryPhone"
                                    defaultValue={contact?.primaryPhone || ''}
                                    placeholder="+92 300 0000000"
                                    className={`${fieldClass} mt-2 tabular-nums`}
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <label htmlFor="website" className={labelClass}>Website</label>
                                <input
                                    id="website"
                                    type="url"
                                    name="website"
                                    defaultValue={contact?.website || ''}
                                    placeholder="https://"
                                    className={`${fieldClass} mt-2`}
                                />
                            </div>
                        </div>

                        <div className="mt-6 flex items-center justify-end gap-2 border-t border-line pt-6">
                            <Link href={`/vendor/${vendor_id}/profile`} className={buttonClass("ghost")}>
                                Reset
                            </Link>
                            <SubmitButton pendingText="Saving…" className={buttonClass("primary")}>
                                Save changes
                            </SubmitButton>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}

// Server Actions
//
// The five actions that used to live here — toggle2FA, toggleNotification,
// pauseAccount, deactivateAccount, deleteProfile — were each a console.log and a
// redirect under a "TODO: … via API" comment, and three of them were already
// commented out of the markup. Deleted rather than left looking operable.

async function saveProfileAction(formData: FormData) {
    'use server';

    const vendorId = formData.get('vendorId') as string;
    if (!vendorId) return;

    // A Server Action is a public endpoint: without this, anyone signed in could
    // POST another vendor's id and rewrite their profile.
    const u = await AuthService.getCurrentUser();
    if (!u || u.userType !== 'vendor' || u.roleId !== vendorId) return;

    const vendor = await EventVendorService.getVendorById(vendorId);
    if (!vendor) return;

    const businessName = ((formData.get('businessName') as string) || "").trim();

    // Vendor docs are keyed by the auth uid (== vendor.userId), not the vendorId
    // field getVendorById queries on. Dotted paths rather than a rebuilt `contact`
    // map: writing the whole map would drop the address and social sub-objects
    // this form never sees.
    const docId = vendor.userId || vendorId;
    await adminDb.collection(COLLECTIONS.VENDORS).doc(docId).update({
        ...(businessName ? { businessName } : {}),
        "contact.businessEmail": ((formData.get('businessEmail') as string) || "").trim(),
        "contact.primaryPhone": ((formData.get('primaryPhone') as string) || "").trim(),
        "contact.website": ((formData.get('website') as string) || "").trim(),
    });

    revalidatePath(`/vendor/${vendorId}/profile`, "layout");
}
