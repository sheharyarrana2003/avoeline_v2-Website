import { redirect } from "next/navigation";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { requireAdminArea } from "@/src/features/admin/guard";
import { listAdmins } from "@/src/features/admin/admin.service";
import { PlatformStaffBoard } from "@/src/features/admin/components/AdminForms";
import {
  createAdmin,
  revokeAdmin,
  setAdminPermissions,
} from "@/src/features/admin/actions/admins.action";

/**
 * Spec 9.1: who the admins are, and what each of them can reach.
 *
 * Owner-only. Staff cards open a preview; Add staff is a multi-step flow.
 * "Can manage admins" is deliberately not a tickable area.
 */
export default async function AdminAdminsPage() {
  const admin = await requireAdminArea();
  if (!admin?.isOwner) redirect("/admin");

  const admins = await listAdmins();

  return (
    <>
      <PageHeader
        title="Platform staff"
        description="Who can reach this panel, and which parts of it. A permission change takes effect on their next request."
      />
      <p className="mb-8 rounded-xl border border-line bg-muted px-4 py-3 text-sm text-ink-soft">
        <strong className="text-ink">What this page is.</strong> SaaS admins only — they sign in at
        /admin/signin. Tenant logins (department, organizer, vendor) are created under Tenant
        accounts, not here.
      </p>

      <PlatformStaffBoard
        admins={admins}
        createAdmin={createAdmin}
        savePermissions={setAdminPermissions}
        revoke={revokeAdmin}
      />
    </>
  );
}
