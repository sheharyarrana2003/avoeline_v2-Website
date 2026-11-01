import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdminArea } from "@/src/features/admin/guard";
import { parseTenantBoardFilters } from "@/src/features/saas/tenantBoard.filters";
import { getTenantBoardBundle } from "@/src/features/saas/tenantBoard.service";
import { AdminTenantsBoard } from "@/src/features/saas/components/tenants/AdminTenantsBoard";

export const metadata: Metadata = {
  title: "Tenant accounts · Admin",
};

/**
 * Platform admin tenant board — Tenants / Approvals / Overrides / Pricing / Activity.
 * Thin route: auth + URL filters + bundle; UI is client.
 */
export default async function AdminTenantsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const admin = await requireAdminArea("tenants");
  if (!admin) redirect("/admin/signin?next=/admin/tenants");

  const sp = await searchParams;
  const filters = parseTenantBoardFilters(sp);
  const bundle = await getTenantBoardBundle(filters, admin);

  return <AdminTenantsBoard bundle={bundle} />;
}
