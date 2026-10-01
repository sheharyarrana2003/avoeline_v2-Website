import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { Card, CardBody } from "@/src/shared_components/ui/Card";
import { requireAdminArea } from "@/src/features/admin/guard";
import { listAdmins } from "@/src/features/admin/admin.service";
import { AdminRow, CreateAdminForm } from "@/src/features/admin/components/AdminForms";
import { createAdmin, revokeAdmin, setAdminPermissions } from "@/src/features/admin/actions/admins.action";

/**
 * Spec 9.1: who the admins are, and what each of them can reach.
 *
 * Owner-only, and "can manage admins" is deliberately NOT one of the tickable
 * areas: anybody holding it could grant themselves the rest, which is the same
 * as having no permissions layer at all.
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
                <strong className="text-ink">What this page is.</strong> SaaS admins only — they sign in at /admin/signin.
                Tenant logins (department, organizer, vendor) are created under Tenant accounts, not here.
            </p>

            <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
                <Card title="Add an admin">
                    <CardBody>
                        <CreateAdminForm action={createAdmin} />
                    </CardBody>
                </Card>

                <Card title={`Admins (${admins.length})`}>
                    <CardBody>
                        {admins.length === 0 ? (
                            <p className="flex items-start gap-2 text-sm text-ink-soft">
                                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                                <span>
                                    No stored admin accounts yet. You are here through the
                                    <code className="mx-1 rounded bg-muted px-1 text-2xs">PLATFORM_ADMIN_EMAILS</code>
                                    bootstrap — add one here, or promote this account from the dashboard.
                                </span>
                            </p>
                        ) : (
                            <div className="divide-y divide-line">
                                {admins.map((row) => (
                                    <AdminRow
                                        key={row.userId}
                                        admin={row}
                                        savePermissions={setAdminPermissions}
                                        revoke={revokeAdmin}
                                    />
                                ))}
                            </div>
                        )}
                    </CardBody>
                </Card>
            </div>
        </>
    );
}
