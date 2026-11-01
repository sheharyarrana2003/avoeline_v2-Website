import { notFound, redirect } from "next/navigation";
import { requireAdminArea } from "@/src/features/admin/guard";
import { getAdminOrg } from "@/src/features/admin/orgDetail.service";

/**
 * Legacy `/admin/orgs/[orgId]` — redirect to department or club detail.
 * Club pages are read-only (no committee creator).
 */
export default async function AdminOrgDetailRedirectPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const admin = await requireAdminArea("orgs");
  if (!admin) redirect("/admin/signin?next=/admin/orgs");

  const { orgId } = await params;
  const org = await getAdminOrg(orgId);
  if (!org) notFound();

  if (org.orgType === "club") redirect(`/admin/clubs/${org.id}`);
  redirect(`/admin/departments/${org.id}`);
}
