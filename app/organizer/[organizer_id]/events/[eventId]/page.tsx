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
import { StatCard_dashboard } from "@/src/shared_components/organizer/StatCard_dashboard";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";

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
    const recentRegistrations: RecentRegistration[] = await EventService.getRecentRegEvents(eventId);

    return (
        // No <main>, no page padding and no title here: the event layout renders all
        // of them, along with the breadcrumb, the status and the section tabs.
        <div className="mx-auto max-w-7xl space-y-10">
            {/* Banners are square (1080x1080), so it's shown at 1:1 beside the event
                facts rather than cropped into a wide strip. */}
            <section className="overflow-hidden rounded-2xl bg-gray-950">
                <div className="flex flex-col gap-6 p-6 sm:p-8 md:flex-row md:items-center">
                    <div className="relative aspect-square w-full shrink-0 overflow-hidden rounded-2xl bg-gray-900 sm:w-64 md:w-72 lg:w-80">
                        {event.bannerImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={event.bannerImage}
                                alt={event.title}
                                className="absolute inset-0 h-full w-full object-cover"
                            />
                        ) : (
                            <div className="absolute inset-0 bg-[linear-gradient(115deg,#171717,#404040_52%,#171717)]" />
                        )}
                    </div>

                    <dl className="grid min-w-0 flex-1 grid-cols-1 gap-5 sm:grid-cols-3 md:grid-cols-1">
                        {[
                            { icon: <CalendarDays size={18} />, label: "Date", value: formatDate(event.schedule?.startDate) },
                            { icon: <MapPin size={18} />, label: "Location", value: event.location?.city || "—" },
                            { icon: <Users size={18} />, label: "Registrations", value: `${registrationsCount}` },
                        ].map((item) => (
                            <div key={item.label} className="flex items-center gap-3">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white" aria-hidden="true">
                                    {item.icon}
                                </span>
                                <div className="min-w-0">
                                    <dt className="text-2xs uppercase text-gray-400">{item.label}</dt>
                                    <dd className="truncate text-base font-medium text-white tabular-nums">{item.value}</dd>
                                </div>
                            </div>
                        ))}
                    </dl>
                </div>
            </section>

            {/* The fourth tile used to be "Avg. Rating 4.8 / Based on 142 reviews" over a
                five-bar chart hardcoded to [45,62,74,100,68]. Neither number came from
                anywhere; an invented figure on an organizer's own event is worse than none. */}
            <section className="grid grid-cols-2 gap-y-8 border-y border-line py-8 sm:grid-cols-4 sm:divide-x sm:divide-line">
                <StatCard_dashboard
                    title="Registrations"
                    value={`${registrationsCount} / ${event.capacity.totalSeats}`}
                    icon={<Users className="h-4 w-4" />}
                />
                <StatCard_dashboard
                    title="Capacity filled"
                    value={`${capacityPercent}%`}
                    icon={<Gauge className="h-4 w-4" />}
                />
                <StatCard_dashboard
                    title="Checked in"
                    value={`${checkedIn}`}
                    icon={<UserCheck className="h-4 w-4" />}
                />
                <StatCard_dashboard
                    title="Revenue"
                    value={formatCurrency(revenue, currency, "—")}
                    icon={<Wallet className="h-4 w-4" />}
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
                                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs text-ink-soft tabular-nums">
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
                                            <span className="flex size-8 items-center justify-center rounded-full bg-gray-100 text-xs text-ink-soft">
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
                                    <div key={i} className="relative aspect-square overflow-hidden rounded-2xl bg-gray-100">
                                        {isVideoUrl(url) ? (
                                            <video src={url} controls className="h-full w-full object-cover" />
                                        ) : (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={url} alt={`Gallery ${i + 1}`} loading="lazy" decoding="async" className="h-full w-full object-cover" />
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
                                <video src={event.promoVideoUrl} controls className="w-full rounded-2xl bg-black" />
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
            <span className="text-gray-400" aria-hidden="true">{icon}</span>
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
