import { EventVendorService } from "@/src/features/event_vendors/event_venders.services";
import { EventService } from "@/src/services/event.service";
import { Service } from "@/src/services/models/vendor.model";
import Link from "next/link";
import { formatDate } from "@/src/lib/datetime";
import { FeedbackService } from "@/src/services/feedback.service";
import { BookingServices } from "@/src/features/bookings/bookings.service";
import { formatCurrency } from "@/src/lib/money";
import { StarRating } from "@/src/shared_components/ui/StarRating";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { buttonClass } from "@/src/lib/ui";
import {
    Building2,
    Check,
    Globe,
    Image as ImageIcon,
    Mail,
    MapPin,
    Package,
    Phone,
    Star,
} from "lucide-react";

export default async function VendorProfilePage({
    params,
    searchParams
}: {
    params: Promise<{ organizer_id: string; vendor_id: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const { organizer_id, vendor_id } = await params;
    const awaitedSearchParams = await searchParams;

    const activeTab = (awaitedSearchParams?.tab as string) || "services";

    // Fetch vendor data alongside the reviews organizers have written about them.
    const [v, vendorReviews] = await Promise.all([
        EventVendorService.getVendorById(vendor_id),
        FeedbackService.getVendorReviews(vendor_id),
    ]);

    const businessName = v?.businessName || "Vendor Profile";
    const rating = v?.ratings?.averageRating || 0;
    const totalReviews = v?.ratings?.totalReviews || 0;
    const city = v?.contact?.address?.city || "Unknown City";
    const country = v?.contact?.address?.country || "";
    const street = v?.contact?.address?.street || "";
    const primaryPhone = v?.contact?.primaryPhone || "";
    const businessEmail = v?.contact?.businessEmail || "";
    const website = v?.contact?.website || "";
    const portfolioImages = v?.portfolio?.images || [];
    const portfolioVideos = v?.portfolio?.videos || [];
    const logo = v?.logo || "";
    const testimonials = v?.portfolio?.clientTestimonials || [];
    const verificationBadges = v?.verification?.verificationBadges || [];
    const isVerified = v?.verification?.verified || false;
    const stats = v?.stats || {};
    const createdAt = v?.createdAt || "";
    const services = v?.services || [];

    const yearsInBusiness = createdAt
        ? new Date().getFullYear() - new Date(createdAt).getFullYear()
        : null;

    // Past events are derived from the vendor's completed bookings, not from a
    // list they picked themselves — an organizer reading this needs a record of
    // work actually delivered. Titles resolved, falling back to the raw id.
    const vendorBookings = (await BookingServices.getAllBookingsOfVendor(vendor_id)) ?? [];
    const completedEventIds: string[] = [
        ...new Set<string>(
            vendorBookings
                .filter((b: any) => b?.status === "completed" && b?.eventId)
                .map((b: any) => String(b.eventId))
        ),
    ];
    const pastEvents = await Promise.all(
        completedEventIds.map(async (id) => {
            try {
                const ev = await EventService.getEventByID(id);
                return { id, title: ev?.title || id };
            } catch {
                return { id, title: id };
            }
        })
    );

    const profileUrl = `/organizer/${organizer_id}/view-vendor/${vendor_id}`;
    const quoteUrl = `${profileUrl}/req-quote`;

    const tabs = [
        { id: "services", label: "Services" },
        { id: "portfolio", label: "Portfolio" },
        { id: "reviews", label: `Reviews (${totalReviews})` },
    ];

    const quickStats = [
        stats?.completedEvents ? { label: "Events", value: String(stats.completedEvents) } : null,
        stats?.responseTime ? { label: "Response", value: String(stats.responseTime) } : null,
        stats?.repeatClientRate ? { label: "Repeat clients", value: String(stats.repeatClientRate) } : null,
    ].filter(Boolean) as { label: string; value: string }[];

    return (
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <PageHeader
                title={businessName}
                description={[city, country].filter(Boolean).join(", ")}
                actions={
                    <Link href={quoteUrl} className={buttonClass("primary")}>
                        Request quote
                    </Link>
                }
            />

            {/* Identity row — the dark cover-photo letterhead this replaces spent half a
                screen restating the title now sitting directly above it. */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-line bg-paper">
                    {logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={logo} alt="" className="h-full w-full object-cover" />
                    ) : (
                        <Building2 className="h-6 w-6 text-gray-400" aria-hidden="true" />
                    )}
                </span>

                <div className="flex flex-wrap items-center gap-2">
                    <StarRating rating={rating} size="sm" />
                    <span className="text-sm font-medium text-ink tabular-nums">{rating || "N/A"}</span>
                    <span className="text-xs text-ink-soft tabular-nums">({totalReviews} review{totalReviews === 1 ? '' : 's'})</span>
                    {yearsInBusiness !== null && yearsInBusiness > 0 && (
                        <span className="text-xs text-ink-soft tabular-nums">
                            • {yearsInBusiness} {yearsInBusiness === 1 ? "year" : "years"} in business
                        </span>
                    )}
                </div>

                {(isVerified || verificationBadges.length > 0) && (
                    <ul className="flex flex-wrap gap-2">
                        {(isVerified ? ["Verified", ...verificationBadges.slice(0, 2)] : verificationBadges.slice(0, 2)).map((badge: string, i: number) => (
                            <li key={i} className="inline-flex items-center gap-1 rounded-full border border-line-loud px-2.5 py-0.5 text-2xs font-medium uppercase text-ink">
                                <Check className="h-3 w-3" aria-hidden="true" />
                                {badge}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {quickStats.length > 0 && (
                <section className="mt-8 grid grid-cols-2 gap-y-8 border-y border-line py-8 sm:grid-cols-4 sm:divide-x sm:divide-line">
                    {quickStats.map((s) => (
                        <div key={s.label} className="px-0 sm:px-6 sm:first:pl-0">
                            <p className="text-xs font-medium uppercase text-ink-soft">{s.label}</p>
                            <p className="mt-2 font-display text-4xl text-ink tabular-nums">{s.value}</p>
                        </div>
                    ))}
                </section>
            )}

            {/* Tabs */}
            <nav className="mt-8 flex gap-6 border-b border-line" aria-label="Vendor sections">
                {tabs.map((tab) => (
                    <Link
                        key={tab.id}
                        href={`${profileUrl}?tab=${tab.id}`}
                        aria-current={activeTab === tab.id ? "page" : undefined}
                        className={`-mb-px border-b-2 pb-3 text-sm transition ${activeTab === tab.id
                            ? "border-gray-900 font-medium text-ink"
                            : "border-transparent text-ink-soft hover:text-ink"
                            }`}
                    >
                        {tab.label}
                    </Link>
                ))}
            </nav>

            <div className="py-8">
                {activeTab === "services" && (
                    services.length > 0 ? (
                        <ul className="space-y-4">
                            {services.map((pkg: Service, index: number) => {
                                // Media from THE SERVICE — no positional portfolio offset.
                                const packageVideo = pkg?.videos?.[0];
                                const packageImage = pkg?.images?.[0];
                                const inclusions = pkg?.inclusions || [];

                                return (
                                    <li key={pkg?.serviceId || index} className="flex flex-col gap-6 rounded-2xl border border-line bg-paper p-5 md:flex-row">
                                        <div className="h-40 w-full shrink-0 overflow-hidden rounded-2xl bg-gray-100 md:w-48">
                                            {packageVideo ? (
                                                <video src={packageVideo} muted loop playsInline className="h-full w-full object-cover" />
                                            ) : packageImage ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={packageImage} alt="" className="h-full w-full object-cover" />
                                            ) : (
                                                <span className="flex h-full w-full items-center justify-center">
                                                    {/* gray-400 = 2.5:1, decoration only — this is a placeholder, not information. */}
                                                    <Package className="h-8 w-8 text-gray-400" aria-hidden="true" />
                                                </span>
                                            )}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
                                                <h3 className="text-base font-medium text-ink">{pkg?.name || "Unnamed package"}</h3>
                                                <p className="shrink-0 text-base font-medium text-ink tabular-nums md:text-right">
                                                    {pkg?.price ? formatCurrency(pkg.price) : "Custom"}
                                                    <span className="ml-1 text-xs font-normal text-ink-soft">
                                                        / {pkg?.minOrder ? `min ${pkg.minOrder}` : 'person'}
                                                    </span>
                                                </p>
                                            </div>

                                            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                                                {pkg?.description || "No description available for this package."}
                                            </p>

                                            {inclusions.length > 0 && (
                                                <ul className="mt-4 grid grid-cols-1 gap-x-8 gap-y-2 md:grid-cols-2">
                                                    {inclusions.map((item: string, i: number) => (
                                                        <li key={i} className="flex items-center gap-2 text-sm text-ink">
                                                            <Check className="h-4 w-4 shrink-0 text-ink" aria-hidden="true" />
                                                            {item}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}

                                            <Link
                                                href={`${quoteUrl}?package=${pkg?.serviceId || ''}`}
                                                className={buttonClass("secondary", "sm", "mt-5")}
                                            >
                                                {pkg?.price ? "Request quote for this service" : "Inquire for custom pricing"}
                                            </Link>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <EmptyState
                            icon={<Package className="h-5 w-5" />}
                            title="No packages listed"
                            description="This vendor has not published any service packages. You can still ask them to price your requirements."
                            action={
                                <Link href={quoteUrl} className={buttonClass("primary")}>
                                    Request custom quote
                                </Link>
                            }
                        />
                    )
                )}

                {activeTab === "portfolio" && (
                    <div className="space-y-10">
                        {portfolioImages.length > 0 ? (
                            <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {portfolioImages.map((img: any, i: number) => (
                                    <li key={i} className="overflow-hidden rounded-2xl border border-line bg-paper">
                                        <div className="relative h-56 bg-gray-100">
                                            {img?.url ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={img.url} alt={img?.caption || ""} className="h-full w-full object-cover" />
                                            ) : (
                                                <span className="flex h-full w-full items-center justify-center">
                                                    <ImageIcon className="h-8 w-8 text-gray-400" aria-hidden="true" />
                                                </span>
                                            )}
                                        </div>
                                        <div className="p-4">
                                            <h4 className="text-sm font-medium text-ink">{img?.caption || "Untitled"}</h4>
                                            <div className="mt-1 flex items-center justify-between text-xs text-ink-soft">
                                                <span className="capitalize">{img?.eventType || "Event"}</span>
                                                <span className="tabular-nums">{img?.date ? formatDate(img.date) : ''}</span>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <EmptyState
                                icon={<ImageIcon className="h-5 w-5" />}
                                title="No portfolio images"
                                description="This vendor has not uploaded any work yet. Their services tab may still tell you what they offer."
                            />
                        )}

                        {portfolioVideos.length > 0 && (
                            <section>
                                <h3 className="mb-4 border-b border-line pb-2 font-display text-lg text-ink">Videos</h3>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    {portfolioVideos.map((video: string, i: number) => (
                                        <video key={i} src={video} controls className="aspect-video w-full rounded-2xl bg-gray-900 object-cover" />
                                    ))}
                                </div>
                            </section>
                        )}

                        {pastEvents.length > 0 && (
                            <section>
                                <h3 className="mb-4 border-b border-line pb-2 font-display text-lg text-ink">Past events</h3>
                                <ul className="flex flex-wrap gap-2">
                                    {pastEvents.map((evt) => (
                                        <li key={evt.id} className="rounded-full border border-line px-3 py-1.5 text-xs text-ink">
                                            {evt.title}
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}
                    </div>
                )}

                {activeTab === "reviews" && (
                    <div className="space-y-8">
                        <div className="flex flex-col gap-8 border-b border-line pb-8 sm:flex-row">
                            <div className="flex flex-col items-center justify-center text-center sm:border-r sm:border-line sm:pr-8">
                                <p className="font-display text-4xl text-ink tabular-nums">{rating || "0.0"}</p>
                                <div className="mt-2">
                                    <StarRating rating={rating} size="md" />
                                </div>
                                <p className="mt-2 text-xs text-ink-soft tabular-nums">{totalReviews} review{totalReviews === 1 ? '' : 's'}</p>
                            </div>
                            <div className="flex w-full flex-1 flex-col justify-center gap-1.5">
                                {[5, 4, 3, 2, 1].map((star) => {
                                    const count = v?.ratings?.breakdown?.[star.toString()] || 0;
                                    const percentage = (count / (totalReviews || 1)) * 100;
                                    return (
                                        <div key={star} className="flex items-center gap-2">
                                            <span className="w-3 text-xs text-ink-soft tabular-nums">{star}</span>
                                            <Star className="h-3 w-3 shrink-0 fill-gray-900 text-gray-900" aria-hidden="true" />
                                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200">
                                                <div className="h-full rounded-full bg-gray-900" style={{ width: `${percentage}%` }} />
                                            </div>
                                            <span className="w-6 text-right text-xs text-ink-soft tabular-nums">{count}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Organizer reviews — written after a completed booking */}
                        {vendorReviews.length > 0 && (
                            <ul className="space-y-4">
                                {vendorReviews.map((r) => (
                                    <li key={r.id} className="rounded-2xl border border-line bg-paper p-5">
                                        <div className="mb-3 flex items-center gap-2">
                                            <StarRating rating={r.rating} size="sm" />
                                            <span className="text-xs text-ink-soft tabular-nums">{r.rating}.0</span>
                                            <span className="ml-auto rounded-full bg-gray-900 px-2 py-1 text-2xs font-bold uppercase text-white">
                                                Verified booking
                                            </span>
                                        </div>
                                        {r.title && <p className="text-sm font-medium text-ink">{r.title}</p>}
                                        <p className="mt-1 text-sm leading-relaxed text-ink-soft">{r.comment}</p>
                                        <div className="mt-4 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="flex size-8 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-ink-soft">
                                                    {(r.reviewerName || "O")[0]}
                                                </span>
                                                <span className="text-sm text-ink">{r.reviewerName || 'Event organizer'}</span>
                                            </div>
                                            <span className="text-xs text-ink-soft tabular-nums">{r.createdAt ? formatDate(r.createdAt) : ''}</span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}

                        {/* Legacy vendor-submitted testimonials (read-only; vendors no
                            longer add these — reviews come from organizers) */}
                        {testimonials.length > 0 && (
                            <section>
                                <h3 className="mb-4 border-b border-line pb-2 text-2xs font-medium uppercase text-ink-soft">
                                    Vendor-submitted testimonials
                                </h3>
                                <ul className="space-y-4">
                                    {testimonials.map((t: any, i: number) => (
                                        <li key={i} className="rounded-2xl border border-line bg-paper p-5">
                                            <div className="mb-3 flex items-center gap-2">
                                                <StarRating rating={t?.rating || 5} size="sm" />
                                                <span className="text-xs text-ink-soft tabular-nums">{t?.rating || 5}.0</span>
                                            </div>
                                            <p className="text-sm italic leading-relaxed text-ink-soft">&quot;{t?.testimonial || 'No testimonial text.'}&quot;</p>
                                            <div className="mt-4 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="flex size-8 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-ink-soft">
                                                        {(t?.clientName || "A")[0]}
                                                    </span>
                                                    <span className="text-sm text-ink">{t?.clientName || 'Anonymous'}</span>
                                                </div>
                                                <span className="text-xs text-ink-soft tabular-nums">{t?.eventDate ? formatDate(t.eventDate) : ''}</span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}

                        {vendorReviews.length === 0 && testimonials.length === 0 && (
                            <EmptyState
                                icon={<Star className="h-5 w-5" />}
                                title="No reviews yet"
                                description="Reviews appear here once an organizer completes a booking with this vendor and writes one."
                            />
                        )}
                    </div>
                )}
            </div>

            <section className="border-t border-line pt-8">
                <h3 className="mb-4 font-display text-lg text-ink">Contact</h3>
                <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {primaryPhone && (
                        <li className="flex items-center gap-3 text-sm text-ink tabular-nums">
                            {/* gray-400 = 2.5:1 — decoration; each row's text is the content. */}
                            <Phone className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
                            <a href={`tel:${primaryPhone}`} className="hover:underline">{primaryPhone}</a>
                        </li>
                    )}
                    {businessEmail && (
                        <li className="flex items-center gap-3 text-sm text-ink">
                            <Mail className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
                            <a href={`mailto:${businessEmail}`} className="hover:underline">{businessEmail}</a>
                        </li>
                    )}
                    {website && (
                        <li className="flex items-center gap-3 text-sm text-ink">
                            <Globe className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
                            <a href={website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                {website.replace('https://', '')}
                            </a>
                        </li>
                    )}
                    {street && (
                        <li className="flex items-center gap-3 text-sm text-ink">
                            <MapPin className="h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
                            {street}, {city}
                        </li>
                    )}
                </ul>
            </section>
        </div>
    );
}
