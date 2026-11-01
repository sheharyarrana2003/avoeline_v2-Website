import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { EventsTab } from "@/src/shared_components/organizer/EventTab";
import { EventService } from "@/src/services/event.service";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { eventLifecycle } from "@/src/lib/eventState";
import { AuthService } from "@/src/features/auth/authService";
import { DeleteEventForm } from "@/src/features/events/components/DeleteEventForm";
import { ArchiveEventForm } from "@/src/features/events/components/ArchiveEventForm";
import { EventHeaderMedia } from "@/src/shared_components/organizer/EventHeaderMedia";
import { eventIsHackathon } from "@/src/features/hackathon/hackathon.service";
import { hasModuleAccess } from "@/src/features/permissions/permissions.service";
import {
  eventTabFromPath,
  getStaffEventGrant,
  tabAllowedByGrant,
} from "@/src/features/hackathon/staffEventAccess";
import { buttonClass } from "@/src/lib/ui";

export const dynamic = "force-dynamic";

export default async function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ eventId: string; organizer_id: string }>;
}) {
  const waitedParams = await params;
  const eventId = waitedParams.eventId;
  const organizer_id = waitedParams.organizer_id;

  // Load event + session first (cookies). Do not Promise.all with headers() —
  // pairing cookies() and headers() in one all() has raced empty sessions here.
  const [event, current] = await Promise.all([
    EventService.getEventByID(eventId),
    AuthService.getCurrentUser(),
  ]);
  if (!event) notFound();

  const grant = await getStaffEventGrant(eventId);
  const pathname = (await headers()).get("x-pathname") || "";

  const eventsListHref =
    current?.role === "department_admin"
      ? "/department/events"
      : current?.presidentOfOrgIds?.[0]
        ? `/clubs/${current.presidentOfOrgIds[0]}/events`
        : `/organizer/${organizer_id}/events`;

  const takesRegistrations = event.requiresRegistration !== false;
  const [hackathon, certsOk] = await Promise.all([
    eventIsHackathon(event),
    hasModuleAccess(organizer_id, "certificates"),
  ]);
  const ev = `/organizer/${organizer_id}/events/${eventId}`;
  const tabs = [
    { label: "Overview", value: "overview", href: ev },
    ...(takesRegistrations
      ? [{ label: "Attendees", value: "attendees", href: `${ev}/attendees` }]
      : []),
    { label: "Team", value: "staff", href: `${ev}/staff` },
    { label: "Access", value: "access", href: `${ev}/access` },
    { label: "Agenda", value: "agenda", href: `${ev}/agenda` },
    { label: "Speakers", value: "speakers", href: `${ev}/speakers` },
    { label: "Vendors", value: "vendors", href: `${ev}/vendors` },
    { label: "Sponsors", value: "sponsors", href: `${ev}/sponsors` },
    { label: "Expenses", value: "expenses", href: `${ev}/expenses` },
    ...(hackathon
      ? [
          { label: "Competitions", value: "competitions", href: `${ev}/competitions` },
          { label: "Phases & Tasks", value: "tasks", href: `${ev}/tasks` },
          { label: "Competitors", value: "teams", href: `${ev}/teams` },
          { label: "Submissions", value: "submissions", href: `${ev}/submissions` },
          { label: "Scoreboard", value: "scoreboard", href: `${ev}/scoreboard` },
          { label: "Settings", value: "settings", href: `${ev}/settings` },
        ]
      : []),
    ...(certsOk
      ? [{ label: "Certificates", value: "certificates", href: `${ev}/certificates` }]
      : []),
    { label: "Exports", value: "exports", href: `${ev}/exports` },
  ];
  const visibleTabs = tabs.filter((tab) => tabAllowedByGrant(grant, tab.value));
  const currentTab = eventTabFromPath(pathname, eventId);
  // Only staff grants may hide tabs; owners and non-staff keep full access.
  // Missing tab grant → overview (not a hard 404) so broken links stay usable.
  if (
    pathname &&
    grant.isStaff &&
    !tabAllowedByGrant(grant, currentTab) &&
    currentTab !== "overview"
  ) {
    redirect(ev);
  }

  // The event's identity lives here rather than in each of the six sections: they all
  // describe the same event, and when the tabs sat ABOVE the title they read as global
  // chrome — a peer of the sidebar rather than something scoped to this event. Order is
  // now where-you-are, what-you-are-looking-at, which-part-of-it.
  // The page padding lives here rather than in each of the six sections, and the
  // grey second surface is gone: every other screen in the product sits directly
  // on the canvas, so the event sections looked like a different app.
  return (
    <div className="px-4 py-5 sm:px-6 lg:px-8">
      <header className="mb-5 border-b border-line">
        <nav aria-label="Breadcrumb" className="mb-2">
          <ol className="flex items-center gap-1 text-xs text-ink-soft">
            <li>
              <Link
                href={eventsListHref}
                className="rounded-xs hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                Events
              </Link>
            </li>
            <li aria-hidden="true" suppressHydrationWarning>
              <ChevronRight className="h-3 w-3" />
            </li>
            <li className="truncate text-ink">{event?.title ?? "Event"}</li>
          </ol>
        </nav>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {event ? (
            <div className="shrink-0" suppressHydrationWarning>
              <EventHeaderMedia
                banner={event.bannerImage}
                gallery={event.galleryImages}
                title={event.title}
              />
            </div>
          ) : null}
          <h1 className="font-display text-3xl tracking-tight text-ink sm:text-4xl">
            {event?.title ?? "Event"}
          </h1>
          {/* Derived, not stored. event.status is written once at creation and
                        never updated, so a finished event would sit here reading
                        "Published" indefinitely. */}
          {event ? (
            <span suppressHydrationWarning>
              <StatusBadge
                status={eventLifecycle(event.status, event.schedule)}
                size="sm"
                marker="dot"
              />
            </span>
          ) : null}
          {event && grant.isOwner ? (
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Link
                href={`/organizer/${organizer_id}/events/${eventId}/edit`}
                className={buttonClass("secondary", "sm")}
              >
                Edit event
              </Link>
              <ArchiveEventForm
                eventId={eventId}
                organizerId={organizer_id}
                title={event.title}
                returnTo={eventsListHref}
                archived={String(event.status).toLowerCase() === "archived"}
              />
              <DeleteEventForm
                eventId={eventId}
                organizerId={organizer_id}
                title={event.title}
                returnTo={eventsListHref}
              />
            </div>
          ) : null}
        </div>

        <EventsTab tabs={visibleTabs} />
      </header>

      <div className="min-w-0">{children}</div>
    </div>
  );
}
