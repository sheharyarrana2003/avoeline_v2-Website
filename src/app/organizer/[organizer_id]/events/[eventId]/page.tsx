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
  ListChecks,
  Check,
} from "lucide-react";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RecentRegistration } from "@/src/features/dashboard/types";
import { isVideoUrl } from "@/src/features/media/media.utils";
import { toggleChecklistItem } from "@/src/features/events/actions/toggleChecklistItem.action";
import { RegService } from "@/src/services/registeration.service";
import { formatDate, formatTime, formatDateTime } from "@/src/lib/datetime";
import { formatCurrency } from "@/src/lib/money";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import ShareRow from "@/src/features/events/components/wizard/results/components/ShareRow";
import { absoluteUrl, registrationPath } from "@/src/lib/appUrl";
import {
  getPublicEvent,
  occupyingGroupRegs,
  occupyingHackathonRegs,
} from "@/src/features/registration/registration.service";
import { listTeamsOfEvent } from "@/src/features/hackathon/hackathon.service";
import { listRegistrationGroups } from "@/src/features/registration_groups/groups.service";
import { MetricTile } from "@/src/shared_components/ui/MetricTile";
import { Meter } from "@/src/shared_components/ui/charts/Meter";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { ImageLightbox } from "@/src/shared_components/ui/ImageLightbox";
import { RichDescription } from "@/src/shared_components/ui/RichDescription";
import { Card, CardBody } from "@/src/shared_components/ui/Card";
import { isGoogleEmbedUrl, openInMapsHref } from "@/src/lib/mapsUrl";

/**
 * One fact on the ink hero. Sits on --panel-bg, which stays dark in both themes,
 * so the white treatment here is correct in light and dark alike.
 */
