import Link from "next/link";
import { Building2, CalendarDays, Users } from "lucide-react";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { MetricTile } from "@/src/shared_components/ui/MetricTile";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { buttonClass } from "@/src/lib/ui";
import { resolveDepartment, getDepartmentPlan, listClubOverviews, listScopedEvents } from "@/src/features/department/department.service";
import { PlanStatusBanner } from "@/src/features/department/components/PlanStatusBanner";

export const metadata = { title: "Department — Avoeline" };

export default async function DepartmentDashboardPage({
    searchParams,
}: {
    searchParams: Promise<{ orgId?: string; e?: string; ok?: string; missing?: string }>;
}) {
    const sp = await searchParams;
    if (sp.missing) {
        return (
            <EmptyState
                icon={<Building2 className="h-8 w-8" />}
                title="No department assigned"
                description="A platform owner must create this department under Tenant accounts."
            />
        );
    }

    const { user, department } = await resolveDepartment(sp.orgId);
    const [plan, clubs, events] = await Promise.all([
        getDepartmentPlan(department.id),
        listClubOverviews(department.id),
        listScopedEvents(department.id, user.userId),
    ]);
    const ownEvents = events.filter((e) => e.source === "department").length;
    const clubEvents = events.filter((e) => e.source === "club").length;

    return (
        <div className="mx-auto max-w-6xl space-y-8">
            <PageHeader
                title={department.name}
                description="Your department workspace. Create department events, oversee clubs as read-only, and grant plan features to presidents."
                actions={
                    <Link href={`/organizer/${user.userId}/events/create`} className={buttonClass()}>
                        New department event
                    </Link>
                }
            />
            <FormFeedback error={sp.e} success={sp.ok} />
            <PlanStatusBanner plan={plan} audience="department" />
            <section className="grid grid-cols-2 gap-y-8 border-y border-line py-8 sm:grid-cols-4 sm:divide-x sm:divide-line">
                <MetricTile label="Clubs" value={`${clubs.length}`} icon={<Building2 className="h-4 w-4" />} />
                <MetricTile label="Presidents" value={`${clubs.filter((c) => c.ownerUid).length}`} icon={<Users className="h-4 w-4" />} />
                <MetricTile label="Department events" value={`${ownEvents}`} icon={<CalendarDays className="h-4 w-4" />} />
                <MetricTile label="Club events" value={`${clubEvents}`} sublabel="Read-only" />
            </section>
            <div className="flex flex-wrap gap-3 text-sm">
                <Link href="/department/clubs" className="font-medium text-ink hover:underline">
                    Manage clubs →
                </Link>
                <Link href="/department/events" className="font-medium text-ink hover:underline">
                    View events →
                </Link>
                <Link href="/department/requests" className="font-medium text-ink hover:underline">
                    Club requests →
                </Link>
            </div>
        </div>
    );
}
