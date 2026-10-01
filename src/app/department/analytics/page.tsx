import PageHeader from "@/src/shared_components/ui/PageHeader";
import { MetricTile } from "@/src/shared_components/ui/MetricTile";
import { listClubOverviews, listScopedEvents, resolveDepartment } from "@/src/features/department/department.service";

export const metadata = { title: "Department analytics — Avoeline" };

export default async function DepartmentAnalyticsPage({
    searchParams,
}: {
    searchParams: Promise<{ orgId?: string }>;
}) {
    const { orgId } = await searchParams;
    const { user, department } = await resolveDepartment(orgId);
    const [clubs, events] = await Promise.all([
        listClubOverviews(department.id),
        listScopedEvents(department.id, user.userId),
    ]);

    return (
        <div className="mx-auto max-w-6xl space-y-8">
            <PageHeader title="Analytics" description={`Read-only rollup for ${department.name} and its clubs.`} />
            <section className="grid grid-cols-2 gap-y-8 border-y border-line py-8 sm:grid-cols-4 sm:divide-x sm:divide-line">
                <MetricTile label="Clubs" value={`${clubs.length}`} />
                <MetricTile label="Teams" value={`${clubs.reduce((n, c) => n + c.teamCount, 0)}`} />
                <MetricTile label="Department events" value={`${events.filter((e) => e.source === "department").length}`} />
                <MetricTile label="Club events" value={`${events.filter((e) => e.source === "club").length}`} />
            </section>
            <ul className="divide-y divide-line text-sm">
                {clubs.map((c) => (
                    <li key={c.id} className="flex flex-wrap justify-between gap-2 py-3">
                        <span className="font-medium text-ink">{c.name}</span>
                        <span className="text-ink-soft">
                            {c.eventCount} events · {c.teamCount} teams
                        </span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
