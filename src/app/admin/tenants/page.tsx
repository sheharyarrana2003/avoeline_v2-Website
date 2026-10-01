import { requireAdminArea } from "@/src/features/admin/guard";
import { redirect } from "next/navigation";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { listFeatureOverrides, listOrganizerPlanRows, listPendingTenants, listPlans } from "@/src/features/saas/saas.service";
import { setTenantVerification } from "@/src/features/saas/actions/tenants.action";
import { changeOrganizerPlan, clearFeatureOverride, grantFeatureOverride, saveCustomPricing } from "@/src/features/saas/actions/subscriptions.action";
import { ALL_MODULE_KEYS, MODULE_LABELS } from "@/src/features/permissions/moduleKeys";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";

export default async function AdminTenantsPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string; emailed?: string; e?: string; ok?: string }>;
}) {
  const admin = await requireAdminArea("tenants");
  if (!admin) redirect("/admin/signin?next=/admin/tenants");

  const [{ created, emailed, e, ok }, { orgs, vendors, organizers }, plans, rows, overrides] = await Promise.all([
    searchParams,
    listPendingTenants(),
    listPlans({ activeOnly: true }),
    listOrganizerPlanRows(),
    listFeatureOverrides(),
  ]);

  return (
    <div className="space-y-10">
      <PageHeader
        title="Tenant accounts"
        description="Logins for department admins, organizers, and vendors. Pick a plan when you create them."
        actions={<Button href="/admin/tenants/new">Create account</Button>}
      />
      <p className="rounded-xl border border-line bg-muted px-4 py-3 text-sm text-ink-soft">
        <strong className="text-ink">What this page is.</strong> Creates (or approves) people who can sign in.
        Departments and clubs as empty folders live under Departments &amp; clubs. Platform staff who use /admin
        live under Platform staff.
      </p>
      {created ? (
        <p className="rounded-lg border border-success-line bg-success-soft px-4 py-3 text-sm text-success">
          Account created for {created}.{" "}
          {emailed === "1"
            ? "The temporary password was emailed."
            : "Email is not configured, so share the temporary password you chose with them directly."}
        </p>
      ) : null}
      <FormFeedback error={e} success={ok} />

      <section className="space-y-3">
        <h2 className="font-display text-xl">Approval queue</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardBody className="space-y-3">
              <h3 className="text-sm font-medium">Departments & clubs</h3>
              {orgs.length === 0 ? <p className="text-sm text-ink-soft">None pending.</p> : null}
              {orgs.map((o) => (
                <form key={o.id} action={setTenantVerification} className="flex items-center justify-between gap-2 border-b border-line py-2 text-sm">
                  <input type="hidden" name="kind" value="org" />
                  <input type="hidden" name="id" value={o.id} />
                  <span>{o.name} <Badge>{o.org_type}</Badge></span>
                  <SubmitButton name="action" value="approve">Approve</SubmitButton>
                </form>
              ))}
            </CardBody>
          </Card>
          <Card>
            <CardBody className="space-y-3">
              <h3 className="text-sm font-medium">Vendors</h3>
              {vendors.length === 0 ? <p className="text-sm text-ink-soft">None pending.</p> : null}
              {vendors.map((v) => (
                <form key={v.user_id} action={setTenantVerification} className="space-y-1 border-b border-line py-2 text-sm">
                  <input type="hidden" name="kind" value="vendor" />
                  <input type="hidden" name="id" value={v.user_id} />
                  <p>{v.business_name}</p>
                  <div className="flex gap-2">
                    <SubmitButton name="action" value="approve">Approve</SubmitButton>
                    <SubmitButton name="action" value="reject">Reject</SubmitButton>
                  </div>
                </form>
              ))}
            </CardBody>
          </Card>
          <Card>
            <CardBody className="space-y-3">
              <h3 className="text-sm font-medium">Organizers</h3>
              {organizers.length === 0 ? <p className="text-sm text-ink-soft">None flagged.</p> : null}
              {organizers.map((o) => (
                <form key={o.user_id} action={setTenantVerification} className="space-y-1 border-b border-line py-2 text-sm">
                  <input type="hidden" name="kind" value="organizer" />
                  <input type="hidden" name="id" value={o.user_id} />
                  <p>{o.org_name} <Badge>{o.review_status}</Badge></p>
                  <SubmitButton name="action" value="approve">Approve</SubmitButton>
                </form>
              ))}
            </CardBody>
          </Card>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl">Plans</h2>
        <p className="text-sm text-ink-soft">
          Active catalog: {plans.map((p) => `${p.name} (${p.key})`).join(" · ") || "none yet"} ·{" "}
          <a href="/admin/plans" className="font-medium text-ink hover:underline">Edit plans</a>
        </p>
        <Card>
          <CardBody>
            <form action={changeOrganizerPlan} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Select
                name="organizerId"
                label="Organizer"
                required
                options={rows.map((r) => ({ value: r.user_id, label: `${r.org_name || r.user_id} · ${r.plan_type || "free"}` }))}
              />
              <Select
                name="toPlan"
                label="New plan"
                required
                options={plans.map((p) => ({ value: p.key, label: p.name }))}
              />
              <Input name="reason" label="Reason" />
              <div className="flex items-end">
                <SubmitButton>Change plan</SubmitButton>
              </div>
            </form>
          </CardBody>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardBody className="space-y-3">
            <h3 className="font-medium">Feature grant or deny</h3>
            <p className="text-xs text-ink-soft">
              Grant turns a feature on for this tenant even if their plan omits it. Deny turns one off, including
              basic features.
            </p>
            <form action={grantFeatureOverride} className="space-y-3">
              <Select
                name="organizerId"
                label="Organizer (optional if org set)"
                options={[{ value: "", label: "—" }, ...rows.map((r) => ({ value: r.user_id, label: r.org_name || r.user_id }))]}
              />
              <Input name="targetOrgId" label="Target org UUID (departments/clubs)" />
              <Select
                name="moduleKey"
                label="Feature"
                required
                options={ALL_MODULE_KEYS.map((k) => ({ value: k, label: MODULE_LABELS[k] }))}
              />
              <Input name="reason" label="Reason" />
              <Input name="expiresAt" type="datetime-local" label="Expires (optional)" />
              <div className="flex flex-wrap gap-2">
                <SubmitButton name="effect" value="grant">Grant</SubmitButton>
                <SubmitButton name="effect" value="deny">Deny</SubmitButton>
              </div>
            </form>
            {overrides.length ? (
              <ul className="space-y-2 border-t border-line pt-3 text-sm">
                {overrides.map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-2">
                    <span>
                      <Badge>{o.denied ? "denied" : "granted"}</Badge>{" "}
                      {MODULE_LABELS[o.module_key as keyof typeof MODULE_LABELS] ?? o.module_key}
                      <span className="text-ink-soft">
                        {" "}
                        · {o.organizer_id ? rows.find((r) => r.user_id === o.organizer_id)?.org_name || o.organizer_id : o.target_org_id}
                      </span>
                    </span>
                    <form action={clearFeatureOverride}>
                      <input type="hidden" name="overrideId" value={o.id} />
                      <SubmitButton>Clear</SubmitButton>
                    </form>
                  </li>
                ))}
              </ul>
            ) : null}
          </CardBody>
        </Card>
        <Card>
          <CardBody className="space-y-3">
            <h3 className="font-medium">Custom pricing</h3>
            <form action={saveCustomPricing} className="space-y-3">
              <Select
                name="organizerId"
                label="Organizer"
                required
                options={rows.map((r) => ({ value: r.user_id, label: r.org_name || r.user_id }))}
              />
              <Input name="discountPct" type="number" label="Discount %" />
              <Input name="flatMonthly" type="number" label="Flat monthly override" />
              <Input name="notes" label="Notes" />
              <SubmitButton>Save agreement</SubmitButton>
            </form>
          </CardBody>
        </Card>
      </section>
    </div>
  );
}
