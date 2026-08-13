import { redirect } from "next/navigation";
import {
    BadgeCheck,
    CalendarDays,
    CreditCard,
    Globe,
    Mail,
    MapPin,
    Phone,
    ShieldCheck,
    Star,
    TrendingUp,
    Users,
    Wallet,
} from "lucide-react";

import { AuthService } from "@/src/features/auth/authService";
import { OrganizerService } from "@/src/services/organizer.service";
import { AnalyticsService } from "@/src/services/anaylService";
import { EventService } from "@/src/services/event.service";
import { EventModel } from "@/src/services/models/event.model";
import { CurrentUserData } from "@/src/services/models/user.type";
import { formatDate } from "@/src/lib/datetime";
import { formatCurrencyCompact } from "@/src/lib/money";
import {
    ProfileEventsTabs,
    ProfileEventSummary,
} from "@/src/shared_components/organizer/ProfileEventsTabs";
import { OrganizerLogoUpload } from "@/src/shared_components/organizer/OrganizerLogoUpload";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { MetricTile } from "@/src/shared_components/ui/MetricTile";
import { labelClass } from "@/src/lib/ui";

const PAST_STATUSES = new Set(["completed", "cancelled"]);

/** Read-only, so a <p> and not a <label> -- there is no control to label. */
function Field({ label, value }: { label: string; value: string }) {
    return (
        <div className="mb-4">
            <p className={labelClass}>{label}</p>
            <p className="mt-1.5 text-sm text-ink">{value || "—"}</p>
        </div>
    );
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
    return (
        <h2 className="mb-5 flex items-center gap-2 border-b border-line pb-3 font-display text-xl text-ink">
            {/* gray-400 = 2.5:1, decoration only — the heading text carries the meaning. */}
            <span className="text-ink-faint" aria-hidden="true">{icon}</span>
            {title}
        </h2>
    );
}

