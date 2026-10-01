import Link from "next/link";
import { redirect } from "next/navigation";
import { Store } from "lucide-react";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { DataTable, CellStack, type Column } from "@/src/shared_components/ui/DataTable";
import { FilterTabs } from "@/src/shared_components/ui/FilterTabs";
import { SearchField } from "@/src/shared_components/ui/SearchField";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import StarRating from "@/src/shared_components/ui/StarRating";
import { requireAdminArea } from "@/src/features/admin/guard";
import { listVendors } from "@/src/features/admin/admin.service";
import { QuickAction } from "@/src/features/admin/components/ModerationForm";
import { setVendorStatus } from "@/src/features/admin/actions/vendors.action";
import type { VendorRow } from "@/src/features/admin/types";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { AdminDeleteForm } from "@/src/features/admin/components/AdminCrudForms";
import { deleteVendorAccount } from "@/src/features/admin/actions/tenancy.action";

/**
 * Spec 9.6: every vendor with their approval status, and the decision itself.
 *
 * Approving is one click; rejecting and suspending ask for a reason and live on
 * the vendor's own page, because those are the ones somebody will query later.
 */
export default async function AdminVendorsPage({
    searchParams,
}: {
    searchParams: Promise<{ status?: string; q?: string; e?: string; ok?: string }>;
}) {
    const admin = await requireAdminArea("vendors");
    if (!admin) redirect("/admin/signin?next=/admin/vendors");

    const sp = await searchParams;
    const tab = ["pending", "active", "rejected", "suspended"].includes(sp.status ?? "") ? sp.status! : "all";
    const query = (sp.q ?? "").trim().toLowerCase();

    const all = await listVendors();
    const byStatus = tab === "all" ? all : all.filter((v) => v.status === tab);
    const rows = query
        ? byStatus.filter((v) =>
              [v.businessName, v.email, ...v.serviceCategories].some((f) => f.toLowerCase().includes(query)),
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
        { label: "Approved", value: "active", href: link("active"), count: count("active") },
        { label: "Rejected", value: "rejected", href: link("rejected"), count: count("rejected") },
        { label: "Suspended", value: "suspended", href: link("suspended"), count: count("suspended") },
    ];

    const columns: Column<VendorRow>[] = [
        {
            key: "vendor",
            header: "Vendor",
            cell: (row) => (
                <CellStack
                    primary={
                        <Link href={`/admin/vendors/${row.vendorId}`} className="font-medium text-ink hover:underline">
                            {row.businessName}
                        </Link>
                    }
                    secondary={row.serviceCategories.join(", ") || "no categories listed"}
                />
            ),
        },
        {
            key: "rating",
            header: "Rating",
            cell: (row) =>
                row.totalReviews ? (
                    <span className="flex items-center gap-2">
                        <StarRating rating={row.averageRating} size="sm" />
                        <span className="text-xs text-ink-soft tabular-nums">({row.totalReviews})</span>
                    </span>
                ) : (
                    <span className="text-xs text-ink-soft">no reviews</span>
                ),
        },
        { key: "status", header: "Approval", cell: (row) => <StatusBadge status={row.status} size="sm" /> },
        {
            key: "act",
            header: "Decide",
            align: "right",
            cell: (row) => (
                <div className="flex items-center justify-end gap-3">
                    {row.status === "active" ? (
                        <Link href={`/admin/vendors/${row.vendorId}`} className="text-2xs uppercase text-ink-faint hover:text-ink">
                            Edit
                        </Link>
                    ) : (
                        <QuickAction
                            action={setVendorStatus}
                            hidden={{ vendorDocId: row.vendorId, status: "active" }}
                            label={row.status === "pending" ? "Approve" : "Reinstate"}
                            className="inline-flex h-8 items-center rounded-lg border border-ink bg-ink px-3 text-xs font-semibold text-ink-invert hover:bg-ink-soft"
                        />
                    )}
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
            ),
        },
    ];

    return (
        <>
            <PageHeader
                title="Vendors"
                description="Approve, edit, or (owner) delete a vendor including their Auth login."
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
                <DataTable
                    caption={`${rows.length} vendor${rows.length === 1 ? "" : "s"}`}
                    rows={rows}
                    columns={columns}
                    getKey={(row) => row.vendorId}
                    empty={
                        <EmptyState
                            size="sm"
                            icon={<Store className="h-5 w-5" />}
                            title={query ? "No vendor matches that" : "No vendors here"}
                            description={query ? "Try part of a business name or a category." : "Applications appear as vendors sign up."}
                        />
                    }
                />
            </div>
        </>
    );
}
