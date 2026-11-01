import Link from "next/link";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { MetricTile } from "@/src/shared_components/ui/MetricTile";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import {
  listClubOverviews,
  listScopedEvents,
  listTenuresForOrg,
  resolveDepartment,
} from "@/src/features/department/department.service";

export const metadata = { title: "Department analytics — Avoeline" };

export default async function DepartmentAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ orgId?: string; tenure?: string }>;
}) {
  const { orgId, tenure: tenureFilter } = await searchParams;
  const { user, department } = await resolveDepartment(orgId);
  const [clubs, events] = await Promise.all([
    listClubOverviews(department.id),
    listScopedEvents(department.id, user.userId),
  ]);

  // Collect tenure options across clubs (current first).
  const tenureLists = await Promise.all(clubs.map((c) => listTenuresForOrg(c.id)));
  const tenureOptions: { id: string; label: string; isCurrent: boolean; clubName: string }[] = [];
  clubs.forEach((c, i) => {
    for (const t of tenureLists[i] ?? []) {
      tenureOptions.push({
        id: t.id,
        label: `${c.name}: ${t.label}`,
        isCurrent: t.isCurrent,
        clubName: c.name,
      });
    }
  });
  tenureOptions.sort((a, b) => Number(b.isCurrent) - Number(a.isCurrent));

  const activeTenure =
    tenureFilter && tenureOptions.some((t) => t.id === tenureFilter) ? tenureFilter : "all";

  let filteredEvents = events;
  if (activeTenure !== "all") {
    filteredEvents = events.filter((e) => e.tenureId === activeTenure);
  }

  // Team count for selected tenure
  let teamCount = clubs.reduce((n, c) => n + c.teamCount, 0);
  if (activeTenure !== "all") {
    const { count } = await supabaseAdmin
      .from(TABLES.TEAMS)
      .select("id", { count: "exact", head: true })
      .eq("tenure_id", activeTenure)
      .eq("context_type", "club_committee");
    teamCount = count ?? 0;
  }

  const q = orgId ? `orgId=${encodeURIComponent(orgId)}&` : "";

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeader
        title="Analytics"
        description={`Read-only rollup for ${department.name} and its clubs.`}
      />

      <div className="flex flex-wrap gap-2 text-sm">
        <Link
          href={`/department/analytics?${q}tenure=all`}
          className={
            activeTenure === "all"
              ? "rounded-md bg-muted px-3 py-1.5 font-medium"
              : "rounded-md px-3 py-1.5 text-ink-soft hover:bg-muted"
          }
        >
          All tenures
        </Link>
        {tenureOptions.map((t) => (
          <Link
            key={t.id}
            href={`/department/analytics?${q}tenure=${t.id}`}
            className={
              activeTenure === t.id
                ? "rounded-md bg-muted px-3 py-1.5 font-medium"
                : "rounded-md px-3 py-1.5 text-ink-soft hover:bg-muted"
            }
          >
            {t.label}
            {t.isCurrent ? " (Ongoing)" : ""}
          </Link>
        ))}
      </div>

      <section className="grid grid-cols-2 gap-y-8 border-y border-line py-8 sm:grid-cols-4 sm:divide-x sm:divide-line">
        <MetricTile label="Clubs" value={`${clubs.length}`} />
        <MetricTile label="Teams" value={`${teamCount}`} />
        <MetricTile
          label="Department events"
          value={`${filteredEvents.filter((e) => e.source === "department").length}`}
        />
        <MetricTile
          label="Club events"
          value={`${filteredEvents.filter((e) => e.source === "club").length}`}
        />
      </section>
      <ul className="divide-y divide-line text-sm">
        {clubs.map((c) => (
          <li key={c.id} className="flex flex-wrap justify-between gap-2 py-3">
            <span className="font-medium text-ink">{c.name}</span>
            <span className="text-ink-soft">
              {activeTenure === "all"
                ? `${c.eventCount} events · ${c.teamCount} teams`
                : `${filteredEvents.filter((e) => e.clubId === c.id).length} events in tenure`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
