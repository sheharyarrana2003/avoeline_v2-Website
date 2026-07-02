import { EventService } from "@/src/services/event.service";
import { EventModel, EventStatus } from "@/src/services/models/event.model";
import {
    CalendarDays,
    ChevronLeft,
    Eye,
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

export default async function EventDetailsPage({ params }: { params: Promise<{ eventId: string; organizer_id: string }> }) {
    const { eventId, organizer_id } = await params;
    const event : EventModel |null= await EventService.getEventByID(eventId);

    if (!event) {
        console.log("Event not founddd");
        notFound();
    }

    const checkedIn = Math.round(event.analytics?.checkIns  * 0.75);
    const capacityPercent = getPercent(event.analytics?.registrations , event.capacity.totalSeats);
    const targetRevenue = Math.max(event.analytics?.revenue ?? 0, event.capacity.totalSeats * Math.max(event.pricing?.tiers?.[0]?.price ?? 0, 1));
    const revenuePercent = getPercent(event.analytics?.revenue ?? 0, targetRevenue);
    const recentRegistrations = [
        ["Zain Ahmed", "Fullstack Developer", "2m ago"],
        ["Sarah Khan", "UX Designer", "15m ago"],
        ["Omar Siddiqui", "AI Researcher", "1h ago"],
        ["Esha Malik", "Product Manager", "3h ago"],
        ["Hamza Raza", "Blockchain Dev", "5h ago"],
    ];

    return (
        <main className="px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl space-y-8">
                {/* Header */}
                <header className="flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-4">
                        <Link
                            href={`/organizer/${organizer_id}/events`}
                            className="flex size-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-white hover:text-slate-950"
                            aria-label="Back to events"
                        >
                            <ChevronLeft size={22} />
                        </Link>
                        <h1 className="truncate text-2xl font-extrabold uppercase tracking-tight text-slate-950">
                            {event.title}
                        </h1>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                        <StatusPill status={event.status} />
                        <button
                            type="button"
                            className="flex size-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
                            aria-label="More event actions"
                        >
                            <MoreHorizontal size={20} />
                        </button>
                    </div>
                </header>

                {/* Hero Banner */}
                <section className="relative min-h-60 overflow-hidden rounded-3xl bg-slate-950 shadow-[0_18px_45px_rgba(15,23,42,0.16)]">
                    {event.bannerImage ? (
                        <img
                            src={event.bannerImage}
                            alt={event.title}
                            className="absolute inset-0 h-full w-full object-cover opacity-60 grayscale"
                        />
                    ) : (
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(255,255,255,0.36),transparent_28%),linear-gradient(115deg,#111827,#64748b_52%,#111827)] opacity-80 grayscale" />
                    )}
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.68),rgba(0,0,0,0.15),rgba(0,0,0,0.62))]" />
                    <div className="relative flex min-h-60 items-end p-6 sm:p-8">
                        <div className="flex flex-wrap gap-3 rounded-2xl bg-black/55 p-3 text-sm font-bold text-white shadow-[0_12px_28px_rgba(0,0,0,0.24)] backdrop-blur">
                            <span className="flex items-center gap-2">
                                <CalendarDays size={16} />
                                {event.schedule?.startDate}
                            </span>
                            <span className="hidden h-5 w-px bg-white/25 sm:block" />
                            <span className="flex items-center gap-2">
                                <MapPin size={16} />
                                {event.location?.city}
                            </span>
                            <span className="hidden h-5 w-px bg-white/25 sm:block" />
                            <span className="flex items-center gap-2">
                                <Users size={16} />
                                {event.analytics?.registrations} Registrations
                            </span>
                        </div>
                    </div>
                </section>

                {/* Metric Cards */}
                <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
                    <MetricCard
                        label="Registrations"
                        value={`${event.analytics?.registrations}`}
                        suffix={`/${event.capacity.totalSeats}`}
                        helper={`${capacityPercent}% Capacity`}
                        progress={capacityPercent}
                    />
                    <MetricCard
                        label="Checked In"
                        value={`${checkedIn}`}
                        suffix={` (${getPercent(checkedIn, event.analytics?.registrations ?? 1)}%)`}
                        helper="Live attendance"
                        bars
                    />
                    <MetricCard
                        label="Revenue"
                        value={`${event.pricing?.currency} ${(event.analytics?.revenue).toLocaleString("en-US")}`}
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

                {/* Main Content Grid */}
                <section className="grid gap-8 xl:grid-cols-[minmax(0,2fr)_minmax(300px,0.95fr)]">
                    {/* Left Column - Individual Article Boxes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* Schedule Box */}
                        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
                            <div className="flex items-center gap-2 mb-5">
                                <Clock size={18} className="text-slate-400" />
                                <h2 className="text-lg font-extrabold uppercase text-slate-950">Schedule</h2>
                            </div>
                            <div className="space-y-4">
                                <InfoBlock label="Start Date" value={event.schedule?.startDate} />
                                <InfoBlock label="End Date" value={event.schedule?.endDate} />
                                <InfoBlock label="Start Time" value={event.schedule?.startTime} />
                                <InfoBlock label="End Time" value={event.schedule?.endTime} />
                                <InfoBlock label="Timezone" value={event.schedule?.timezone} />
                                <InfoBlock label="Recurring" value={event.schedule?.isRecurring ? `Yes (${event.schedule.recurrencePattern})` : "No"} />
                            </div>
                        </article>

                        {/* Location Box */}
                        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
                            <div className="flex items-center gap-2 mb-5">
                                <MapPin size={18} className="text-slate-400" />
                                <h2 className="text-lg font-extrabold uppercase text-slate-950">Location</h2>
                            </div>
                            <div className="space-y-4">
                                <InfoBlock label="Venue" value={event.location?.venueName} />
                                <InfoBlock label="Address" value={event.location?.address} />
                                <InfoBlock label="City" value={event.location?.city} />
                                <InfoBlock label="Country" value={event.location?.country} />
                                <InfoBlock label="Coordinates" value={`${event.location?.coordinates?.latitude}, ${event.location?.coordinates?.longitude}`} />
                                <InfoBlock label="Platform" value={event.location?.meetingPlatform} />
                                <InfoBlock label="Meeting Link" value={event.location?.meetingLink} />
                                <InfoBlock label="Meeting ID" value={event.location?.meetingId} />
                            </div>
                        </article>

                        {/* Capacity Box */}
                        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
                            <div className="flex items-center gap-2 mb-5">
                                <Users size={18} className="text-slate-400" />
                                <h2 className="text-lg font-extrabold uppercase text-slate-950">Capacity</h2>
                            </div>
                            <div className="space-y-4">
                                <InfoBlock label="Total Seats" value={event.capacity.totalSeats.toLocaleString("en-US")} />
                                <InfoBlock label="Reserved Seats" value={event.capacity.reservedSeats.toLocaleString("en-US")} />
                                <InfoBlock label="Available Seats" value={event.capacity.availableSeats.toLocaleString("en-US")} />
                            </div>
                        </article>

                        {/* Registration Box */}
                        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
                            <div className="flex items-center gap-2 mb-5">
                                <UserCheck size={18} className="text-slate-400" />
                                <h2 className="text-lg font-extrabold uppercase text-slate-950">Registration</h2>
                            </div>
                            <div className="space-y-4">
                                <InfoBlock label="Opens" value={event.registration?.registrationOpenDate} />
                                <InfoBlock label="Closes" value={event.registration?.registrationCloseDate} />
                                <InfoBlock label="Requires Approval" value={event.registration?.requiresApproval ? "Yes" : "No"} />
                            </div>
                            {event.registration?.customForm && event.registration.customForm.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-slate-100">
                                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2">Custom Form Fields</h4>
                                    {event.registration.customForm.map((field) => (
                                        <div key={field.fieldId} className="mb-2">
                                            <p className="text-sm font-semibold text-slate-900">{field.label} <span className="text-slate-400">({field.type}{field.required ? ", Required" : ""})</span></p>
                                            <p className="text-xs text-slate-400">Options: {field.options.join(", ")}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </article>

                        {/* Timestamps Box */}
                        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
                            <div className="flex items-center gap-2 mb-5">
                                <Clock size={18} className="text-slate-400" />
                                <h2 className="text-lg font-extrabold uppercase text-slate-950">Timestamps</h2>
                            </div>
                            <div className="space-y-4">
                                <InfoBlock label="Created At" value={new Date(event.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })} />
                                <InfoBlock label="Updated At" value={new Date(event.updatedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })} />
                                <InfoBlock label="Published At" value={event.publishedAt ? new Date(event.publishedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : "N/A"} />
                                <InfoBlock label="Event Start" value={event.eventStartTime ? new Date(event.eventStartTime).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : "N/A"} />
                                <InfoBlock label="Event End" value={event.eventEndTime ? new Date(event.eventEndTime).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : "N/A"} />
                            </div>
                        </article>

                        {/* Pricing & Tickets Box */}
                        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
                            <div className="flex items-center gap-2 mb-5">
                                <Ticket size={18} className="text-slate-400" />
                                <h2 className="text-lg font-extrabold uppercase text-slate-950">Pricing & Tickets</h2>
                            </div>
                            <div className="space-y-4">
                                <InfoBlock label="Free Event" value={event.pricing?.isFree ? "Yes" : "No"} />
                                <InfoBlock label="Currency" value={event.pricing?.currency} />
                            </div>
                            {event.pricing?.tiers && event.pricing.tiers.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-slate-100">
                                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3">Ticket Tiers</h4>
                                    <div className="space-y-3">
                                        {event.pricing.tiers.map((tier, index) => (
                                            <div key={index} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                                <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">{tier.name}</p>
                                                <p className="text-lg font-extrabold text-slate-950">{event.pricing.currency} {tier.price.toLocaleString("en-US")}</p>
                                                <p className="text-xs text-slate-500">Until {tier.availableUntil} • {tier.seats} seats</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {(event.pricing?.studentDiscount || event.pricing?.groupDiscount) && (
                                <div className="mt-4 pt-4 border-t border-slate-100">
                                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3">Discounts</h4>
                                    {event.pricing?.studentDiscount?.enabled && (
                                        <p className="text-sm font-semibold text-slate-700">Student: {event.pricing.studentDiscount.percentage}% off</p>
                                    )}
                                    {event.pricing?.groupDiscount?.enabled && (
                                        <p className="text-sm font-semibold text-slate-700">Group ({event.pricing.groupDiscount.minGroupSize}+): {event.pricing.groupDiscount.percentage}% off</p>
                                    )}
                                </div>
                            )}
                        </article>

                        {/* Speakers Box */}
                        {event.speakers && event.speakers.length > 0 && (
                            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
                                <div className="flex items-center gap-2 mb-5">
                                    <Users size={18} className="text-slate-400" />
                                    <h2 className="text-lg font-extrabold uppercase text-slate-950">Speakers</h2>
                                </div>
                                <div className="space-y-3">
                                    {event.speakers.map((speaker) => (
                                        <div key={speaker.speakerId} className="flex items-center gap-3">
                                            {speaker.profileImage ? (
                                                <img src={speaker.profileImage} alt={speaker.name} className="size-8 rounded-full object-cover" />
                                            ) : (
                                                <div className="flex size-8 items-center justify-center rounded-full bg-slate-200 text-xs font-extrabold text-slate-500">
                                                    {speaker.name.charAt(0)}
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-extrabold text-slate-950">{speaker.name}</p>
                                                <p className="truncate text-xs font-semibold text-slate-400">{speaker.designation}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </article>
                        )}

                        {/* Certificate Box */}
                        {event.certificateConfig && (
                            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
                                <div className="flex items-center gap-2 mb-5">
                                    <Award size={18} className="text-slate-400" />
                                    <h2 className="text-lg font-extrabold uppercase text-slate-950">Certificate</h2>
                                </div>
                                <div className="space-y-4">
                                    <InfoBlock label="Issue Certificates" value={event.certificateConfig.issueCertificates ? "Yes" : "No"} />
                                    <InfoBlock label="Type" value={event.certificateConfig.certificateType} />
                                    <InfoBlock label="Template" value={event.certificateConfig.templateId} />
                                </div>
                                {event.certificateConfig.issueCertificates && event.certificateConfig.requirements && (
                                    <div className="mt-4 pt-4 border-t border-slate-100">
                                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2">Requirements</h4>
                                        <InfoBlock label="Min Attendance" value={`${event.certificateConfig.requirements.minAttendance}%`} />
                                        <InfoBlock label="Complete Survey" value={event.certificateConfig.requirements.mustCompleteSurvey ? "Yes" : "No"} />
                                    </div>
                                )}
                            </article>
                        )}

                        {/* Analytics Box */}
                        {event.analytics && (
                            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
                                <div className="flex items-center gap-2 mb-5">
                                    <BarChart3 size={18} className="text-slate-400" />
                                    <h2 className="text-lg font-extrabold uppercase text-slate-950">Analytics</h2>
                                </div>
                                <div className="space-y-4">
                                    <InfoBlock label="Views" value={event.analytics.views.toLocaleString("en-US")} />
                                    <InfoBlock label="Registrations" value={event.analytics.registrations.toLocaleString("en-US")} />
                                    <InfoBlock label="Check-ins" value={event.analytics.checkIns.toLocaleString("en-US")} />
                                    <InfoBlock label="Completion Rate" value={`${event.analytics.completionRate}%`} />
                                    <InfoBlock label="Revenue" value={`${event.pricing?.currency} ${event.analytics.revenue.toLocaleString("en-US")}`} />
                                </div>
                            </article>
                        )}

                        {/* Media Box */}
                        {(event.bannerImage || (event.galleryImages && event.galleryImages.length > 0) || event.promoVideoUrl) && (
                            <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_14px_34px_rgba(15,23,42,0.04)] md:col-span-2">
                                <div className="flex items-center gap-2 mb-5">
                                    <ImageIcon size={18} className="text-slate-400" />
                                    <h2 className="text-lg font-extrabold uppercase text-slate-950">Media</h2>
                                </div>
                                {event.bannerImage && (
                                    <div className="mb-4">
                                        <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2">Banner</p>
                                        <img src={event.bannerImage} alt="Event Banner" className="w-full h-48 object-cover rounded-2xl" />
                                    </div>
                                )}
                                {event.galleryImages && event.galleryImages.length > 0 && (
                                    <div className="mb-4">
                                        <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2">Gallery</p>
                                        <div className="flex gap-3 overflow-x-auto pb-2">
                                            {event.galleryImages.map((img, i) => (
                                                <img key={i} src={img} alt={`Gallery ${i + 1}`} className="w-32 h-32 object-cover rounded-xl shrink-0" />
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {event.promoVideoUrl && (
                                    <div>
                                        <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2">Promo Video</p>
                                        <a href={event.promoVideoUrl} className="text-sm font-extrabold text-blue-600 underline break-all">{event.promoVideoUrl}</a>
                                    </div>
                                )}
                            </article>
                        )}

                        {/* Description Box - Full Width */}
                        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_14px_34px_rgba(15,23,42,0.04)] md:col-span-2">
                            <div className="flex items-center gap-2 mb-5">
                                <FileText size={18} className="text-slate-400" />
                                <h2 className="text-lg font-extrabold uppercase text-slate-950">Event Description</h2>
                            </div>
                            <div className="space-y-4 text-base font-semibold leading-7 text-slate-500">
                                <p>{event.description}</p>
                                <p>{event.shortDescription}</p>
                            </div>
                        </article>

                        {/* Key Info Box */}
                        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_14px_34px_rgba(15,23,42,0.04)] md:col-span-2">
                            <div className="flex items-center gap-2 mb-5">
                                <Tag size={18} className="text-slate-400" />
                                <h2 className="text-lg font-extrabold uppercase text-slate-950">Key Information</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <InfoBlock label="Organizer" value="Avoeline Creative Labs" />
                                <InfoBlock label="Contact" value="hello@avoeline.com" />
                                <InfoBlock label="Ticket Price" value={event.pricing?.tiers?.[0] ? `${event.pricing.currency} ${event.pricing.tiers[0].price.toLocaleString("en-US")}` : "Free"} />
                            </div>
                           
                        </article>
                    </div>

                    {/* Right Sidebar - Recent Registrations */}
                    <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_14px_34px_rgba(15,23,42,0.04)] h-fit">
                        <div className="mb-6 flex items-center justify-between">
                            <h2 className="text-lg font-extrabold uppercase text-slate-950">Recent Registrations</h2>
                            <Link href="#" className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
                                View All
                            </Link>
                        </div>
                        <ul className="space-y-4">
                            {recentRegistrations.map(([name, role, time], index) => (
                                <li key={name} className="flex items-center gap-4">
                                    <span className="flex size-10 items-center justify-center rounded-full bg-slate-200 text-xs font-extrabold text-slate-500">
                                        {index + 1}
                                    </span>
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-extrabold text-slate-950">{name}</p>
                                        <p className="truncate text-xs font-semibold text-slate-400">
                                            {role} - {time}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </aside>
                </section>
            </div>
        </main>
    );
}

function getPercent(value: number, total: number) {
    if (total <= 0) return 0;
    return Math.min(100, Math.round((value / total) * 100));
}

function StatusPill({ status }: { status: EventStatus }) {
    return (
        <span className="inline-flex h-8 items-center gap-2 rounded-full bg-black px-4 text-xs font-extrabold uppercase tracking-wider text-white">
            <Eye size={14} />
            {status.replace("-", " ")}
        </span>
    );
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
        <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_14px_34px_rgba(15,23,42,0.04)]">
            <p className="text-sm font-extrabold text-slate-400">{label}</p>
            <div className="mt-4 flex items-end gap-1">
                <p className="text-3xl font-extrabold leading-none text-slate-950">{value}</p>
                {suffix && <span className="text-xl font-bold text-slate-300">{suffix}</span>}
                {rating && (
                    <span className="mb-1 ml-1 flex text-slate-950">
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
                            className={`flex-1 rounded-t-sm ${index === 3 ? "bg-black" : "bg-slate-300"}`}
                            style={{ height: `${height}%` }}
                        />
                    ))}
                </div>
            ) : progress !== undefined ? (
                <div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-black" style={{ width: `${progress}%` }} />
                </div>
            ) : null}
            <p className="mt-4 text-sm font-extrabold text-slate-600">{helper}</p>
        </article>
    );
}

function InfoBlock({ label, value }: { label: string|null; value: string|null }) {
    return (
        <div>
            <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400">{label}</p>
            <p className="mt-1 font-extrabold text-slate-950 break-words">{value}</p>
        </div>
    );
}