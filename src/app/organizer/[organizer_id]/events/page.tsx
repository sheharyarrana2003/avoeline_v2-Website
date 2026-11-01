import Image from "next/image";
import Link from "next/link";
import { CalendarPlus, Eye, Plus, Settings2 } from "lucide-react";
import { EventService } from "@/src/services/event.service";
import { EventModel } from "@/src/services/models/event.model";
import { eventLifecycle } from "@/src/lib/eventState";
import { formatDate, formatTime, parseScheduleDateTime, toDate } from "@/src/lib/datetime";
import { formatCurrency } from "@/src/lib/money";
import { buttonClass } from "@/src/lib/ui";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { Breadcrumbs } from "@/src/shared_components/ui/Breadcrumbs";
import { EventThumb } from "@/src/shared_components/ui/EventThumb";
import { DataTable, CellStack, type Column } from "@/src/shared_components/ui/DataTable";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { AuthService } from "@/src/features/auth/authService";
import {
  isHackathon,
  listHackathonEventIdsForOrganizer,
} from "@/src/features/hackathon/hackathon.service";
import { getOrganizerEventOccupancyTallies } from "@/src/features/events/organizerEvents.stats";
import {
  ORGANIZER_EVENTS_PAGE_SIZE,
  countOrganizerEventStatuses,
  filterOrganizerEvents,
  liveAndArchivedCounts,
  organizerEventsHref,
  paginateOrganizerEvents,
  parseOrganizerEventFilters,
  sortOrganizerEvents,
  type OrganizerEventFilters,
  type OrganizerEventListItem,
} from "@/src/features/events/organizerEvents.filters";
import { OrganizerEventsToolbar } from "@/src/features/events/components/OrganizerEventsToolbar";
import { OrganizerEventRowMenu } from "@/src/features/events/components/OrganizerEventRowMenu";
import type { EventOccupancyTally } from "@/src/features/events/organizerEvents.occupancy";

function RegOccupancy({
  occupied,
  capacity,
  label,
}: {
  occupied: number;
  capacity: number;
  label: string;
}) {
  const safeMax = capacity > 0 ? capacity : 0;
  const percent = safeMax === 0 ? 0 : Math.min(100, Math.round((occupied / safeMax) * 100));
  return (
    <div className="min-w-[5.5rem]">
      <div className="text-sm tabular-nums text-ink">
        {occupied}
        {safeMax > 0 ? <span className="text-ink-faint"> / {safeMax}</span> : null}
      </div>
      {safeMax > 0 ? (
        <div
          role="progressbar"
          aria-valuenow={occupied}
          aria-valuemin={0}
          aria-valuemax={safeMax}
          aria-label={label}
          className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted"
        >
          <div className="h-full rounded-full bg-ink/70" style={{ width: `${percent}%` }} />
        </div>
      ) : null}
    </div>
  );
}

function Pagination({
  basePath,
  filters,
  page,
  totalPages,
  total,
}: {
  basePath: string;
  filters: OrganizerEventFilters;
  page: number;
  totalPages: number;
  total: number;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav
      aria-label="Events pagination"
      className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line px-1 pt-4 text-sm text-ink-soft"
    >
      <p>
        Page {page} of {totalPages}
        <span className="text-ink-faint"> · {total} events</span>
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link
            href={organizerEventsHref(basePath, filters, { page: page - 1 })}
            className={buttonClass("secondary", "sm")}
          >
            Previous
          </Link>
        ) : null}
        {page < totalPages ? (
          <Link
            href={organizerEventsHref(basePath, filters, { page: page + 1 })}
            className={buttonClass("secondary", "sm")}
          >
            Next
          </Link>
        ) : null}
      </div>
    </nav>
  );
}

