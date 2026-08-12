import { EventService } from "@/src/services/event.service";
import { EventModel } from "@/src/services/models/event.model";
import {
    CalendarDays,
    MapPin,
    MoreHorizontal,
    Star,
    Users,
    Clock,
    Ticket,
    BarChart3,
    Award,
    Image as ImageIcon,
    FileText,
    Tag,
    UserCheck,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecentRegistration } from '@/src/features/dashboard/types';
import { isVideoUrl } from "@/src/features/media/media.utils";
import { RegService } from "@/src/services/registeration.service";
import { formatDate, formatTime, formatDateTime } from "@/src/lib/datetime";
import { formatCurrency } from "@/src/lib/money";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";

export default async function EventDetailsPage({ params }: { params: Promise<{ eventId: string; organizer_id: string }> }) {
    const { eventId, organizer_id } = await params;
    const event: EventModel | null = await EventService.getEventByID(eventId);

    if (!event) {
        console.log("Event not founddd");
        notFound();
    }

    // Live metrics derived from the actual `registerations` collection instead
    // of the stale denormalized `event.analytics.*` counters.
    const regs = await RegService.getRegsOfEvent(eventId);
    const registrationsCount = regs.filter(r => r.status !== "cancelled").length;
    const checkedIn = regs.filter(r => r.status === "checked_in" || r.status === "attended").length;
    const revenue = regs.reduce((sum, r) => sum + (r.payment?.amountPaid ?? 0), 0);

    const capacityPercent = getPercent(registrationsCount, event.capacity.totalSeats);
    const targetRevenue = Math.max(revenue, event.capacity.totalSeats * Math.max(event.pricing?.tiers?.[0]?.price ?? 0, 1));
    const revenuePercent = getPercent(revenue, targetRevenue);
    const recentRegistrations: RecentRegistration[] = await EventService.getRecentRegEvents(eventId);

    return (
        // No <main> and no title here: the event layout renders both, along with the
        // breadcrumb, the status and the section tabs. This page is one section of it.
        <div className="text-gray-950">
            <div className="mx-auto max-w-7xl space-y-8">
                {/* Hero Banner — banners are square (1080×1080), so it's shown at 1:1
                    beside the event facts rather than cropped into a wide strip. */}
                <section className="overflow-hidden rounded-3xl bg-gray-950 shadow-[0_18px_45px_rgba(15,23,42,0.16)]">
                    <div className="flex flex-col gap-6 p-6 sm:p-8 md:flex-row md:items-center">
                        <div className="relative aspect-square w-full shrink-0 overflow-hidden rounded-2xl bg-gray-900 sm:w-64 md:w-72 lg:w-80">
                            {event.bannerImage ? (
                                <img
                                    src={event.bannerImage}
                                    alt={event.title}
                                    className="absolute inset-0 h-full w-full object-cover"
                                />
                            ) : (
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(255,255,255,0.36),transparent_28%),linear-gradient(115deg,#171717,#737373_52%,#171717)] opacity-80" />
                            )}
                        </div>

                        {/* Facts sit in a row next to a small banner on mobile, and stack
                            into a labelled column on wider screens so they fill the space
                            beside the square instead of leaving it empty. */}
                        <div className="min-w-0 flex-1">
                            <dl className="grid grid-cols-1 gap-3 rounded-2xl bg-black/55 p-4 text-white shadow-[0_12px_28px_rgba(0,0,0,0.24)] backdrop-blur sm:grid-cols-3 md:grid-cols-1 md:gap-5 md:p-6">
                                {[
                                    { icon: <CalendarDays size={18} />, label: "Date", value: formatDate(event.schedule?.startDate) },
                                    { icon: <MapPin size={18} />, label: "Location", value: event.location?.city || "—" },
                                    { icon: <Users size={18} />, label: "Registrations", value: `${registrationsCount}` },
                                ].map((item) => (
                                    <div key={item.label} className="flex items-center gap-3">
                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/80">
                                            {item.icon}
                                        </span>
                                        <div className="min-w-0">
                                            <dt className="text-[10px] font-bold uppercase tracking-wider text-white/50">{item.label}</dt>
                                            <dd className="truncate text-sm font-bold md:text-base">{item.value}</dd>
                                        </div>
                                    </div>
                                ))}
                            </dl>
                        </div>
                    </div>
                </section>

                {/* Metric Cards */}
                <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
                    <MetricCard
                        label="Registrations"
                        value={`${registrationsCount}`}
                        suffix={`/${event.capacity.totalSeats}`}
                        helper={`${capacityPercent}% Capacity`}
                        progress={capacityPercent}
                    />
                    <MetricCard
                        label="Checked In"
                        value={`${checkedIn}`}
                        suffix={` (${getPercent(checkedIn, registrationsCount || 1)}%)`}
                        helper="Live attendance"
                        bars
                    />
                    <MetricCard
                        label="Revenue"
                        value={formatCurrency(revenue, event.pricing?.currency)}
                        helper={`${revenuePercent}% of Target`}
                        progress={revenuePercent}
                    />
                    <MetricCard
                        label="Avg. Rating"
                        value="4.8"
                        helper="Based on 142 reviews"
                        rating
                    />
                </section>

                {/* Main Content Grid (Structured Layout Columns) */}
                <section className="grid gap-8 lg:grid-cols-3">
                    {/* Left & Middle Column Flow Content */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Two-Column Info Cards Subgrid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Schedule Box */}
                            <article className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                                <div className="flex items-center gap-2 mb-5">
                                    <Clock size={18} className="text-gray-500" />
                                    <h2 className="text-lg font-extrabold uppercase text-gray-950">Schedule</h2>
                                </div>
                                <div className="space-y-4">
                                    <InfoBlock label="Start Date" value={formatDate(event.schedule?.startDate)} />
                                    <InfoBlock label="End Date" value={formatDate(event.schedule?.endDate)} />
                                    <InfoBlock label="Start Time" value={formatTime(event.schedule?.startTime)} />
                                    <InfoBlock label="End Time" value={formatTime(event.schedule?.endTime)} />
                                    <InfoBlock label="Timezone" value={event.schedule?.timezone} />
                                    <InfoBlock label="Recurring" value={event.schedule?.isRecurring ? `Yes` : "No"} />
                                </div>
                            </article>

                            {/* Location Box */}
                            <article className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                                <div className="flex items-center gap-2 mb-5">
                                    <MapPin size={18} className="text-gray-500" />
                                    <h2 className="text-lg font-extrabold uppercase text-gray-950">Location</h2>
                                </div>
                                <div className="space-y-4">
                                    <InfoBlock label="Venue" value={event.location?.venueName} />
                                    <InfoBlock label="Address" value={event.location?.address} />
                                    <InfoBlock label="City" value={event.location?.city} />
                                    <InfoBlock label="Country" value={event.location?.country} />
                                    <InfoBlock label="Coordinates" value={`${event.location?.coordinates?.latitude}, ${event.location?.coordinates?.longitude}`} />
                                    <InfoBlock label="Platform" value={event.location?.meetingPlatform} />
                                </div>
                            </article>

                            {/* Capacity Box */}
                            <article className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                                <div className="flex items-center gap-2 mb-5">
                                    <Users size={18} className="text-gray-500" />
                                    <h2 className="text-lg font-extrabold uppercase text-gray-950">Capacity</h2>
                                </div>
                                <div className="space-y-4">
                                    <InfoBlock label="Total Seats" value={event.capacity.totalSeats.toLocaleString("en-US")} />
                                    <InfoBlock label="Reserved Seats" value={event.capacity.reservedSeats.toLocaleString("en-US")} />
                                    <InfoBlock label="Available Seats" value={event.capacity.availableSeats.toLocaleString("en-US")} />
                                </div>
                            </article>

                            {/* Registration Box */}
                            <article className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                                <div className="flex items-center gap-2 mb-5">
                                    <UserCheck size={18} className="text-gray-500" />
                                    <h2 className="text-lg font-extrabold uppercase text-gray-950">Registration</h2>
                                </div>
                                <div className="space-y-4">
                                    <InfoBlock label="Opens" value={formatDate(event.registration?.registrationOpenDate)} />
                                    <InfoBlock label="Closes" value={formatDate(event.registration?.registrationCloseDate)} />
                                    <InfoBlock label="Requires Approval" value={event.registration?.requiresApproval ? "Yes" : "No"} />
                                </div>
                            </article>
                        </div>

                        {/* Pricing & Tickets Box (Spanned beautifully below the subgrid) */}
                        <article className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                            <div className="flex items-center gap-2 mb-5">
                                <Ticket size={18} className="text-gray-500" />
                                <h2 className="text-lg font-extrabold uppercase text-gray-950">Pricing & Tickets</h2>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <InfoBlock label="Free Event" value={event.pricing?.isFree ? "Yes" : "No"} />
                                    <InfoBlock label="Currency" value={event.pricing?.currency} />
                                    {(event.pricing?.studentDiscount || event.pricing?.groupDiscount) && (
                                        <div className="pt-4 border-t border-gray-100 space-y-1">
                                            <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-500 mb-1">Available Discounts</h4>
                                            {event.pricing?.studentDiscount?.enabled && (
                                                <p className="text-sm font-semibold text-gray-700">Student: {event.pricing.studentDiscount.percentage}% off</p>
                                            )}
                                            {event.pricing?.groupDiscount?.enabled && (
                                                <p className="text-sm font-semibold text-gray-700">Group ({event.pricing.groupDiscount.minGroupSize}+): {event.pricing.groupDiscount.percentage}% off</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                                {event.pricing?.tiers && event.pricing.tiers.length > 0 && (
                                    <div className="border-t pt-4 sm:border-t-0 sm:pt-0 sm:border-l sm:pl-6 border-gray-100">
                                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-500 mb-3">Ticket Tiers</h4>
                                        <div className="space-y-3">
                                            {event.pricing.tiers.map((tier, index) => (
                                                <div key={index} className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                                                    <p className="text-xs font-extrabold uppercase tracking-wider text-gray-500">{tier.name}</p>
                                                    <p className="text-base font-extrabold text-gray-950">{event.pricing?.currency} {tier.price.toLocaleString("en-US")}</p>
                                                    <p className="text-xs text-gray-500">Until {formatDate(tier.availableUntil)} • {tier.seats} seats</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </article>

                        {/* Description Box */}
                        <article className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                            <div className="flex items-center gap-2 mb-5">
                                <FileText size={18} className="text-gray-500" />
                                <h2 className="text-lg font-extrabold uppercase text-gray-950">Event Description</h2>
                            </div>
                            <div className="space-y-4 text-base font-semibold leading-7 text-gray-600">
                                <p>{event.description}</p>
                                <p className="text-sm italic text-gray-500">{event.shortDescription}</p>
                            </div>
                        </article>
                    </div>

                    {/* Right Column Sidebar Stack */}
                    <div className="space-y-6">
                        {/* Recent Registrations Sidebar */}
                        <aside className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                            <div className="mb-6 flex items-center justify-between">
                                <h2 className="text-lg font-extrabold uppercase text-gray-950">Recent Registrations</h2>
                                <Link href="#" className="text-xs font-extrabold uppercase tracking-widest text-gray-500 hover:text-gray-950 transition">
                                    View All
                                </Link>
                            </div>
                            <ul className="space-y-4">
                                {recentRegistrations.length === 0 ? (
                                    <li className="text-sm font-semibold text-gray-500 text-center py-4">
                                        No registrations yet.
                                    </li>
                                ) : (
                                    recentRegistrations.map((reg, index) => (
                                        <li key={reg.id} className="flex items-center gap-4">
                                            <span className="flex size-10 items-center justify-center rounded-full bg-gray-100 text-xs font-extrabold text-gray-600">
                                                {index + 1}
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-extrabold text-gray-950">{reg.attendeeName}</p>
                                                <p className="truncate text-xs font-semibold text-gray-500">
                                                    PKR {reg.amountPaid.toLocaleString("en-US")} •{" "}
                                                    <span className={`font-bold ${
                                                        reg.status === "CONFIRMED" ? "text-gray-900"
                                                        : reg.status === "PENDING"  ? "text-gray-900"
                                                        : "text-gray-900"
                                                    }`}>{reg.status}</span>
                                                </p>
                                            </div>
                                        </li>
                                    ))
                                )}
                            </ul>
                        </aside>

                        {/* Timestamps Card */}
                        <article className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                            <div className="flex items-center gap-2 mb-5">
                                <Clock size={18} className="text-gray-500" />
                                <h2 className="text-lg font-extrabold uppercase text-gray-950">Timestamps</h2>
                            </div>
                            <div className="space-y-4">
                                <InfoBlock label="Created At" value={formatDateTime(event.createdAt)} />
                                <InfoBlock label="Updated At" value={formatDateTime(event.updatedAt)} />
                                <InfoBlock label="Event Start" value={event.schedule?.startDate ? `${formatDate(event.schedule.startDate)}, ${formatTime(event.schedule.startTime)}` : "N/A"} />
                                <InfoBlock label="Event End" value={event.schedule?.endDate ? `${formatDate(event.schedule.endDate)}, ${formatTime(event.schedule.endTime)}` : "N/A"} />
                            </div>
                        </article>

                        {/* Speakers & Certificate Card Stacked Together */}
                        {event.speakers && event.speakers.length > 0 && (
                            <article className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                                <div className="flex items-center gap-2 mb-5">
                                    <Users size={18} className="text-gray-500" />
                                    <h2 className="text-lg font-extrabold uppercase text-gray-950">Speakers</h2>
                                </div>
                                <div className="space-y-3">
                                    {event.speakers.map((speaker) => (
                                        <div key={speaker.speakerId} className="flex items-center gap-3">
                                            {speaker.profileImage ? (
                                                <img src={speaker.profileImage} alt={speaker.name} loading="lazy" decoding="async" className="size-8 rounded-full object-cover" />
                                            ) : (
                                                <div className="flex size-8 items-center justify-center rounded-full bg-gray-200 text-xs font-extrabold text-gray-500">
                                                    {speaker.name.charAt(0)}
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-extrabold text-gray-950">{speaker.name}</p>
                                                <p className="truncate text-xs font-semibold text-gray-500">{speaker.designation}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </article>
                        )}

                        {event.certificateConfig && (
                            <article className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                                <div className="flex items-center gap-2 mb-5">
                                    <Award size={18} className="text-gray-500" />
                                    <h2 className="text-lg font-extrabold uppercase text-gray-950">Certificate</h2>
                                </div>
                                <div className="space-y-3">
                                    <InfoBlock label="Issue Certificates" value={event.certificateConfig.issueCertificates ? "Yes" : "No"} />
                                    <InfoBlock label="Type" value={event.certificateConfig.certificateType} />
                                    <InfoBlock label="Template ID" value={event.certificateConfig.templateId} />
                                </div>
                            </article>
                        )}

                        {/* Gallery */}
                        {event.galleryImages && event.galleryImages.length > 0 && (
                            <article className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                                <div className="flex items-center gap-2 mb-5">
                                    <ImageIcon size={18} className="text-gray-500" />
                                    <h2 className="text-lg font-extrabold uppercase text-gray-950">Gallery</h2>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    {event.galleryImages.map((url: string, i: number) => (
                                        <div key={i} className="relative aspect-square overflow-hidden rounded-xl bg-gray-100">
                                            {isVideoUrl(url) ? (
                                                <video src={url} controls className="h-full w-full object-cover" />
                                            ) : (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={url} alt={`Gallery ${i + 1}`} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </article>
                        )}

                        {/* Promo Video */}
                        {event.promoVideoUrl && (
                            <article className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                                <div className="flex items-center gap-2 mb-5">
                                    <ImageIcon size={18} className="text-gray-500" />
                                    <h2 className="text-lg font-extrabold uppercase text-gray-950">Promo Video</h2>
                                </div>
                                {isVideoUrl(event.promoVideoUrl) ? (
                                    <video src={event.promoVideoUrl} controls className="w-full rounded-xl bg-black" />
                                ) : (
                                    <a
                                        href={event.promoVideoUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 text-sm font-bold text-gray-900 hover:underline"
                                    >
                                        Watch promo video ↗
                                    </a>
                                )}
                            </article>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}

function getPercent(value: number, total: number) {
    if (total <= 0) return 0;
    return Math.min(100, Math.round((value / total) * 100));
}


function MetricCard({
    label,
    value,
    suffix,
    helper,
    progress,
    bars,
    rating,
}: {
    label: string;
    value: string;
    suffix?: string;
    helper: string;
    progress?: number;
    bars?: boolean;
    rating?: boolean;
}) {
    return (
        <article className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-extrabold text-gray-500">{label}</p>
            <div className="mt-4 flex items-end gap-1">
                <p className="text-3xl font-extrabold leading-none text-gray-950">{value}</p>
                {suffix && <span className="text-xl font-bold text-gray-300">{suffix}</span>}
                {rating && (
                    <span className="mb-1 ml-1 flex text-gray-950">
                        {Array.from({ length: 5 }).map((_, index) => (
                            <Star key={index} size={14} />
                        ))}
                    </span>
                )}
            </div>
            {bars ? (
                <div className="mt-6 flex h-7 items-end gap-2">
                    {[45, 62, 74, 100, 68].map((height, index) => (
                        <span
                            key={height}
                            className={`flex-1 rounded-t-sm ${index === 3 ? "bg-black" : "bg-gray-300"}`}
                            style={{ height: `${height}%` }}
                        />
                    ))}
                </div>
            ) : progress !== undefined ? (
                <div className="mt-6 h-2 overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full rounded-full bg-black" style={{ width: `${progress}%` }} />
                </div>
            ) : null}
            <p className="mt-4 text-sm font-extrabold text-gray-600">{helper}</p>
        </article>
    );
}

function InfoBlock({ label, value }: { label: string | null; value: string | null }) {
    return (
        <div>
            <p className="text-xs font-extrabold uppercase tracking-widest text-gray-500">{label}</p>
            <p className="mt-1 font-extrabold text-gray-950 break-words">{value ?? "N/A"}</p>
        </div>
    );
}


