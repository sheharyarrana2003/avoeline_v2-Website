import Link from "next/link";
import { redirect } from "next/navigation";
import { ScrollText } from "lucide-react";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { Card, CardBody } from "@/src/shared_components/ui/Card";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { formatDateMedium } from "@/src/lib/datetime";
import { AuthService } from "@/src/features/auth/authService";
import { listModerationLog } from "@/src/features/admin/admin.service";
import { canManageArea, holdsArea } from "@/src/features/admin/types";

function detailHref(targetType: string, targetId: string): string | null {
  if (!targetId) return null;
  if (targetType === "event") return `/events/${targetId}`;
  if (targetType === "organizer") return `/admin/organizers/${targetId}`;
  if (targetType === "vendor") return `/admin/vendors/${targetId}`;
  return null;
}

/**
 * Global moderation / audit explorer. Owner always; staff with any
 * moderation-capable view (events, organizers, vendors, orgs, support).
 */
export default async function AdminAuditPage() {
  const admin = await AuthService.requireAdmin();
  if (!admin) redirect("/admin/signin?next=/admin/audit");

  const canView =
    admin.isOwner ||
    holdsArea(admin, "events") ||
    holdsArea(admin, "organizers") ||
    holdsArea(admin, "vendors") ||
    holdsArea(admin, "orgs") ||
    holdsArea(admin, "support");
  if (!canView) redirect("/admin");

  const entries = await listModerationLog();

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Platform moderation actions across events, organizers, and vendors. Per-entity history still lives on each detail page."
      />

      <div className="mt-6 space-y-3">
        {entries.length === 0 ? (
          <EmptyState
            icon={<ScrollText className="h-5 w-5" />}
            title="No moderation actions yet"
            description="Unpublish, suspend, and similar actions appear here with who, what, and why."
          />
        ) : (
          entries.map((row) => {
            const href = detailHref(row.targetType, row.targetId);
            return (
              <Card key={row.id}>
                <CardBody className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">
                      <span className="capitalize">{row.action.replace(/_/g, " ")}</span>
                      {" · "}
                      <span className="capitalize text-ink-soft">{row.targetType}</span>
                      {href ? (
                        <>
                          {" "}
                          <Link href={href} className="text-ink underline">
                            {row.targetLabel || row.targetId}
                          </Link>
                        </>
                      ) : (
                        <> {row.targetLabel || row.targetId}</>
                      )}
                    </p>
                    {row.reason ? <p className="mt-1 text-sm text-ink-soft">{row.reason}</p> : null}
                    <p className="mt-1 text-2xs uppercase text-ink-faint">
                      {row.adminEmail || row.adminId}
                      {row.createdAt ? ` · ${formatDateMedium(row.createdAt)}` : ""}
                    </p>
                  </div>
                  {canManageArea(admin, "events") || admin.isOwner ? (
                    <span className="text-2xs uppercase text-ink-faint">logged</span>
                  ) : null}
                </CardBody>
              </Card>
            );
          })
        )}
      </div>
    </>
  );
}