export default async function MyEventsPage({
  params,
  searchParams,
}: {
  params: Promise<{ organizer_id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedParams = await searchParams;
  const filters = parseOrganizerEventFilters(resolvedParams);
  const organizer_id: string = (await params).organizer_id;
  const base_address = `/organizer/${organizer_id}`;
  const eventsPath = `${base_address}/events`;
  const returnTo = organizerEventsHref(eventsPath, filters);

  const currentUser = await AuthService.getCurrentUser();
  const isPlatformAdmin =
    currentUser?.role === "platform_admin" || currentUser?.userType === "admin";
  const isSelf = currentUser?.userId === organizer_id;
  const isManagedOrg =
    currentUser?.role === "department_admin" &&
    (currentUser?.orgId === organizer_id || currentUser?.managedOrgIds?.includes(organizer_id));

  if (!isPlatformAdmin && !isSelf && !isManagedOrg) {
    const { redirect } = await import("next/navigation");
    redirect("/access-denied?reason=unauthorized_organizer");
  }

  const [organizerEvents, trackEventIds] = await Promise.all([
    EventService.getAllEventsByOrganizer(organizer_id) as Promise<EventModel[]>,
    listHackathonEventIdsForOrganizer(organizer_id),
  ]);

  const occupancy = await getOrganizerEventOccupancyTallies(
    organizer_id,
    organizerEvents,
    trackEventIds,
  );
  const tallyFor = (id: string): EventOccupancyTally =>
    occupancy.get(id) ?? { registrations: 0, checkedIn: 0, revenue: 0, people: 0 };

  const now = new Date();
  const listItems: OrganizerEventListItem[] = organizerEvents.map((e) => {
    const start = parseScheduleDateTime(e.schedule?.startDate, e.schedule?.startTime);
    const created = toDate(e.createdAt);
    return {
      id: e.id,
      title: e.title || "Untitled event",
      category: e.category,
      eventType: e.eventType,
      venueName: e.location?.venueName,
      city: e.location?.city,
      isHackathon: isHackathon(e) || trackEventIds.has(e.id),
      lifecycle: eventLifecycle(e.status, e.schedule, now),
      createdAtMs: created?.getTime() ?? 0,
      startAtMs: start?.getTime() ?? null,
      registrations: tallyFor(e.id).registrations,
    };
  });

  const byId = new Map(organizerEvents.map((e) => [e.id, e]));
  const statusCounts = countOrganizerEventStatuses(listItems, filters);
  const { live, archived } = liveAndArchivedCounts(listItems, { kind: filters.kind, q: filters.q });

  const filtered = sortOrganizerEvents(filterOrganizerEvents(listItems, filters), filters.sort);
  const { pageItems, total, page, totalPages } = paginateOrganizerEvents(
    filtered,
    filters.page,
    ORGANIZER_EVENTS_PAGE_SIZE,
  );
  const pageEvents = pageItems
    .map((item) => byId.get(item.id))
    .filter((e): e is EventModel => Boolean(e));

  const lifecycleOf = new Map(listItems.map((i) => [i.id, i.lifecycle]));
  const hasFilters =
    filters.kind !== "all" ||
    filters.status !== "all" ||
    Boolean(filters.q) ||
    filters.sort !== "newest";
  const emptyAll = organizerEvents.length === 0;

  const createHref = `${base_address}/events/create`;
  const createBtn = (
    <Link href={createHref} className={buttonClass("primary", "md")}>
      <Plus size={16} aria-hidden="true" />
      Create New Event
    </Link>
  );

  const columns: Column<EventModel>[] = [
    {
      key: "event",
      header: "Event",
      width: "w-[28%] max-w-0",
      cell: (e) => {
        const hack = isHackathon(e) || trackEventIds.has(e.id);
        return (
          <Link
            href={`${base_address}/events/${e.id}`}
            className="group/row flex items-start gap-3 rounded-xs focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <EventThumb
              title={e.title || "Untitled event"}
              src={e.bannerImage || null}
              size="wide"
              category={e.category}
              showTitle={false}
            />
            <CellStack
              primaryClassName="line-clamp-2 font-medium text-ink group-hover/row:underline"
              primary={e.title || "Untitled event"}
              secondary={
                <span className="flex flex-wrap items-center gap-1.5">
                  <span>{[e.category, e.eventType].filter(Boolean).join(" · ") || "—"}</span>
                  {hack ? (
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-2xs font-medium uppercase text-ink-soft">
                      Hackathon
                    </span>
                  ) : null}
                </span>
              }
            />
          </Link>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      cell: (e) => (
        <div className="flex flex-col gap-1">
          <StatusBadge status={lifecycleOf.get(e.id)} size="sm" />
          {isHackathon(e) || trackEventIds.has(e.id) ? (
            <span className="text-2xs uppercase text-ink-faint">Hackathon</span>
          ) : null}
        </div>
      ),
    },
    {
      key: "date",
      header: "Date",
      cell: (e) => {
        const date = formatDate(e.schedule?.startDate);
        const showTime = date !== "—" && e.schedule?.startTime;
        return (
          <CellStack
            primaryClassName="font-normal tabular-nums text-ink whitespace-normal"
            primary={date}
            secondary={showTime ? formatTime(e.schedule.startTime) : undefined}
          />
        );
      },
    },
    {
      key: "venue",
      header: "Venue",
      width: "w-[14%] max-w-0",
      cell: (e) => {
        const venue = e.location?.venueName;
        return (
          <CellStack
            primaryClassName="font-normal text-ink whitespace-normal break-words"
            primary={venue || e.location?.city || "—"}
            secondary={venue ? e.location?.city : undefined}
          />
        );
      },
    },
    {
      key: "registered",
      header: "Registered",
      cell: (e) => (
        <RegOccupancy
          occupied={tallyFor(e.id).registrations}
          capacity={e.capacity?.totalSeats ?? 0}
          label={`Registered for ${e.title}`}
        />
      ),
    },
    {
      key: "checkedIn",
      header: "Checked in",
      align: "right",
      cell: (e) => {
        const t = tallyFor(e.id);
        return (
          <span className="tabular-nums">
            {t.checkedIn}
            <span className="text-ink-faint"> of {t.registrations}</span>
          </span>
        );
      },
    },
    {
      key: "revenue",
      header: "Revenue",
      align: "right",
      cell: (e) => formatCurrency(tallyFor(e.id).revenue, e.pricing?.currency, "—"),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (e) => (
        <div className="flex items-center justify-end gap-1">
          <Link href={`${base_address}/events/${e.id}`} className={buttonClass("secondary", "sm")}>
            <Settings2 size={14} aria-hidden="true" />
            Manage
          </Link>
          <Link
            href={`/e/${e.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClass("ghost", "sm")}
            aria-label={`Public page for ${e.title}`}
          >
            <Eye size={16} aria-hidden="true" />
          </Link>
          <OrganizerEventRowMenu
            eventId={e.id}
            organizerId={organizer_id}
            title={e.title || "Untitled event"}
            returnTo={returnTo}
            archived={lifecycleOf.get(e.id) === "archived"}
            registrationCount={tallyFor(e.id).registrations}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[100rem]">
        <Breadcrumbs
          items={[{ label: "Dashboard", href: `${base_address}/dashboard` }, { label: "Events" }]}
        />
        <FormFeedback
          error={typeof resolvedParams.e === "string" ? resolvedParams.e : undefined}
          success={typeof resolvedParams.ok === "string" ? resolvedParams.ok : undefined}
        />
        <PageHeader
          title="My Events"
          description={`${live} live · ${archived} archived`}
          actions={createBtn}
        />

        <OrganizerEventsToolbar
          basePath={eventsPath}
          filters={filters}
          statusCounts={statusCounts}
        />

        {pageEvents.length === 0 ? (
          <div className="border border-line py-6">
            <EmptyState
              icon={<CalendarPlus size={32} className="text-primary" />}
              title={
                emptyAll
                  ? "No events yet"
                  : hasFilters || filters.q
                    ? filters.q
                      ? `Nothing matches “${filters.q}”`
                      : "No matching events"
                    : "No events yet"
              }
              description={
                emptyAll
                  ? "Create your first event to start taking registrations."
                  : "Try clearing filters, or create a new event."
              }
              action={createBtn}
            />
          </div>
        ) : filters.view === "grid" ? (
          <>
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {pageEvents.map((e) => {
                const t = tallyFor(e.id);
                const date = formatDate(e.schedule?.startDate);
                const venue = e.location?.venueName || e.location?.city || "—";
                return (
                  <li
                    key={e.id}
                    className="flex flex-col overflow-hidden border border-line bg-paper"
                  >
                    <Link href={`${base_address}/events/${e.id}`} className="block">
                      <div className="relative aspect-[16/9] w-full bg-muted">
                        {e.bannerImage ? (
                          <Image
                            src={e.bannerImage}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 100vw, 33vw"
                          />
                        ) : (
                          <span
                            className="flex h-full w-full items-center justify-center text-2xl font-semibold text-ink-faint"
                            aria-hidden
                          >
                            {(e.title || "?").trim().slice(0, 1).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="space-y-2 p-4">
                        <p className="line-clamp-2 font-medium text-ink">
                          {e.title || "Untitled event"}
                        </p>
                        <StatusBadge status={lifecycleOf.get(e.id)} size="sm" />
                        <p className="text-sm text-ink-soft">{date}</p>
                        <p className="truncate text-sm text-ink-faint">{venue}</p>
                        <p className="text-sm tabular-nums text-ink">
                          {t.registrations}
                          {(e.capacity?.totalSeats ?? 0) > 0 ? (
                            <span className="text-ink-faint"> / {e.capacity.totalSeats}</span>
                          ) : null}{" "}
                          <span className="text-ink-faint">registered</span>
                        </p>
                      </div>
                    </Link>
                    <div className="mt-auto flex items-center justify-end gap-1 border-t border-line px-3 py-2">
                      <Link
                        href={`${base_address}/events/${e.id}`}
                        className={buttonClass("secondary", "sm")}
                      >
                        Manage
                      </Link>
                      <Link
                        href={`/e/${e.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={buttonClass("ghost", "sm")}
                        aria-label={`Public page for ${e.title}`}
                      >
                        <Eye size={16} aria-hidden="true" />
                      </Link>
                      <OrganizerEventRowMenu
                        eventId={e.id}
                        organizerId={organizer_id}
                        title={e.title || "Untitled event"}
                        returnTo={returnTo}
                        archived={lifecycleOf.get(e.id) === "archived"}
                        registrationCount={t.registrations}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
            <Pagination
              basePath={eventsPath}
              filters={{ ...filters, page }}
              page={page}
              totalPages={totalPages}
              total={total}
            />
          </>
        ) : (
          <>
            <div className="overflow-hidden border border-line">
              <DataTable
                caption={filters.status === "all" ? "All events" : `${filters.status} events`}
                rows={pageEvents}
                columns={columns}
                getKey={(e) => e.id}
              />
            </div>
            <Pagination
              basePath={eventsPath}
              filters={{ ...filters, page }}
              page={page}
              totalPages={totalPages}
              total={total}
            />
          </>
        )}
      </div>
    </div>
  );
}
