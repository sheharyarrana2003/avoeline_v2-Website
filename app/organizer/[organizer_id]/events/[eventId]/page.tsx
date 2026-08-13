import { EventService } from "@/src/services/event.service";
import { EventModel } from "@/src/services/models/event.model";
import {
    CalendarDays,
    MapPin,
    Users,
    Clock,
    Ticket,
    Award,
    Image as ImageIcon,
    FileText,
    UserCheck,
    Wallet,
    Gauge,
} from "lucide-react";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecentRegistration } from '@/src/features/dashboard/types';
import { isVideoUrl } from "@/src/features/media/media.utils";
import { RegService } from "@/src/services/registeration.service";
import { formatDate, formatTime, formatDateTime } from "@/src/lib/datetime";
import { formatCurrency } from "@/src/lib/money";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { MetricTile } from "@/src/shared_components/ui/MetricTile";
import { Meter } from "@/src/shared_components/ui/charts/Meter";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { ImageLightbox } from "@/src/shared_components/ui/ImageLightbox";

/**
 * One fact on the ink hero. Sits on --panel-bg, which stays dark in both themes,
 * so the white treatment here is correct in light and dark alike.
 */
function HeroFact({
    icon,
    label,
    value,
    sub,
}: {
    icon: ReactNode;
    label: string;
    value: string;
    sub?: string;
}) {
    return (
        <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white" aria-hidden="true">
                {icon}
            </span>
            <div className="min-w-0">
                <dt className="text-2xs uppercase text-white/60">{label}</dt>
                <dd className="truncate text-base font-medium text-white tabular-nums">{value}</dd>
                {sub ? <dd className="truncate text-xs text-white/55 tabular-nums">{sub}</dd> : null}
            </div>
        </div>
    );
}

/** "21/07/2026" for a single day, "21/07/2026 – 24/07/2026" when it spans. */
function formatDateRange(start: unknown, end: unknown): string {
    const from = formatDate(start);
    const to = formatDate(end);
    if (from === "—") return to === "—" ? "Not scheduled" : to;
    if (to === "—" || to === from) return from;
    return `${from} – ${to}`;
}

/** "10:00 AM – 5:00 PM PKT". Returns undefined rather than an em dash so the
 *  sub-line disappears entirely when there is no time to show. */
function formatTimeRange(start: unknown, end: unknown, timezone?: string): string | undefined {
    const from = formatTime(start);
    const to = formatTime(end);
    if (from === "—") return undefined;
    const range = to === "—" ? from : `${from} – ${to}`;
    return timezone ? `${range} ${timezone}` : range;
}