const EMPTY_FACT = /^(nothing scheduled|not scheduled|not set|no registration|not priced|n\/a|—)$/i;

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
  const empty = EMPTY_FACT.test(value.trim());
  return (
    <div className="flex min-w-0 items-start gap-3">
      <span
        className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/12 text-white ring-1 ring-white/20"
        aria-hidden="true"
      >
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-2xs uppercase tracking-wide text-white/55">{label}</dt>
        <dd
          className={`mt-0.5 truncate tabular-nums ${empty ? "text-sm italic font-normal text-white/45" : "text-base font-semibold text-white"}`}
        >
          {value}
        </dd>
        {sub ? <dd className="mt-0.5 truncate text-xs text-white/50 tabular-nums">{sub}</dd> : null}
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

export default async function EventDetailsPage({
  params,
}: {
  params: Promise<{ eventId: string; organizer_id: string }>;
}) {
  const { eventId, organizer_id } = await params;
  const event: EventModel | null = await EventService.getEventByID(eventId);

  if (!event) {
    notFound();
  }

  // Live metrics from registrations — parallel after ownership/event load.
  const [regs, teams, groups, recentRegistrations, shareable] = await Promise.all([
    RegService.getRegsOfEvent(eventId),
    listTeamsOfEvent(eventId).catch(() => []),
    event.registration?.groupRegistration ? listRegistrationGroups(eventId) : Promise.resolve([]),
    EventService.getRecentRegEvents(eventId, organizer_id),
    getPublicEvent(eventId),
  ]);
  const registrationsCount = teams.length
    ? occupyingHackathonRegs(regs, teams).length
    : groups.length
      ? occupyingGroupRegs(regs, groups).length
      : occupyingHackathonRegs(regs, teams).length;
  const checkedIn = regs.filter((r) => r.status === "checked_in" || r.status === "attended").length;
  const revenue = regs.reduce((sum, r) => sum + (r.payment?.amountPaid ?? 0), 0);

  const capacityPercent = getPercent(registrationsCount, event.capacity.totalSeats);
  const currency = event.pricing?.currency;

  // Registration opens/closes are two InfoBlocks far down the page; as a single
  // line up here they answer "can people still sign up", which is the question.
  const regOpens = formatDate(event.registration?.registrationOpenDate);
  const regCloses = formatDate(event.registration?.registrationCloseDate);
  const registrationWindow =
    regCloses !== "—"
      ? `Registration closes ${regCloses}`
      : regOpens !== "—"
        ? `Registration opens ${regOpens}`
        : null;

  // Same gate the public page uses, so this link only appears when it actually
  // leads somewhere. getEventByID is cache()d, so asking again costs no read.
  // A registration link is worth showing whenever the event is open, whatever
  // its access type -- a private event's link is exactly the thing an organizer
  // needs to hand out, since the direct link is one of the ways in. Only a
  // draft, cancelled or finished event has no link worth copying.
  const takesRegistrations = event.requiresRegistration !== false;
  const registrationUrl =
    takesRegistrations && shareable ? await absoluteUrl(registrationPath(event.id)) : null;

  return (
    // No <main>, no page padding and no title here: the event layout renders all
    // of them, along with the breadcrumb, the status and the section tabs.
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Banner lives once in the layout header (EventHeaderMedia). Overview
                only shows orientation facts — no second hero image. */}
      {/* bg-panel, not bg-ink: --ink is *text*, so in dark mode it resolves to
                near-white and this hero would become a white slab carrying white text.
                --panel-bg is the surface that stays dark in both themes. */}
      <section className="overflow-hidden rounded-xl bg-panel shadow-sm">
        <div className="flex min-w-0 flex-col justify-center gap-6 p-6 sm:p-8">
          <div className="flex flex-wrap gap-1.5">
            {/* No language chip: event.service.ts hardcodes language: "en".
                            format is kept only when off the wizard's `physical` default. */}
            {[event.category, event.eventType, event.format !== "physical" ? event.format : null]
              .filter(Boolean)
              .map((chip) => (
                <span
                  key={String(chip)}
                  className="rounded-full border border-white/25 bg-white/14 px-2.5 py-1 text-2xs font-medium uppercase tracking-wide text-white"
                >
                  {chip}
                </span>
              ))}
          </div>

          <dl className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
            <HeroFact
              icon={<CalendarDays size={18} />}
              label="When"
              value={formatDateRange(event.schedule?.startDate, event.schedule?.endDate)}
              sub={formatTimeRange(
                event.schedule?.startTime,
                event.schedule?.endTime,
                event.schedule?.timezone,
              )}
            />
            <HeroFact
              icon={<MapPin size={18} />}
              label="Where"
              value={event.location?.venueName || event.location?.city || "Not set"}
              sub={
                [event.location?.city, event.location?.country].filter(Boolean).join(", ") ||
                undefined
              }
            />
            <HeroFact
              icon={<Ticket size={18} />}
              label={takesRegistrations ? "Tickets" : "Admission"}
              value={
                takesRegistrations
                  ? event.pricing?.isFree
                    ? "Free"
                    : formatCurrency(event.PriceOfTicket, currency, "Not priced")
                  : "No registration"
              }
              sub={
                takesRegistrations
                  ? (registrationWindow ??
                    (event.registration?.requiresApproval ? "Approval required" : undefined))
                  : "This event does not take sign-ups"
              }
            />
            <HeroFact
              icon={<Users size={18} />}
              label="Programme"
              value={
                event.speakers?.length || event.agenda?.length
                  ? [
                      event.speakers?.length
                        ? `${event.speakers.length} speaker${event.speakers.length === 1 ? "" : "s"}`
                        : null,
                      event.agenda?.length
                        ? `${event.agenda.length} session${event.agenda.length === 1 ? "" : "s"}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")
                  : "Nothing scheduled"
              }
              sub={
                event.vendorRequirements?.length
                  ? `${event.vendorRequirements.length} vendor requirement${event.vendorRequirements.length === 1 ? "" : "s"}`
                  : undefined
              }
            />
          </dl>
        </div>
      </section>

      {/* The attendees tab tells organizers to "share the event's registration
                link", and until now there was nowhere to get one: the publish success
                screen showed it once, on publish day, and never again. */}
      {registrationUrl && (
        <section className="rounded-xl border border-line bg-paper p-6 shadow-sm">
          <h2 className="font-display text-lg text-ink">Registration link</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Anyone with this link can register. No account needed.
          </p>
          <p className="mt-4 truncate rounded-lg border border-line bg-muted px-3 py-2 font-mono text-xs text-ink">
            {registrationUrl}
          </p>
          <div className="mt-4">
            <ShareRow eventUrl={registrationUrl} eventTitle={event.title} />
          </div>
        </section>
      )}

      {/* The fourth tile used to be "Avg. Rating 4.8 / Based on 142 reviews" over a
                five-bar chart hardcoded to [45,62,74,100,68]. Neither number came from
                anywhere; an invented figure on an organizer's own event is worse than none. */}
      {/* Was four bare figures on a divided band. "Registrations 340 / 500" and
                "Capacity filled 68%" were two tiles saying the same thing in different
                units, so the meter absorbs both and the freed tile carries the seats
                still available — the number an organizer is actually deciding on. */}
      {takesRegistrations ? (
        <section className="grid grid-cols-1 overflow-hidden rounded-xl border border-line bg-paper shadow-sm sm:grid-cols-4">
          <MetricTile
            label={teams.length ? "Team registrations" : "Registrations"}
            value={`${registrationsCount}`}
            icon={<Users className="h-4 w-4" />}
            iconTone="info"
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
            value={
              event.capacity.totalSeats > 0
                ? `${Math.max(0, event.capacity.totalSeats - registrationsCount)}`
                : "—"
            }
            icon={<Gauge className="h-4 w-4" />}
            iconTone="neutral"
            sublabel={
              event.capacity.totalSeats > 0 ? "Against configured capacity" : "No capacity set"
            }
          />
          <MetricTile
            label="Checked in"
            value={`${checkedIn}`}
            icon={<UserCheck className="h-4 w-4" />}
            iconTone="success"
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
            iconTone="warning"
            sublabel="Amounts actually paid"
          />
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <OverviewCard icon={<Clock size={16} />} title="Schedule">
              <div className="space-y-5">
                <InfoBlock label="Start date" value={formatDate(event.schedule?.startDate)} />
                <InfoBlock label="End date" value={formatDate(event.schedule?.endDate)} />
                <InfoBlock label="Start time" value={formatTime(event.schedule?.startTime)} />
                <InfoBlock label="End time" value={formatTime(event.schedule?.endTime)} />
                <InfoBlock label="Timezone" value={event.schedule?.timezone} />
                <InfoBlock label="Recurring" value={event.schedule?.isRecurring ? "Yes" : "No"} />
              </div>
            </OverviewCard>

            <OverviewCard icon={<MapPin size={16} />} title="Location">
              <div className="space-y-5">
                <InfoBlock label="Venue" value={event.location?.venueName} />
                <InfoBlock label="Address" value={event.location?.address} />
                <InfoBlock label="City" value={event.location?.city} />
                <InfoBlock label="Country" value={event.location?.country} />
                <InfoBlock label="Platform" value={event.location?.meetingPlatform} />
                {(() => {
                  const mapsHref = openInMapsHref(event.mapsUrl || event.mapUrl);
                  if (!mapsHref) return null;
                  return (
                    <div className="space-y-3">
                      <a
                        href={mapsHref}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex text-sm font-semibold text-ink underline"
                      >
                        Open in Maps
                      </a>
                      {isGoogleEmbedUrl(mapsHref) ? (
                        <iframe
                          title="Venue map"
                          src={mapsHref}
                          className="h-40 w-full rounded-xl border border-line"
                        />
                      ) : null}
                    </div>
                  );
                })()}
              </div>
            </OverviewCard>

            {takesRegistrations ? (
              <OverviewCard icon={<Users size={16} />} title="Capacity">
                {(() => {
                  // Live occupying count is source of truth for reserved;
                  // stored reserved/available columns drift when total_seats is unset.
                  const total = Number(event.capacity.totalSeats) || 0;
                  const reserved = registrationsCount;
                  const available = total > 0 ? Math.max(0, total - reserved) : null;
                  return (
                    <div className="space-y-5">
                      <InfoBlock
                        label="Total seats"
                        value={total > 0 ? total.toLocaleString("en-US") : "Not set"}
                      />
                      <InfoBlock label="Reserved seats" value={reserved.toLocaleString("en-US")} />
                      <InfoBlock
                        label="Available seats"
                        value={available == null ? "—" : available.toLocaleString("en-US")}
                      />
                    </div>
                  );
                })()}
              </OverviewCard>
            ) : null}

            {takesRegistrations ? (
              <OverviewCard icon={<UserCheck size={16} />} title="Registration">
                <div className="space-y-5">
                  <InfoBlock
                    label="Opens"
                    value={formatDate(event.registration?.registrationOpenDate)}
                  />
                  <InfoBlock
                    label="Closes"
                    value={formatDate(event.registration?.registrationCloseDate)}
                  />
                  <InfoBlock
                    label="Requires approval"
                    value={event.registration?.requiresApproval ? "Yes" : "No"}
                  />
                </div>
              </OverviewCard>
            ) : null}
          </div>

          {takesRegistrations ? (
            <OverviewCard icon={<Ticket size={16} />} title="Pricing and tickets">
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                <div className="space-y-5">
                  <InfoBlock label="Free event" value={event.pricing?.isFree ? "Yes" : "No"} />
                  <InfoBlock label="Currency" value={event.pricing?.currency} />
                  {(event.pricing?.studentDiscount?.enabled ||
                    event.pricing?.groupDiscount?.enabled) && (
                    <div className="space-y-1 border-t border-line pt-4">
                      <p className="text-2xs font-medium uppercase tracking-wide text-ink-soft">
                        Available discounts
                      </p>
                      {event.pricing?.studentDiscount?.enabled && (
                        <p className="mt-0.5 text-sm text-ink tabular-nums">
                          Student: {event.pricing.studentDiscount.percentage}% off
                        </p>
                      )}
                      {event.pricing?.groupDiscount?.enabled && (
                        <p className="mt-0.5 text-sm text-ink tabular-nums">
                          Group ({event.pricing.groupDiscount.minGroupSize}+):{" "}
                          {event.pricing.groupDiscount.percentage}% off
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <p className="mb-3 text-2xs font-medium uppercase tracking-wide text-ink-soft">
                    Ticket tiers
                  </p>
                  {event.pricing?.tiers?.length ? (
                    <ul className="space-y-3">
                      {event.pricing.tiers.map((tier, index) => (
                        <li key={index} className="rounded-xl border border-line bg-paper p-4">
                          <p className="text-2xs font-medium uppercase tracking-wide text-ink-soft">
                            {tier.name}
                          </p>
                          <p className="mt-0.5 text-base font-medium text-ink tabular-nums">
                            {formatCurrency(tier.price, currency)}
                          </p>
                          <p className="text-xs text-ink-soft tabular-nums">
                            Until {formatDate(tier.availableUntil)} • {tier.seats} seats
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <EmptyState
                      size="sm"
                      icon={<Ticket className="h-8 w-8" />}
                      title="No ticket tiers"
                      description="Add a tier in the event editor to sell seats at more than one price."
                      className="rounded-xl"
                    />
                  )}
                </div>
              </div>
            </OverviewCard>
          ) : null}

          <OverviewCard icon={<FileText size={16} />} title="Description">
            {event.description || event.shortDescription ? (
              <div className="max-w-prose space-y-4">
                <RichDescription
                  html={event.description}
                  className="text-base leading-relaxed text-ink"
                />
                <p className="text-sm leading-relaxed text-ink-soft">{event.shortDescription}</p>
              </div>
            ) : (
              <EmptyState
                size="sm"
                icon={<FileText className="h-5 w-5" />}
                title="No description yet"
                description="Attendees see this on the public event page. Add one in the event editor."
                className="rounded-xl"
              />
            )}
          </OverviewCard>

          {event.categoryFields && Object.keys(event.categoryFields).length ? (
            <OverviewCard icon={<FileText size={16} />} title={`${event.category} details`}>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {Object.entries(event.categoryFields).map(([key, value]) => (
                  <InfoBlock
                    key={key}
                    label={humanizeFieldId(key)}
                    value={
                      typeof value === "boolean" ? (value ? "Yes" : "No") : String(value || "")
                    }
                  />
                ))}
              </div>
            </OverviewCard>
          ) : null}

          {event.checklist?.length ? (
            <OverviewCard icon={<ListChecks size={16} />} title="Checklist">
              <p className="mb-4 text-xs text-ink-soft tabular-nums">
                {event.checklist.filter((c) => c.done).length} of {event.checklist.length} done
                {" · "}suggested for {event.eventType || "this format"}
              </p>
              <ul className="space-y-1">
                {event.checklist.map((item, index) => (
                  <li key={`${index}-${item.label}`}>
                    {/* A form per row rather than a client component:
                                            the page stays a Server Component and this
                                            works with JS off. */}
                    <form action={toggleChecklistItem}>
                      <input type="hidden" name="eventId" value={eventId} />
                      <input type="hidden" name="index" value={index} />
                      <button
                        type="submit"
                        aria-pressed={item.done}
                        className="flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2"
                      >
                        <span
                          aria-hidden="true"
                          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-xs border ${
                            item.done ? "border-ink bg-ink text-ink-invert" : "border-line-loud"
                          }`}
                        >
                          {item.done ? <Check className="h-3 w-3" /> : null}
                        </span>
                        <span
                          className={`text-sm ${item.done ? "text-ink-soft line-through" : "text-ink"}`}
                        >
                          {item.label}
                        </span>
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            </OverviewCard>
          ) : null}
        </div>

        <div className="space-y-6">
          {takesRegistrations ? (
            <OverviewCard
              icon={<Users size={16} />}
              title="Recent registrations"
              action={
                <Link
                  href={`/organizer/${organizer_id}/events/${eventId}/attendees`}
                  className="text-xs text-ink-soft hover:text-ink hover:underline"
                >
                  View all
                </Link>
              }
            >
              {recentRegistrations.length === 0 ? (
                <EmptyState
                  size="sm"
                  icon={<Users className="h-5 w-5" />}
                  title="No registrations yet"
                  description="Share the event link — sign-ups land here as they come in."
                  className="rounded-xl"
                />
              ) : (
                <ul className="-mx-2 space-y-0.5">
                  {recentRegistrations.map((reg, index) => (
                    <li
                      key={reg.id}
                      className="flex items-center gap-4 rounded-lg px-2 py-2 transition-colors hover:bg-muted"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs text-ink-soft tabular-nums">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">{reg.attendeeName}</p>
                        <p className="truncate text-xs text-ink-soft tabular-nums">
                          {formatCurrency(reg.amountPaid, currency)}
                        </p>
                      </div>
                      <StatusBadge status={reg.status} size="sm" marker="dot" />
                    </li>
                  ))}
                </ul>
              )}
            </OverviewCard>
          ) : null}

          <OverviewCard icon={<Clock size={16} />} title="Timestamps">
            <div className="space-y-5">
              <InfoBlock label="Created at" value={formatDateTime(event.createdAt)} />
              <InfoBlock label="Updated at" value={formatDateTime(event.updatedAt)} />
              <InfoBlock
                label="Event start"
                value={
                  event.schedule?.startDate
                    ? `${formatDate(event.schedule.startDate)}, ${formatTime(event.schedule.startTime)}`
                    : "N/A"
                }
              />
              <InfoBlock
                label="Event end"
                value={
                  event.schedule?.endDate
                    ? `${formatDate(event.schedule.endDate)}, ${formatTime(event.schedule.endTime)}`
                    : "N/A"
                }
              />
            </div>
          </OverviewCard>

          {event.speakers && event.speakers.length > 0 && (
            <OverviewCard icon={<Users size={16} />} title="Speakers">
              <ul className="space-y-3">
                {event.speakers.map((speaker) => (
                  <li key={speaker.speakerId} className="flex items-center gap-3">
                    {speaker.profileImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={speaker.profileImage}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="size-8 rounded-full object-cover"
                      />
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
            </OverviewCard>
          )}

          {event.certificateConfig && (
            <OverviewCard icon={<Award size={16} />} title="Certificate">
              <div className="space-y-5">
                <InfoBlock
                  label="Issue certificates"
                  value={event.certificateConfig.issueCertificates ? "Yes" : "No"}
                />
                <InfoBlock label="Type" value={event.certificateConfig.certificateType} />
                <InfoBlock label="Template ID" value={event.certificateConfig.templateId} />
              </div>
            </OverviewCard>
          )}

          {event.galleryImages && event.galleryImages.length > 0 && (
            <OverviewCard icon={<ImageIcon size={16} />} title="Gallery">
              <div className="grid grid-cols-2 gap-3">
                {event.galleryImages.map((url: string, i: number) => (
                  <div
                    key={i}
                    className="relative aspect-square overflow-hidden rounded-xl bg-muted"
                  >
                    {isVideoUrl(url) ? (
                      <video src={url} controls className="h-full w-full object-cover" />
                    ) : (
                      // Same need as the banner: a gallery cropped square
                      // to a quarter-width tile is a thumbnail, not a view
                      // of the picture. Videos already have their own
                      // fullscreen control, so they are left alone.
                      <ImageLightbox
                        src={url}
                        alt={`Gallery image ${i + 1}`}
                        className="h-full w-full"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      </ImageLightbox>
                    )}
                  </div>
                ))}
              </div>
            </OverviewCard>
          )}

          {event.promoVideoUrl && (
            <OverviewCard icon={<ImageIcon size={16} />} title="Promo video">
              {isVideoUrl(event.promoVideoUrl) ? (
                <video src={event.promoVideoUrl} controls className="w-full rounded-xl bg-panel" />
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
            </OverviewCard>
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

function OverviewCard({
  icon,
  title,
  action,
  children,
}: {
  icon: ReactNode;
  title: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card
      tone="raised"
      title={
        <span className="flex items-center gap-2">
          <span className="text-ink-faint" aria-hidden="true">
            {icon}
          </span>
          {title}
        </span>
      }
      action={action}
    >
      <CardBody>{children}</CardBody>
    </Card>
  );
}

/**
 * "cuisine-type" -> "Cuisine type". The stored key is a slug of the admin's
 * label, and the label itself is not copied onto the event -- so this rebuilds
 * something readable rather than adding a second copy that can drift.
 */
function humanizeFieldId(fieldId: string): string {
  const words = fieldId.replace(/[-_]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function InfoBlock({ label, value }: { label: string | null; value: string | null }) {
  return (
    <div>
      <p className="text-2xs font-medium uppercase tracking-wide text-ink-soft">{label}</p>
      <p className="mt-0.5 break-words text-sm text-ink tabular-nums">{value ?? "N/A"}</p>
    </div>
  );
}
