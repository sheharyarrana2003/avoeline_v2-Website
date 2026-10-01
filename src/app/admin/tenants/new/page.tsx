import { requireAdminArea } from "@/src/features/admin/guard";
import { redirect } from "next/navigation";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { createTenantAccount } from "@/src/features/saas/actions/tenants.action";
import { listPlans } from "@/src/features/saas/saas.service";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import { buttonClass } from "@/src/lib/ui";

export default async function NewTenantPage({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const admin = await requireAdminArea("tenants");
  if (!admin) redirect("/admin/signin?next=/admin/tenants/new");

  const [{ e }, plans] = await Promise.all([searchParams, listPlans({ activeOnly: true })]);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <PageHeader
        title="Create tenant account"
        description="They sign in at /auth/signin with this email and must set a new password on first sign-in."
      />
      {e ? <p className="rounded-lg border border-danger-line bg-danger-soft px-4 py-3 text-sm text-danger">{e}</p> : null}
      <Card>
        <CardBody>
          <form action={createTenantAccount} className="space-y-4">
            <Input id="tenant-name" name="name" label="Name" required helperText="Department, organizer, or business name." />
            <Input id="tenant-email" name="email" type="email" label="Email" required />
            <Select
              id="tenant-type"
              name="tenantType"
              label="Type"
              required
              options={[
                { value: "department", label: "Department (manages clubs)" },
                { value: "organizer", label: "Organizer" },
                { value: "vendor", label: "Vendor" },
              ]}
            />
            <Select
              id="tenant-plan"
              name="planKey"
              label="Plan (organizers and departments)"
              options={plans.map((p) => ({ value: p.key, label: p.name }))}
            />
            <Input
              id="tenant-password"
              name="password"
              type="text"
              autoComplete="off"
              label="Temporary password (optional)"
              helperText="Leave blank to generate one. Either way it is emailed to them."
            />
            <SubmitButton className={buttonClass()} pendingText="Creating…">Create account</SubmitButton>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