export default async function OrganizerProfile({ params }: { params: Promise<{ organizer_id: string }> }) {
    const { organizer_id } = await params;

    const u: CurrentUserData | null = await AuthService.getCurrentUser();
    if (u === null) {
        redirect("/auth/signup");
    }

    const organizer = await OrganizerService.getOrganizerById(organizer_id);

    let organizerEvents: EventModel[] = [];
    try {
        organizerEvents = await EventService.getAllEventsByOrganizer(organizer_id);
    } catch {
        organizerEvents = [];
    }

    const events: ProfileEventSummary[] = organizerEvents.map((event) => ({
        id: event.id,
        title: event.title,
        date: event.schedule?.startDate ? formatDate(event.schedule.startDate) : "",
        venueName: event.location?.venueName ?? "",
        category: event.category ?? "",
        isPast: PAST_STATUSES.has(String(event.status)),
    }));

    const basePath = `/organizer/${organizer_id}`;
    // Headline stats computed live from the events/registrations/reviews
    // collections rather than the (often stale) denormalized organizer.eventStats.
    const stats = await AnalyticsService.getOrganizerProfileStats(organizer_id);
    const initial = (organizer.organization.name || organizer.contact.primaryEmail || "?")
        .charAt(0)
        .toUpperCase();
    const location = [organizer.address.city, organizer.address.country].filter(Boolean).join(", ");

    return (
        <div className="px-4 py-8 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">

                <PageHeader
                    title={organizer.organization.name || organizer.contact.primaryEmail}
                    description={organizer.organization.type}
                />

                <section className="grid grid-cols-2 gap-y-8 border-b border-line pb-8 sm:grid-cols-4 sm:divide-x sm:divide-line">
                    <MetricTile label="Events Created" value={String(stats.totalEventsCreated)} icon={<CalendarDays size={14} />} />
                    <MetricTile label="Attendees" value={String(stats.totalAttendees)} icon={<Users size={14} />} />
                    <MetricTile label="Avg Rating" value={stats.averageRating.toFixed(1)} icon={<Star size={14} />} />
                    <MetricTile label="Revenue" value={formatCurrencyCompact(stats.totalRevenue)} icon={<Wallet size={14} />} />
                </section>

                <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
                    {/* LEFT COLUMN */}
                    <div className="space-y-6 lg:col-span-4">
                        <div className="rounded-2xl border border-line bg-paper p-5">
                            <div className="flex items-center gap-4">
                                {organizer.organization.logo ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={organizer.organization.logo}
                                        alt=""
                                        className="size-16 shrink-0 rounded-full border border-line object-cover"
                                    />
                                ) : (
                                    <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-ink text-2xl font-semibold text-ink-invert">
                                        {initial}
                                    </div>
                                )}
                                {organizer.verification.isVerified && (
                                    <span className="inline-flex items-center gap-1.5 text-sm text-ink">
                                        <BadgeCheck size={16} aria-hidden="true" />
                                        Verified
                                    </span>
                                )}
                            </div>

                            {organizer.organization.description && (
                                <p className="mt-4 text-sm leading-relaxed text-ink-soft">
                                    {organizer.organization.description}
                                </p>
                            )}

                            <div className="mt-4 space-y-2 text-sm text-ink-soft">
                                <p className="flex items-center gap-2">
                                    <MapPin size={16} className="shrink-0 text-ink-faint" aria-hidden="true" />
                                    <span>{location || "—"}</span>
                                </p>
                                <p className="flex items-center gap-2">
                                    <Mail size={16} className="shrink-0 text-ink-faint" aria-hidden="true" />
                                    <span className="truncate">{organizer.contact.primaryEmail || "—"}</span>
                                </p>
                                <p className="flex items-center gap-2">
                                    <Phone size={16} className="shrink-0 text-ink-faint" aria-hidden="true" />
                                    <span className="tabular-nums">{organizer.contact.primaryPhone || "—"}</span>
                                </p>
                            </div>

                            <div className="mt-6">
                                <p className={labelClass}>Organization Logo</p>
                                <div className="mt-2">
                                    <OrganizerLogoUpload organizerId={organizer_id} currentLogo={organizer.organization.logo} />
                                </div>
                            </div>
                        </div>

                        <ProfileEventsTabs events={events} about={organizer.organization.description} basePath={basePath} />
                    </div>

                    {/* RIGHT COLUMN */}
                    <div className="space-y-10 lg:col-span-8">
                        <section className="grid grid-cols-2 gap-y-8 border-y border-line py-8 sm:grid-cols-4 sm:divide-x sm:divide-line">
                            <MetricTile label="Upcoming" value={String(stats.upcomingEvents)} icon={<CalendarDays size={14} />} />
                            <MetricTile label="Completed" value={String(stats.completedEvents)} icon={<ShieldCheck size={14} />} />
                            <MetricTile label="Published" value={String(stats.publishedEvents)} icon={<TrendingUp size={14} />} />
                            <MetricTile label="Avg / Event" value={stats.averageAttendeesPerEvent.toFixed(0)} icon={<Users size={14} />} />
                        </section>

                        <section>
                            <SectionTitle icon={<BadgeCheck size={18} />} title="Account Settings" />
                            <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
                                <Field label="Email Address" value={organizer.contact.primaryEmail} />
                                <Field label="Phone Number" value={organizer.contact.primaryPhone} />
                            </div>
                        </section>

                        <section>
                            <SectionTitle icon={<Globe size={18} />} title="Organization Settings" />
                            <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
                                <Field label="Organization Name" value={organizer.organization.name} />
                                <Field label="Tax Identification" value={organizer.organization.taxNumber || "N/A"} />
                            </div>
                            <Field label="Business Registration Address" value={organizer.address.officeAddress} />
                            <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
                                <Field label="City" value={organizer.address.city} />
                                <Field label="Country" value={organizer.address.country} />
                            </div>
                        </section>

                        <section>
                            <SectionTitle icon={<ShieldCheck size={18} />} title="Verification Status" />
                            <div className="flex items-center gap-3">
                                <BadgeCheck
                                    size={22}
                                    className={organizer.verification.isVerified ? "text-ink" : "text-ink-soft"}
                                    aria-hidden="true"
                                />
                                <div>
                                    <p className="text-sm font-medium text-ink">
                                        {organizer.verification.isVerified ? "Verified" : "Unverified"}
                                    </p>
                                    <p className="text-xs capitalize text-ink-soft">
                                        Level: {organizer.verification.verificationLevel}
                                    </p>
                                </div>
                            </div>
                        </section>

                        <section>
                            <SectionTitle icon={<CreditCard size={18} />} title="Subscription Plan" />
                            <p className="text-lg font-semibold capitalize text-ink">{organizer.plan.type} Plan</p>
                            <p className="mt-1 text-xs text-ink-soft tabular-nums">
                                Expires {formatDate(organizer.plan.expiresAt)}
                            </p>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}
