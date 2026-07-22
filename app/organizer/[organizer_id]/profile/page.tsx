import { redirect } from "next/navigation";
import {
    BadgeCheck,
    Bell,
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
import { EventService } from "@/src/services/event.service";
import { EventModel } from "@/src/services/models/event.model";
import { CurrentUserData } from "@/src/services/models/user.type";
import { formatDate } from "@/src/lib/datetime";
import {
    ProfileEventsTabs,
    ProfileEventSummary,
} from "@/src/shared_components/organizer/ProfileEventsTabs";

const PAST_STATUSES = new Set(["completed", "cancelled"]);

function StatBox({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
    return (
        <div className="rounded-xl bg-gray-50 p-3 text-center">
            <div className="mb-1 flex justify-center text-gray-400">{icon}</div>
            <div className="text-xl font-bold text-gray-900">{value}</div>
            <div className="mt-1 text-[11px] font-medium uppercase tracking-wider text-gray-500">
                {label}
            </div>
        </div>
    );
}

function TopStat({ icon, value, label, tone }: { icon: React.ReactNode; value: string; label: string; tone: string }) {
    return (
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <span className={`flex size-10 items-center justify-center rounded-xl ${tone}`}>{icon}</span>
            <div className="mt-4 text-2xl font-bold text-gray-900">{value}</div>
            <div className="text-sm text-gray-500">{label}</div>
        </div>
    );
}

function Field({ label, value, badge }: { label: string; value: string; badge?: string }) {
    return (
        <div className="mb-4">
            <label className="mb-1.5 block text-xs font-medium text-gray-500">{label}</label>
            <div className="relative">
                <div className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900">
                    {value || "—"}
                </div>
                {badge && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded bg-green-50 px-2 py-0.5 text-xs font-bold text-green-600">
                        {badge}
                    </span>
                )}
            </div>
        </div>
    );
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
    return (
        <div className="mb-6 flex items-center gap-2 font-semibold text-gray-900">
            <span className="text-gray-500">{icon}</span>
            <h2>{title}</h2>
        </div>
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
    const stats = organizer.eventStats;
    const initial = (organizer.organization.name || organizer.contact.primaryEmail || "?")
        .charAt(0)
        .toUpperCase();
    const location = [organizer.address.city, organizer.address.country].filter(Boolean).join(", ");
    const currency = "PKR";

    return (
        <main className="min-h-screen bg-[#F8F9FB] px-4 py-8 text-gray-900">
            <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 lg:grid-cols-12">
                {/* LEFT COLUMN */}
                <div className="space-y-6 lg:col-span-4">
                    <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                        <div className="-mx-6 -mt-6 mb-12 h-28 bg-gradient-to-r from-gray-100 to-gray-200" />
                        <div className="absolute left-6 top-16">
                            <div className="flex size-20 items-center justify-center rounded-full border-4 border-white bg-black text-2xl font-bold text-white shadow-md">
                                {initial}
                            </div>
                        </div>

                        <div className="mt-2">
                            <div className="flex items-center gap-2">
                                <h1 className="truncate text-2xl font-bold">
                                    {organizer.organization.name || organizer.contact.primaryEmail}
                                </h1>
                                {organizer.verification.isVerified && (
                                    <BadgeCheck size={20} className="shrink-0 text-blue-500" />
                                )}
                            </div>
                            <p className="mb-4 text-sm capitalize text-gray-500">{organizer.organization.type}</p>

                            {organizer.organization.description && (
                                <p className="mb-4 text-sm leading-relaxed text-gray-600">
                                    {organizer.organization.description}
                                </p>
                            )}

                            <div className="mb-6 space-y-2 text-sm text-gray-500">
                                <div className="flex items-center gap-2">
                                    <MapPin size={16} />
                                    <span>{location || "—"}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Mail size={16} />
                                    <span className="truncate">{organizer.contact.primaryEmail || "—"}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Phone size={16} />
                                    <span>{organizer.contact.primaryPhone || "—"}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <StatBox icon={<CalendarDays size={16} />} value={String(stats.totalEventsCreated)} label="Events Created" />
                                <StatBox icon={<Users size={16} />} value={String(stats.totalAttendees)} label="Attendees" />
                                <StatBox icon={<Star size={16} />} value={stats.averageRating.toFixed(1)} label="Avg Rating" />
                                <StatBox icon={<Wallet size={16} />} value={`${currency} ${stats.totalRevenue.toLocaleString()}`} label="Revenue" />
                            </div>
                        </div>
                    </div>

                    <ProfileEventsTabs events={events} about={organizer.organization.description} basePath={basePath} />
                </div>

                {/* RIGHT COLUMN */}
                <div className="space-y-6 lg:col-span-8">
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                        <TopStat icon={<CalendarDays size={18} className="text-indigo-600" />} value={String(stats.upcomingEvents)} label="Upcoming" tone="bg-indigo-50" />
                        <TopStat icon={<ShieldCheck size={18} className="text-green-600" />} value={String(stats.completedEvents)} label="Completed" tone="bg-green-50" />
                        <TopStat icon={<TrendingUp size={18} className="text-violet-600" />} value={String(stats.publishedEvents)} label="Published" tone="bg-violet-50" />
                        <TopStat icon={<Star size={18} className="text-amber-500" />} value={stats.averageAttendeesPerEvent.toFixed(0)} label="Avg/Event" tone="bg-amber-50" />
                    </div>

                    {/* Account Settings */}
                    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                        <SectionTitle icon={<BadgeCheck size={18} />} title="Account Settings" />
                        <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
                            <Field label="Email Address" value={organizer.contact.primaryEmail} />
                            <Field label="Phone Number" value={organizer.contact.primaryPhone} badge={organizer.contact.primaryPhone ? "VERIFIED" : undefined} />
                        </div>
                        <div className="mt-2 flex items-center justify-between border-t border-gray-100 py-3">
                            <div>
                                <h3 className="text-sm font-medium">Two-Factor Authentication</h3>
                                <p className="text-xs text-gray-500">Add an extra layer of security to your account.</p>
                            </div>
                            <span className="inline-flex h-6 w-11 items-center rounded-full bg-gray-200">
                                <span className="ml-1 inline-block size-4 rounded-full bg-white" />
                            </span>
                        </div>
                    </div>

                    {/* Organization Settings */}
                    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
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
                    </div>

                    {/* Verification Status */}
                    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                        <SectionTitle icon={<ShieldCheck size={18} />} title="Verification Status" />
                        <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-4">
                            <BadgeCheck size={22} className={organizer.verification.isVerified ? "text-green-500" : "text-gray-400"} />
                            <div>
                                <p className="text-sm font-bold text-gray-900">
                                    {organizer.verification.isVerified ? "Verified" : "Unverified"}
                                </p>
                                <p className="text-xs capitalize text-gray-500">
                                    Level: {organizer.verification.verificationLevel}
                                </p>
                            </div>
                        </div>
                        <p className="mt-4 text-xs font-medium uppercase tracking-wider text-gray-500">Documents</p>
                    </div>

                    {/* Subscription Plan */}
                    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                        <SectionTitle icon={<CreditCard size={18} />} title="Subscription Plan" />
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-lg font-bold capitalize text-gray-900">{organizer.plan.type} Plan</p>
                                <p className="text-xs text-gray-500">Expires {formatDate(organizer.plan.expiresAt)}</p>
                            </div>
                            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold uppercase text-gray-700">
                                {organizer.plan.type}
                            </span>
                        </div>
                    </div>

                    {/* Notifications */}
                    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                        <SectionTitle icon={<Bell size={18} />} title="Notifications" />
                        <ul className="space-y-4">
                            {[
                                ["New registrations", organizer.settings.notificationPreferences.newRegistrations],
                                ["New vendor quotes", organizer.settings.notificationPreferences.newVendorQuotes],
                                ["Payment received", organizer.settings.notificationPreferences.paymentReceived],
                                ["Event reminders", organizer.settings.notificationPreferences.eventReminders],
                            ].map(([label, enabled]) => (
                                <li key={String(label)} className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-900">{label}</span>
                                    <span className={`inline-flex h-6 w-11 items-center rounded-full ${enabled ? "bg-black" : "bg-gray-200"}`}>
                                        <span className={`inline-block size-4 rounded-full bg-white transition-transform ${enabled ? "translate-x-6" : "translate-x-1"}`} />
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </main>
    );
}
