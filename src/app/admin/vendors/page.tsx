import Link from "next/link";
import { redirect } from "next/navigation";
import { Store } from "lucide-react";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { FilterTabs } from "@/src/shared_components/ui/FilterTabs";
import { SearchField } from "@/src/shared_components/ui/SearchField";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { Card, CardBody } from "@/src/shared_components/ui/Card";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { requireAdminArea } from "@/src/features/admin/guard";
import { canManageArea } from "@/src/features/admin/types";
import { listVendors } from "@/src/features/admin/admin.service";
import { QuickAction } from "@/src/features/admin/components/ModerationForm";
import { setVendorStatus } from "@/src/features/admin/actions/vendors.action";
import { AdminDeleteForm } from "@/src/features/admin/components/AdminCrudForms";
import { deleteVendorAccount } from "@/src/features/admin/actions/tenancy.action";
import { buttonClass } from "@/src/lib/ui";

export default async function AdminVendorsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; e?: string; ok?: string }>;
}) {
  const admin = await requireAdminArea("vendors");
  if (!admin) redirect("/admin/signin?next=/admin/vendors");
  const canManage = canManageArea(admin, "vendors");

  const sp = await searchParams;
  const tab = ["pending", "approved", "rejected", "suspended"].includes(sp.status ?? "")
    ? sp.status!
    : "all";
  const query = (sp.q ?? "").trim().toLowerCase();

  const all = await listVendors();
  const byStatus = tab === "all" ? all : all.filter((v) => v.status === tab);
  const rows = query
    ? byStatus.filter((v) =>
        [v.businessName, v.email, ...v.serviceCategories].some((f) =>
          f.toLowerCase().includes(query),
        ),
      )
    : byStatus;

  const count = (status: string) => all.filter((v) => v.status === status).length;
  const link = (status?: string) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (query) params.set("q", query);
    const s = params.toString();
    return `/admin/vendors${s ? `?${s}` : ""}`;
  };

  const tabs = [
    { label: "All", value: "all", href: link(), count: all.length },
    { label: "Pending", value: "pending", href: link("pending"), count: count("pending") },
    { label: "Approved", value: "approved", href: link("approved"), count: count("approved") },
    { label: "Rejected", value: "rejected", href: link("rejected"), count: count("rejected") },
    { label: "Suspended", value: "suspended", href: link("suspended"), count: count("suspended") },
  ];

  return (
    <>
      <PageHeader
        title="Vendors"
        description="Approve, suspend, or reinstate vendors. Status actions live on the detail page."
      />
      <FormFeedback error={sp.e} success={sp.ok} />

      <div className="mb-6">
        <SearchField
          action="/admin/vendors"
          placeholder="Search by business, email or category"
          defaultValue={query}
          keep={{ status: tab === "all" ? undefined : tab }}
          label="Search vendors"
        />
      </div>

      <FilterTabs tabs={tabs} activeValue={tab} label="Vendor approval filters" />

      <div className="mt-6">
        {rows.length === 0 ? (
          <EmptyState
            size="sm"
            icon={<Store className="h-5 w-5" />}
            title={query ? "No vendor matches that" : "No vendors here"}
            description={
              query
                ? "Try part of a business name or a category."
                : "Applications appear as vendors sign up."
            }
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((row) => (
              <li key={row.vendorId}>
                <Card tone="flat" className="h-full">
                  <CardBody className="flex h-full flex-col gap-4">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{row.businessName}</p>
                      <p className="mt-0.5 truncate text-sm text-ink-soft">
                        {row.email || "no email on file"}
                      </p>
                      {row.serviceCategories.length > 0 ? (
                        <p className="mt-1 truncate text-xs text-ink-faint">
                          {row.serviceCategories.join(", ")}
                        </p>
                      ) : null}
                    </div>

                    <div>
                      <p className="text-2xs uppercase text-ink-faint">Status</p>
                      <div className="mt-1">
                        <StatusBadge status={row.status} size="sm" />
                      </div>
                    </div>

                    <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-line pt-4">
                      <Link
                        href={`/admin/vendors/${row.vendorId}`}
                        className={buttonClass("secondary", "sm")}
                      >
                        Open
                      </Link>
                      {canManage && row.status === "pending" ? (
                        <QuickAction
                          action={setVendorStatus}
                          hidden={{ vendorDocId: row.vendorId, status: "approved" }}
                          label="Approve"
                          className={buttonClass("primary", "sm")}
                        />
                      ) : null}
                      {admin.isOwner ? (
                        <AdminDeleteForm
                          action={deleteVendorAccount}
                          hidden={{ vendorId: row.vendorId }}
                          label="Delete"
                          title={`Delete ${row.businessName}?`}
                          description="Removes the vendor profile and their Supabase Auth login."
                        />
                      ) : null}
                    </div>
                  </CardBody>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
