import Link from "next/link";
import { notFound } from "next/navigation";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { Card, CardBody } from "@/src/shared_components/ui/Card";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { formatDateMedium } from "@/src/lib/datetime";
import { resolveDepartment } from "@/src/features/department/department.service";
import { getAnnouncementWithDeliveries } from "@/src/features/department/announcements.service";

export default async function AnnouncementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bundle = await getAnnouncementWithDeliveries(id);
  if (!bundle) notFound();

  const deptId = bundle.announcement.department_id || bundle.announcement.org_id;
  if (!deptId) notFound();
  await resolveDepartment(deptId);

  const deliveries = bundle.deliveries;
  const sent = deliveries.filter((d) => d.status === "sent").length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <p className="text-sm">
        <Link href="/department/announcements" className="text-ink-soft hover:underline">
          ← Announcements
        </Link>
      </p>
      <PageHeader
        title={bundle.announcement.title}
        description={`Sent to ${sent} delivery row${sent === 1 ? "" : "s"} · ${bundle.announcement.audience || ""}`}
      />
      <Card>
        <CardBody>
          <p className="whitespace-pre-line text-sm text-ink">{bundle.announcement.body}</p>
          <p className="mt-3 text-2xs uppercase text-ink-faint">
            {formatDateMedium(bundle.announcement.created_at)}
          </p>
        </CardBody>
      </Card>

      <details className="rounded-xl border border-line bg-paper open:pb-2">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-ink">
          Delivery log ({deliveries.length})
        </summary>
        <ul className="divide-y divide-line border-t border-line px-4 text-sm">
          {deliveries.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span>
                {d.display_name || "—"} · {d.email || "no email"} · {d.channel}
              </span>
              <span className="flex items-center gap-2">
                <StatusBadge status={d.status} size="sm" />
                <span className="text-2xs text-ink-faint">
                  {d.sent_at ? formatDateMedium(d.sent_at) : ""}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
