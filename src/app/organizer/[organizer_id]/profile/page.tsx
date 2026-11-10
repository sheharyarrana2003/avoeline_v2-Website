import { redirect } from "next/navigation";
import {
  BadgeCheck,
  CalendarDays,
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
import { OrganizerPartnerOptIn } from "@/src/features/website/components/OrganizerPartnerOptIn";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { MetricTile } from "@/src/shared_components/ui/MetricTile";
import { Card, CardBody } from "@/src/shared_components/ui/Card";
import { labelClass } from "@/src/lib/ui";
import { TeamEngineService } from "@/src/features/teams/teamEngine.service";
import {
  getClubWorkspacePlan,
  getOrganizerPlanBlock,
} from "@/src/features/department/department.service";
import { PlanStatusBanner } from "@/src/features/department/components/PlanStatusBanner";
import { MODULE_LABELS } from "@/src/features/permissions/moduleKeys";
import { getOrganizerEmailConnection } from "@/src/features/email/organizerEmailConnection.service";
import { buttonClass } from "@/src/lib/ui";
import Link from "next/link";

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

export default async function OrganizerProfile({
  params,
}: {
  params: Promise<{ organizer_id: string }>;
}) {
  const { organizer_id } = await params;

  const u: CurrentUserData | null = await AuthService.getCurrentUser();
  if (u === null) {
    redirect("/auth/signin");
  }

  const organizer = await OrganizerService.getOrganizerById(organizer_id);
  const clubIds = u.userId === organizer_id ? (u.presidentOfOrgIds ?? []) : [];
  const clubs = (await Promise.all(clubIds.map((id) => TeamEngineService.getOrg(id)))).filter(
    (c): c is NonNullable<typeof c> => !!c && c.type === "club",
  );
  const primaryClub = clubs[0] ?? null;
  const clubPlan = primaryClub ? await getClubWorkspacePlan(primaryClub.id) : null;
  const organizerPlanBlock = await getOrganizerPlanBlock(organizer_id);

  const publicName =
    primaryClub?.name || organizer.organization.name || organizer.contact.primaryEmail;
  const roleLine = primaryClub
    ? `Club president of ${clubs.map((c) => c.name).join(", ")}. Your personal name stays on the account; events and this profile show the club.`
    : organizer.organization.type;

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

  const emailConnection = await getOrganizerEmailConnection(organizer_id);
  const emailConnected = emailConnection?.status === "active";

  const basePath = `/organizer/${organizer_id}`;
  // Headline stats computed live from the events/registrations/reviews
  // collections rather than the (often stale) denormalized organizer.eventStats.
  const stats = await AnalyticsService.getOrganizerProfileStats(organizer_id);
  const initial = (publicName || "?").charAt(0).toUpperCase();
  const location = [organizer.address.city, organizer.address.country].filter(Boolean).join(", ");

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <PageHeader title={publicName} description={roleLine} />
        {clubPlan ? (
          <div className="mb-6">
            <PlanStatusBanner plan={clubPlan} audience="club" />
          </div>
        ) : null}

        <section className="mb-8 grid grid-cols-1 rounded-2xl border border-line bg-paper shadow-sm sm:grid-cols-4">
          <MetricTile
            label="Events Created"
            value={String(stats.totalEventsCreated)}
            icon={<CalendarDays size={14} />}
          />
          <MetricTile
            label="Attendees"
            value={String(stats.totalAttendees)}
            icon={<Users size={14} />}
          />
          <MetricTile
            label="Avg Rating"
            value={stats.averageRating.toFixed(1)}
            icon={<Star size={14} />}
          />
          <MetricTile
            label="Revenue"
            value={formatCurrencyCompact(stats.totalRevenue)}
            icon={<Wallet size={14} />}
          />
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
                    className="size-16 shrink-0 rounded-full border border-line bg-paper object-contain p-1.5"
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
                  <OrganizerLogoUpload
                    organizerId={organizer_id}
                    currentLogo={organizer.organization.logo}
                  />
                </div>
              </div>
            </div>

            {u.userId === organizer_id ? (
              <OrganizerPartnerOptIn organizerId={organizer_id} />
            ) : null}

            <ProfileEventsTabs
              events={events}
              about={organizer.organization.description}
              basePath={basePath}
            />
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-10 lg:col-span-8">
            <section className="mb-6 grid grid-cols-1 rounded-2xl border border-line bg-paper shadow-sm sm:grid-cols-4">
              <MetricTile
                label="Upcoming"
                value={String(stats.upcomingEvents)}
                icon={<CalendarDays size={14} />}
              />
              <MetricTile
                label="Completed"
                value={String(stats.completedEvents)}
                icon={<ShieldCheck size={14} />}
              />
              <MetricTile
                label="Published"
                value={String(stats.publishedEvents)}
                icon={<TrendingUp size={14} />}
              />
              <MetricTile
                label="Avg / Event"
                value={stats.averageAttendeesPerEvent.toFixed(0)}
                icon={<Users size={14} />}
              />
            </section>

            <Card title="Account Settings">
              <CardBody>
                <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
                  <Field label="Your name" value={u.name} />
                  <Field label="Email Address" value={organizer.contact.primaryEmail || u.email} />
                  <Field label="Phone Number" value={organizer.contact.primaryPhone} />
                </div>
              </CardBody>
            </Card>

            <Card title="Connections">
              <CardBody>
                <p className="text-sm text-ink-soft">
                  {emailConnected
                    ? `Connected as ${emailConnection?.fromEmail}. Required for attendee and certificate mail.`
                    : "Not connected. Attendee and certificate sends are blocked until you connect Google."}
                </p>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm font-medium text-ink">
                  <Link href={`${basePath}/settings/connections`} className="underline">
                    {emailConnected ? "Manage connections" : "Connect Google"}
                  </Link>
                  <Link
                    href={`${basePath}/settings/connections?section=drive`}
                    className="underline text-ink-soft hover:text-ink"
                  >
                    Drive library
                  </Link>
                  <Link
                    href={`${basePath}/forms`}
                    className="underline text-ink-soft hover:text-ink"
                  >
                    Custom forms
                  </Link>
                </div>
              </CardBody>
            </Card>

            <Card title={primaryClub ? "Club & public profile" : "Organization Settings"}>
              <CardBody>
                {primaryClub ? (
                  <p className="mb-4 text-sm text-ink-soft">
                    You started as an organizer. The department assigned you as club president, so
                    the public name on events is the club — not your personal name.
                  </p>
                ) : null}
                <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
                  <Field label="Public name (events)" value={publicName} />
                  <Field label="Role" value={primaryClub ? "Club president" : "Organizer"} />
                  {primaryClub ? (
                    <Field label="Club" value={clubs.map((c) => c.name).join(", ")} />
                  ) : null}
                  <Field
                    label="Tax Identification"
                    value={organizer.organization.taxNumber || "N/A"}
                  />
                </div>
                <Field
                  label="Business Registration Address"
                  value={organizer.address.officeAddress}
                />
                <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
                  <Field label="City" value={organizer.address.city} />
                  <Field label="Country" value={organizer.address.country} />
                </div>
              </CardBody>
            </Card>

            <Card title="Verification Status">
              <CardBody>
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
              </CardBody>
            </Card>

            <Card title="Subscription Plan">
              <CardBody>
                {clubPlan ? (
                  <p className="mb-4 text-xs text-ink-soft">
                    Club modules come from the department grant. Your personal organizer plan is
                    unchanged underneath.
                  </p>
                ) : null}
                {organizerPlanBlock.plan ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-md border border-line bg-muted px-2.5 py-1 text-sm font-medium text-ink">
                        {organizerPlanBlock.plan.name}
                      </span>
                      <span className="text-2xs uppercase tracking-wide text-ink-faint">
                        {organizerPlanBlock.plan.key}
                      </span>
                    </div>
                    <p className="text-xs text-ink-soft">
                      {organizerPlanBlock.plan.modules.length
                        ? organizerPlanBlock.plan.modules.map((k) => MODULE_LABELS[k]).join(" · ")
                        : "No features on this plan yet."}
                    </p>
                    {organizerPlanBlock.expiresAt || organizer.plan.expiresAt ? (
                      <p className="text-xs text-ink-soft tabular-nums">
                        Expires{" "}
                        {formatDate(organizerPlanBlock.expiresAt || organizer.plan.expiresAt)}
                      </p>
                    ) : null}
                    {organizerPlanBlock.overrides.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {organizerPlanBlock.overrides.map((o) => (
                          <span
                            key={`${o.moduleKey}-${o.denied ? "deny" : "grant"}`}
                            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-2xs font-medium ${
                              o.denied
                                ? "border-line text-ink-soft line-through"
                                : "border-ink/20 bg-ink text-ink-invert"
                            }`}
                          >
                            {o.denied ? "Deny" : "Grant"}: {MODULE_LABELS[o.moduleKey]}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <Link href="/support" className={buttonClass("secondary", "sm")}>
                      Upgrade / Contact support
                    </Link>
                  </div>
                ) : (
                  <>
                    <p className="text-lg font-semibold capitalize text-ink">
                      {organizer.plan.type} Plan
                    </p>
                    <p className="mt-1 text-xs text-ink-soft tabular-nums">
                      Expires {formatDate(organizer.plan.expiresAt)}
                    </p>
                    <Link href="/support" className={`mt-3 ${buttonClass("secondary", "sm")}`}>
                      Upgrade / Contact support
                    </Link>
                  </>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