export default async function EventDetailsPage({ params }: { params: Promise<{ eventId: string; organizer_id: string }> }) {
    const { eventId, organizer_id } = await params;
    const event: EventModel | null = await EventService.getEventByID(eventId);

    if (!event) {
        notFound();
    }

    // Live metrics derived from the actual `registerations` collection instead
    // of the stale denormalized `event.analytics.*` counters.
    const regs = await RegService.getRegsOfEvent(eventId);
    const registrationsCount = regs.filter(r => r.status !== "cancelled").length;
    const checkedIn = regs.filter(r => r.status === "checked_in" || r.status === "attended").length;
    const revenue = regs.reduce((sum, r) => sum + (r.payment?.amountPaid ?? 0), 0);

    const capacityPercent = getPercent(registrationsCount, event.capacity.totalSeats);
    const currency = event.pricing?.currency;

    // Registration opens/closes are two InfoBlocks far down the page; as a single
    // line up here they answer "can people still sign up", which is the question.
    const regOpens = formatDate(event.registration?.registrationOpenDate);
    const regCloses = formatDate(event.registration?.registrationCloseDate);
    const registrationWindow =
        regCloses !== "—" ? `Registration closes ${regCloses}`
        : regOpens !== "—" ? `Registration opens ${regOpens}`
        : null;
    const recentRegistrations: RecentRegistration[] = await EventService.getRecentRegEvents(eventId);

    return (
        // No <main>, no page padding and no title here: the event layout renders all
        // of them, along with the breadcrumb, the status and the section tabs.
        <div className="mx-auto max-w-7xl space-y-10">
            {/* Banners are square (1080x1080), so it's shown at 1:1 beside the event
                facts rather than cropped into a wide strip. */}
            {/* bg-panel, not bg-ink: --ink is *text*, so in dark mode it resolves to
                near-white and this hero would become a white slab carrying white text.
                --panel-bg is the surface that stays dark in both themes. */}
            <section className="overflow-hidden rounded-2xl bg-panel">
                <div className="flex flex-col gap-6 p-6 sm:p-8 md:flex-row md:items-center">
                    {/* Banners carry the schedule and venue as artwork, and at 288px the
                        overlaid text is unreadable — so the thumbnail expands. Only when
                        there is a banner: the gradient placeholder has nothing to enlarge. */}
                    {event.bannerImage ? (
                        <ImageLightbox
                            src={event.bannerImage}
                            alt={`${event.title} banner`}
                            className="aspect-square w-full shrink-0 bg-panel sm:w-56 md:w-64 lg:w-72"
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={event.bannerImage}
                                alt=""
                                className="absolute inset-0 h-full w-full object-cover transition-transform duration-200 group-hover/zoom:scale-[1.02]"
                            />
                        </ImageLightbox>
                    ) : (
                        <div className="relative aspect-square w-full shrink-0 overflow-hidden rounded-2xl bg-panel sm:w-56 md:w-64 lg:w-72">
                            <div className="absolute inset-0 bg-[linear-gradient(115deg,#171717,#404040_52%,#171717)]" />
                        </div>
                    )}

                    {/* This block used to be three facts — date, city, registration count
                        — stacked in one narrow column, leaving well over half the panel
                        empty. All three were already spelled out in more detail by the
                        Schedule, Location and Capacity sections below, and the count is
                        repeated by the stat band directly underneath, so the hero was
                        duplicating the page while wasting its own width.

                        A hero's job on a page this long is orientation: the facts that
                        take four InfoBlocks to reconstruct further down, said once, in a
                        line. The window rather than four separate date and time fields;
                        the venue and city as one address; the things you decide on. */}
                    {/* Centred, and the banner is a little smaller than it was. Spreading
                        the chips and facts to the panel's full height was tried and looked
                        worse — it moved the dead space into the middle of the block rather
                        than removing it. */}
                    <div className="flex min-w-0 flex-1 flex-col gap-6">
                        <div className="flex flex-wrap gap-1.5">
                            {[event.category, event.format, event.eventType, event.language === "ur" ? "Urdu" : "English"]
                                .filter(Boolean)
                                .map((chip) => (
                                    <span
                                        key={String(chip)}
                                        className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-2xs font-medium uppercase text-white/80"
                                    >
                                        {chip}
                                    </span>
                                ))}
                        </div>

                        <dl className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
                            <HeroFact
                                icon={<CalendarDays size={18} />}
                                label="When"
                                value={formatDateRange(event.schedule?.startDate, event.schedule?.endDate)}
                                sub={formatTimeRange(event.schedule?.startTime, event.schedule?.endTime, event.schedule?.timezone)}
                            />
                            <HeroFact
                                icon={<MapPin size={18} />}
                                label="Where"
                                value={event.location?.venueName || event.location?.city || "Not set"}
                                sub={[event.location?.city, event.location?.country].filter(Boolean).join(", ") || undefined}
                            />
                            <HeroFact
                                icon={<Ticket size={18} />}
                                label="Tickets"
                                value={event.pricing?.isFree ? "Free" : formatCurrency(event.PriceOfTicket, currency, "Not priced")}
                                sub={
                                    registrationWindow ??
                                    (event.registration?.requiresApproval ? "Approval required" : undefined)
                                }
                            />
                            <HeroFact
                                icon={<Users size={18} />}
                                label="Programme"
                                value={
                                    event.speakers?.length || event.agenda?.length
                                        ? [
                                              event.speakers?.length ? `${event.speakers.length} speaker${event.speakers.length === 1 ? "" : "s"}` : null,
                                              event.agenda?.length ? `${event.agenda.length} session${event.agenda.length === 1 ? "" : "s"}` : null,
                                          ].filter(Boolean).join(" · ")
                                        : "Nothing scheduled"
                                }
                                sub={event.vendorRequirements?.length ? `${event.vendorRequirements.length} vendor requirement${event.vendorRequirements.length === 1 ? "" : "s"}` : undefined}
                            />
                        </dl>
                    </div>
                </div>
            </section>

            {/* The fourth tile used to be "Avg. Rating 4.8 / Based on 142 reviews" over a
                five-bar chart hardcoded to [45,62,74,100,68]. Neither number came from
                anywhere; an invented figure on an organizer's own event is worse than none. */}
            {/* Was four bare figures on a divided band. "Registrations 340 / 500" and
                "Capacity filled 68%" were two tiles saying the same thing in different
                units, so the meter absorbs both and the freed tile carries the seats
                still available — the number an organizer is actually deciding on. */}
            <section className="grid grid-cols-1 rounded-2xl border border-line bg-paper shadow-sm sm:grid-cols-4">
                <MetricTile
                    label="Registrations"
                    value={`${registrationsCount}`}
                    icon={<Users className="h-4 w-4" />}
                    sublabel={`${capacityPercent}% of ${event.capacity.totalSeats} seats`}
                >
                    <Meter
                        label="Capacity filled"
                        value={registrationsCount}
                        max={event.capacity.totalSeats}
                    />
                </MetricTile>
                <MetricTile
                    label="Seats left"
                    value={`${Math.max(0, event.capacity.totalSeats - registrationsCount)}`}
                    icon={<Gauge className="h-4 w-4" />}
                    sublabel={event.capacity.totalSeats > 0 ? "Against configured capacity" : "No capacity set"}
                />
                <MetricTile
                    label="Checked in"
                    value={`${checkedIn}`}
                    icon={<UserCheck className="h-4 w-4" />}
                    sublabel={
                        registrationsCount > 0
                            ? `${Math.round((checkedIn / registrationsCount) * 100)}% of registrations`
                            : "Nobody registered yet"
                    }
                />
                <MetricTile
                    label="Revenue"
                    value={formatCurrency(revenue, currency, "—")}
                    icon={<Wallet className="h-4 w-4" />}
                    sublabel="Amounts actually paid"
                />
            </section>

            <div className="grid gap-10 lg:grid-cols-3">
                <div className="space-y-10 lg:col-span-2">
                    <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
                        <section>
                            <SectionHeading icon={<Clock size={16} />}>Schedule</SectionHeading>
                            <div className="space-y-4">
                                <InfoBlock label="Start date" value={formatDate(event.schedule?.startDate)} />
                                <InfoBlock label="End date" value={formatDate(event.schedule?.endDate)} />
                                <InfoBlock label="Start time" value={formatTime(event.schedule?.startTime)} />
                                <InfoBlock label="End time" value={formatTime(event.schedule?.endTime)} />
                                <InfoBlock label="Timezone" value={event.schedule?.timezone} />
                                <InfoBlock label="Recurring" value={event.schedule?.isRecurring ? "Yes" : "No"} />
                            </div>
                        </section>

                        <section>
                            <SectionHeading icon={<MapPin size={16} />}>Location</SectionHeading>
                            <div className="space-y-4">
                                <InfoBlock label="Venue" value={event.location?.venueName} />
                                <InfoBlock label="Address" value={event.location?.address} />
                                <InfoBlock label="City" value={event.location?.city} />
                                <InfoBlock label="Country" value={event.location?.country} />
                                <InfoBlock label="Coordinates" value={`${event.location?.coordinates?.latitude}, ${event.location?.coordinates?.longitude}`} />
                                <InfoBlock label="Platform" value={event.location?.meetingPlatform} />
                            </div>
                        </section>

                        <section>
                            <SectionHeading icon={<Users size={16} />}>Capacity</SectionHeading>
                            <div className="space-y-4">
                                <InfoBlock label="Total seats" value={event.capacity.totalSeats.toLocaleString("en-US")} />
                                <InfoBlock label="Reserved seats" value={event.capacity.reservedSeats.toLocaleString("en-US")} />
                                <InfoBlock label="Available seats" value={event.capacity.availableSeats.toLocaleString("en-US")} />
                            </div>
                        </section>

                        <section>
                            <SectionHeading icon={<UserCheck size={16} />}>Registration</SectionHeading>
                            <div className="space-y-4">
                                <InfoBlock label="Opens" value={formatDate(event.registration?.registrationOpenDate)} />
                                <InfoBlock label="Closes" value={formatDate(event.registration?.registrationCloseDate)} />
                                <InfoBlock label="Requires approval" value={event.registration?.requiresApproval ? "Yes" : "No"} />
                            </div>
                        </section>
                    </div>

                    <section>
                        <SectionHeading icon={<Ticket size={16} />}>Pricing and tickets</SectionHeading>
                        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                            <div className="space-y-4">
                                <InfoBlock label="Free event" value={event.pricing?.isFree ? "Yes" : "No"} />
                                <InfoBlock label="Currency" value={event.pricing?.currency} />
                                {(event.pricing?.studentDiscount?.enabled || event.pricing?.groupDiscount?.enabled) && (
                                    <div className="space-y-1 border-t border-line pt-4">
                                        <p className="text-2xs font-medium uppercase text-ink-soft">Available discounts</p>
                                        {event.pricing?.studentDiscount?.enabled && (
                                            <p className="text-sm text-ink tabular-nums">Student: {event.pricing.studentDiscount.percentage}% off</p>
                                        )}
                                        {event.pricing?.groupDiscount?.enabled && (
                                            <p className="text-sm text-ink tabular-nums">Group ({event.pricing.groupDiscount.minGroupSize}+): {event.pricing.groupDiscount.percentage}% off</p>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div>
                                <p className="mb-3 text-2xs font-medium uppercase text-ink-soft">Ticket tiers</p>
                                {event.pricing?.tiers?.length ? (
                                    <ul className="space-y-3">
                                        {event.pricing.tiers.map((tier, index) => (
                                            <li key={index} className="rounded-2xl border border-line bg-paper p-4">
                                                <p className="text-2xs font-medium uppercase text-ink-soft">{tier.name}</p>
                                                <p className="text-base font-medium text-ink tabular-nums">{formatCurrency(tier.price, currency)}</p>
                                                <p className="text-xs text-ink-soft tabular-nums">Until {formatDate(tier.availableUntil)} • {tier.seats} seats</p>
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <EmptyState
                                        size="sm"
                                        icon={<Ticket className="h-5 w-5" />}
                                        title="No ticket tiers"
                                        description="Add a tier in the event editor to sell seats at more than one price."
                                    />
                                )}
                            </div>
                        </div>
                    </section>

                    <section>
                        <SectionHeading icon={<FileText size={16} />}>Description</SectionHeading>
                        {event.description || event.shortDescription ? (
                            <div className="space-y-4">
                                <p className="text-base leading-7 text-ink">{event.description}</p>
                                <p className="text-sm text-ink-soft">{event.shortDescription}</p>
                            </div>
                        ) : (
                            <EmptyState
                                size="sm"
                                icon={<FileText className="h-5 w-5" />}
                                title="No description yet"
                                description="Attendees see this on the public event page. Add one in the event editor."
                            />
                        )}
                    </section>
                </div>

                <div className="space-y-10">
                    <section>
                        <SectionHeading
                            icon={<Users size={16} />}
                            action={
                                <Link
                                    href={`/organizer/${organizer_id}/events/${eventId}/attendees`}
                                    className="text-xs text-ink-soft hover:text-ink hover:underline"
                                >
                                    View all
                                </Link>
                            }
                        >
                            Recent registrations
                        </SectionHeading>
                        {recentRegistrations.length === 0 ? (
                            <EmptyState
                                size="sm"
                                icon={<Users className="h-5 w-5" />}
                                title="No registrations yet"
                                description="Share the event link — sign-ups land here as they come in."
                            />
                        ) : (
                            <ul className="space-y-4">
                                {recentRegistrations.map((reg, index) => (
                                    <li key={reg.id} className="flex items-center gap-4">
                                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs text-ink-soft tabular-nums">
                                            {index + 1}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium text-ink">{reg.attendeeName}</p>
                                            <p className="truncate text-xs text-ink-soft tabular-nums">
                                                {formatCurrency(reg.amountPaid, currency)}
                                            </p>
                                        </div>
                                        <StatusBadge status={reg.status} size="sm" />
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>

                    <section>
                        <SectionHeading icon={<Clock size={16} />}>Timestamps</SectionHeading>
                        <div className="space-y-4">
                            <InfoBlock label="Created at" value={formatDateTime(event.createdAt)} />
                            <InfoBlock label="Updated at" value={formatDateTime(event.updatedAt)} />
                            <InfoBlock label="Event start" value={event.schedule?.startDate ? `${formatDate(event.schedule.startDate)}, ${formatTime(event.schedule.startTime)}` : "N/A"} />
                            <InfoBlock label="Event end" value={event.schedule?.endDate ? `${formatDate(event.schedule.endDate)}, ${formatTime(event.schedule.endTime)}` : "N/A"} />
                        </div>
                    </section>

                    {event.speakers && event.speakers.length > 0 && (
                        <section>
                            <SectionHeading icon={<Users size={16} />}>Speakers</SectionHeading>
                            <ul className="space-y-3">
                                {event.speakers.map((speaker) => (
                                    <li key={speaker.speakerId} className="flex items-center gap-3">
                                        {speaker.profileImage ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={speaker.profileImage} alt="" loading="lazy" decoding="async" className="size-8 rounded-full object-cover" />
                                        ) : (
                                            <span className="flex size-8 items-center justify-center rounded-full bg-muted text-xs text-ink-soft">
                                                {speaker.name.charAt(0)}
                                            </span>
                                        )}
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium text-ink">{speaker.name}</p>
                                            <p className="truncate text-xs text-ink-soft">{speaker.designation}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}

                    {event.certificateConfig && (
                        <section>
                            <SectionHeading icon={<Award size={16} />}>Certificate</SectionHeading>
                            <div className="space-y-4">
                                <InfoBlock label="Issue certificates" value={event.certificateConfig.issueCertificates ? "Yes" : "No"} />
                                <InfoBlock label="Type" value={event.certificateConfig.certificateType} />
                                <InfoBlock label="Template ID" value={event.certificateConfig.templateId} />
                            </div>
                        </section>
                    )}

                    {event.galleryImages && event.galleryImages.length > 0 && (
                        <section>
                            <SectionHeading icon={<ImageIcon size={16} />}>Gallery</SectionHeading>
                            <div className="grid grid-cols-2 gap-3">
                                {event.galleryImages.map((url: string, i: number) => (
                                    <div key={i} className="relative aspect-square overflow-hidden rounded-2xl bg-muted">
                                        {isVideoUrl(url) ? (
                                            <video src={url} controls className="h-full w-full object-cover" />
                                        ) : (
                                            // Same need as the banner: a gallery cropped square
                                            // to a quarter-width tile is a thumbnail, not a view
                                            // of the picture. Videos already have their own
                                            // fullscreen control, so they are left alone.
                                            <ImageLightbox src={url} alt={`Gallery image ${i + 1}`} className="h-full w-full">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={url} alt="" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
                                            </ImageLightbox>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {event.promoVideoUrl && (
                        <section>
                            <SectionHeading icon={<ImageIcon size={16} />}>Promo video</SectionHeading>
                            {isVideoUrl(event.promoVideoUrl) ? (
                                <video src={event.promoVideoUrl} controls className="w-full rounded-2xl bg-panel" />
                            ) : (
                                <a
                                    href={event.promoVideoUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm font-medium text-ink hover:underline"
                                >
                                    Watch promo video
                                </a>
                            )}
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
}

function getPercent(value: number, total: number) {
    if (total <= 0) return 0;
    return Math.min(100, Math.round((value / total) * 100));
}

/**
 * The overview used to draw fourteen identical white cards on a grey canvas —
 * a container that separates from nothing. A rule under a heading does the same
 * grouping with no shell at all.
 */
function SectionHeading({ icon, children, action }: { icon: ReactNode; children: ReactNode; action?: ReactNode }) {
    return (
        <div className="mb-5 flex items-center gap-2 border-b border-line pb-2">
            {/* gray-400 is 2.5:1 — decoration only, the heading text carries the meaning. */}
            <span className="text-ink-faint" aria-hidden="true">{icon}</span>
            <h2 className="font-display text-lg text-ink">{children}</h2>
            {action ? <div className="ml-auto">{action}</div> : null}
        </div>
    );
}

function InfoBlock({ label, value }: { label: string | null; value: string | null }) {
    return (
        <div>
            <p className="text-2xs font-medium uppercase text-ink-soft">{label}</p>
            <p className="mt-1 break-words text-sm text-ink tabular-nums">{value ?? "N/A"}</p>
        </div>
    );
}
