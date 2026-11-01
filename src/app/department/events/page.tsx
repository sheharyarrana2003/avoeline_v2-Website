import Link from "next/link";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { FilterTabs } from "@/src/shared_components/ui/FilterTabs";
import { buttonClass } from "@/src/lib/ui";
import { ScopedEventsTable } from "@/src/features/events/components/ScopedEventsTable";
import {
  listClubOverviews,
  listScopedEvents,
  resolveDepartment,
} from "@/src/features/department/department.service";

export const metadata = { title: "Department events — Avoeline" };

export default async function DepartmentEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ orgId?: string; scope?: string }>;
}) {
  const { orgId, scope: rawScope } = await searchParams;
  const { user, department } = await resolveDepartment(orgId);
  const clubs = await listClubOverviews(department.id);
  const scope =
    rawScope === "department" || clubs.some((c) => c.id === rawScope)
      ? (rawScope as string)
      : "all";

  const events = await listScopedEvents(department.id, user.userId, scope);
  const q = orgId ? `orgId=${encodeURIComponent(orgId)}&` : "";

  const tabs = [
    {
      label: "All",
      value: "all",
      href: `/department/events?${q}scope=all`,
      count: undefined as number | undefined,
    },
    { label: "Department", value: "department", href: `/department/events?${q}scope=department` },
    ...clubs.map((c) => ({
      label: c.name,
      value: c.id,
      href: `/department/events?${q}scope=${c.id}`,
    })),
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Events"
        description="Department events and every club event. Open a row for the public page (status banner when closed)."
        actions={
          <Link href={`/organizer/${user.userId}/events/create`} className={buttonClass()}>
            New department event
          </Link>
        }
      />
      <FilterTabs tabs={tabs} activeValue={scope} label="Event scope" />
      <ScopedEventsTable rows={events} manageBase={`/organizer/${user.userId}`} />
    </div>
  );
}
