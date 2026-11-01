import Link from "next/link";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { FilterTabs } from "@/src/shared_components/ui/FilterTabs";
import { SearchField } from "@/src/shared_components/ui/SearchField";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { Card, CardBody } from "@/src/shared_components/ui/Card";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import { formatDateMedium } from "@/src/lib/datetime";
import { buttonClass } from "@/src/lib/ui";
import { requireAdminArea } from "@/src/features/admin/guard";
import { listOrganizers } from "@/src/features/admin/admin.service";
import { canManageArea } from "@/src/features/admin/types";
import { setOrganizerReview } from "@/src/features/admin/actions/organizers.action";
import { AdminDeleteForm } from "@/src/features/admin/components/AdminCrudForms";
import { deleteOrganizerAccount } from "@/src/features/admin/actions/tenancy.action";

/**
 * Spec 9.3: every organizer, with signup date, plan and account status.
 * Card grid primary layout; filters and search stay on the query string.
 */
export default async function AdminOrganizersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; e?: string; ok?: string }>;
}) {
  const admin = await requireAdminArea("organizers");
  if (!admin) redirect("/admin/signin?next=/admin/organizers");
  const canManage = canManageArea(admin, "organizers");

  const sp = await searchParams;
  const tab = sp.status === "suspended" || sp.status === "active" ? sp.status : "all";
  const query = (sp.q ?? "").trim();

  const all = await listOrganizers();
  const byStatus =
    tab === "all"
      ? all
      : all.filter((o) =>
          tab === "suspended" ? o.accountStatus !== "active" : o.accountStatus === "active",
        );
  const rows = query
    ? byStatus.filter((o) =>
        [o.name, o.email].some((field) => field.toLowerCase().includes(query.toLowerCase())),
      )
    : byStatus;

  const suspendedCount = all.filter((o) => o.accountStatus !== "active").length;
  const tabs = [
    {
      label: "All",
      value: "all",
      href: `/admin/organizers${query ? `?q=${encodeURIComponent(query)}` : ""}`,
      count: all.length,
    },
    {
      label: "Active",
      value: "active",
      href: `/admin/organizers?status=active${query ? `&q=${encodeURIComponent(query)}` : ""}`,
      count: all.length - suspendedCount,
    },
    {
      label: "Suspended",
      value: "suspended",
      href: `/admin/organizers?status=suspended${query ? `&q=${encodeURIComponent(query)}` : ""}`,
      count: suspendedCount,
    },
  ];

  return (
    <>
      <PageHeader
        title="Organizers"
        description="Edit name or plan on the detail page. Owners can delete an organizer and their Auth login."
      />
      <FormFeedback error={sp.e} success={sp.ok} />

      <div className="mb-6">
        <SearchField
          action="/admin/organizers"
          placeholder="Search by name or email"
          defaultValue={query}
          keep={{ status: tab === "all" ? undefined : tab }}
          label="Search organizers"
        />
      </div>

      <FilterTabs tabs={tabs} activeValue={tab} label="Organizer account filters" />

      <div className="mt-6">
        {rows.length === 0 ? (
          <EmptyState
            size="sm"
            icon={<Users className="h-5 w-5" />}
            title={query ? "No organizer matches that" : "No organizers yet"}
            description={
              query
                ? "Try part of a name or email address."
                : "Accounts appear here as people sign up."
            }
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((row) => {
              const pendingReview = row.reviewStatus === "pending";
              return (
                <li key={row.organizerId}>
                  <Card tone="flat" className="h-full">
                    <CardBody className="flex h-full flex-col gap-4">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink">{row.name}</p>
                        <p className="mt-0.5 truncate text-sm text-ink-soft">
                          {row.email || "no email on file"}
                        </p>
                      </div>

                      <dl className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <dt className="text-2xs uppercase text-ink-faint">Plan</dt>
                          <dd className="mt-0.5 text-ink">{row.planType || "free"}</dd>
                        </div>
                        <div>
                          <dt className="text-2xs uppercase text-ink-faint">Status</dt>
                          <dd className="mt-0.5">
                            <StatusBadge status={row.accountStatus} size="sm" />
                          </dd>
                        </div>
                        <div className="col-span-2">
                          <dt className="text-2xs uppercase text-ink-faint">Joined</dt>
                          <dd className="mt-0.5 text-ink">
                            {row.signedUpAt ? formatDateMedium(row.signedUpAt) : "—"}
                          </dd>
                        </div>
                      </dl>

                      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-line pt-4">
                        <Link
                          href={`/admin/organizers/${row.organizerId}`}
                          className={buttonClass("secondary", "sm")}
                        >
                          Open
                        </Link>
                        {canManage && pendingReview ? (
                          <form action={setOrganizerReview} className="flex flex-wrap gap-2">
                            <input type="hidden" name="organizerId" value={row.organizerId} />
                            <SubmitButton
                              name="action"
                              value="approve"
                              pendingText="…"
                              className={buttonClass("primary", "sm")}
                            >
                              Approve
                            </SubmitButton>
                            <SubmitButton
                              name="action"
                              value="reject"
                              pendingText="…"
                              className={buttonClass("destructive", "sm")}
                            >
                              Reject
                            </SubmitButton>
                          </form>
                        ) : null}
                        {admin.isOwner ? (
                          <AdminDeleteForm
                            action={deleteOrganizerAccount}
                            hidden={{ organizerId: row.organizerId }}
                            label="Delete"
                            title={`Delete ${row.name}?`}
                            description="Removes their events, profile, and Supabase Auth login. This cannot be undone."
                          />
                        ) : null}
                      </div>
                    </CardBody>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
