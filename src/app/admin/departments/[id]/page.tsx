import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Building2, ChevronLeft } from "lucide-react";
import { Card, CardBody } from "@/src/shared_components/ui/Card";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { EventThumb } from "@/src/shared_components/ui/EventThumb";
import { fieldClass, labelClass, buttonClass } from "@/src/lib/ui";
import { formatDateMedium } from "@/src/lib/datetime";
import { requireAdminArea } from "@/src/features/admin/guard";
import { canManageArea } from "@/src/features/admin/types";
import {
  getAdminOrg,
  listClubTenuresForDepartment,
  listClubsForDepartment,
  listEventsForOrg,
} from "@/src/features/admin/orgDetail.service";
import { updateDepartment } from "@/src/features/admin/actions/department.action";
import { updateOrg } from "@/src/features/admin/actions/tenancy.action";
import { getOrganizerRow, moderationFor } from "@/src/features/admin/admin.service";
import { listPlans } from "@/src/features/saas/saas.service";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import { DepartmentAccountForm } from "@/src/features/admin/components/DepartmentAccountForm";

export const metadata = { title: "Department — Admin — Avoeline" };

export default async function AdminDepartmentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ e?: string; ok?: string }>;
}) {
  const admin = await requireAdminArea("orgs");
  if (!admin) redirect("/admin/signin?next=/admin/orgs");

  const [{ id }, { e, ok }] = await Promise.all([params, searchParams]);
  const org = await getAdminOrg(id);
  if (!org || org.orgType !== "department") notFound();

  const canManage = canManageArea(admin, "orgs");
  const [clubs, events, clubTenures, plans, ownerRow, modLog] = await Promise.all([
    listClubsForDepartment(org.id),
    listEventsForOrg(org.id),
    listClubTenuresForDepartment(org.id),
    listPlans({ activeOnly: true }),
    org.ownerUserId ? getOrganizerRow(org.ownerUserId) : Promise.resolve(null),
    moderationFor(org.ownerUserId || org.id),
  ]);

  const planName =
    ownerRow && plans.length
      ? plans.find((p) => p.key === ownerRow.planType)?.name || ownerRow.planType
      : ownerRow?.planType || null;

  const returnTo = `/admin/departments/${org.id}`;
  const suspended = ownerRow ? ownerRow.accountStatus !== "active" : false;

  return (
    <div className="space-y-8">
      <Link
        href="/admin/orgs"
        className="inline-flex items-center gap-1 text-xs text-ink-soft hover:text-ink"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Departments & clubs
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
            {org.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={org.logoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <Building2 className="h-6 w-6 text-ink-soft" />
            )}
          </div>
          <div>
            <h1 className="font-display text-2xl text-ink">{org.name}</h1>
            <p className="mt-1 text-sm text-ink-soft">
              Department · name and plan only from the platform
            </p>
          </div>
        </div>
      </div>
      <FormFeedback error={e} success={ok} />

      <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-6">
          <Card title="Name & plan">
            <CardBody>
              {canManage ? (
                org.ownerUserId ? (
                  <form action={updateOrg} className="space-y-4">
                    <input type="hidden" name="orgId" value={org.id} />
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <label className={labelClass}>
                      Name
                      <input name="name" required defaultValue={org.name} className={fieldClass} />
                    </label>
                    <label className={labelClass}>
                      Plan
                      <select
                        name="planKey"
                        defaultValue={ownerRow?.planType || ""}
                        className={fieldClass}
                      >
                        {plans.map((p) => (
                          <option key={p.key} value={p.key}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <SubmitButton className={buttonClass("primary")}>Save</SubmitButton>
                  </form>
                ) : (
                  <form action={updateDepartment} className="space-y-4">
                    <input type="hidden" name="orgId" value={org.id} />
                    <label className={labelClass}>
                      Name
                      <input name="name" required defaultValue={org.name} className={fieldClass} />
                    </label>
                    <p className="text-xs text-ink-soft">
                      No linked organizer login yet — create one under Tenant accounts to assign a
                      plan.
                    </p>
                    <SubmitButton className={buttonClass("primary")}>Save name</SubmitButton>
                  </form>
                )
              ) : (
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="text-ink-soft">Name</dt>
                    <dd className="text-ink">{org.name}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-soft">Plan</dt>
                    <dd className="text-ink">{planName || "—"}</dd>
                  </div>
                </dl>
              )}
            </CardBody>
          </Card>

          <Card title="Profile (read-only)">
            <CardBody>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-ink-soft">Contact email</dt>
                  <dd className="text-ink">{org.contactEmail || "—"}</dd>
                </div>
                <div>
                  <dt className="text-ink-soft">Contact phone</dt>
                  <dd className="text-ink">{org.contactPhone || "—"}</dd>
                </div>
                <div>
                  <dt className="text-ink-soft">About</dt>
                  <dd className="text-ink">{org.description || "—"}</dd>
                </div>
              </dl>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          {org.ownerUserId ? (
            <Card title="Account">
              <CardBody>
                {ownerRow ? (
                  <div className="space-y-4">
                    <dl className="space-y-3 text-sm">
                      <div>
                        <dt className="text-ink-soft">Login email</dt>
                        <dd className="text-ink">{ownerRow.email || "—"}</dd>
                      </div>
                      <div className="flex items-center gap-2">
                        <dt className="text-ink-soft">Status</dt>
                        <dd>
                          <StatusBadge status={ownerRow.accountStatus} size="sm" />
                        </dd>
                      </div>
                      <div>
                        <dt className="text-ink-soft">Plan</dt>
                        <dd className="text-ink">{planName || "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-ink-soft">Created</dt>
                        <dd className="text-ink">
                          {ownerRow.signedUpAt ? formatDateMedium(ownerRow.signedUpAt) : "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-ink-soft">Last active</dt>
                        <dd className="text-ink">
                          {ownerRow.lastActiveAt ? formatDateMedium(ownerRow.lastActiveAt) : "—"}
                        </dd>
                      </div>
                    </dl>
                    {canManage ? (
                      <DepartmentAccountForm
                        orgId={org.id}
                        ownerName={ownerRow.name || org.name}
                        clubCount={clubs.filter((c) => c.ownerUserId).length}
                        suspended={suspended}
                      />
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm text-ink-soft">
                    Owner id is set, but no organizer profile was found for this login.
                  </p>
                )}
              </CardBody>
            </Card>
          ) : (
            <Card title="Account">
              <CardBody>
                <p className="text-sm text-ink-soft">
                  No linked login. Create one under{" "}
                  <Link href="/admin/tenants" className="font-medium text-ink hover:underline">
                    Tenant accounts
                  </Link>
                  .
                </p>
              </CardBody>
            </Card>
          )}

          <Card title="Club tenures">
            <CardBody>
              {clubTenures.length === 0 ? (
                <p className="text-sm text-ink-soft">No clubs under this department yet.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {clubTenures.map((row) => (
                    <li
                      key={row.clubId}
                      className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <Link
                        href={`/admin/clubs/${row.clubId}`}
                        className="min-w-0 flex-1 font-medium text-ink hover:underline"
                      >
                        {row.clubName}
                      </Link>
                      <span className="shrink-0 text-sm text-ink-soft">
                        {row.tenureLabel || "No tenure yet"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card title="Moderation history">
            <CardBody>
              {modLog.length === 0 ? (
                <p className="text-sm text-ink-soft">Nothing has been done to this account.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {modLog.map((entry) => (
                    <li key={entry.id} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <StatusBadge status={entry.action} size="sm" />
                        <span className="text-2xs uppercase text-ink-faint">
                          {formatDateMedium(entry.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-ink-soft">{entry.reason}</p>
                      <p className="text-2xs uppercase text-ink-faint">{entry.adminEmail}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      <Card title="Clubs">
        <CardBody>
          {clubs.length === 0 ? (
            <EmptyState
              size="sm"
              title="No clubs"
              description="Clubs under this department appear here (read-only). Departments add clubs themselves."
            />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {clubs.map((club) => (
                <li key={club.id}>
                  <Link
                    href={`/admin/clubs/${club.id}`}
                    className="flex items-center gap-3 rounded-xl border border-line bg-canvas p-3 hover:bg-muted"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                      {club.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={club.logoUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Building2 className="h-4 w-4 text-ink-soft" />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-ink">{club.name}</span>
                      <span className="text-2xs text-ink-soft">View club</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card title="Events">
        <CardBody>
          {events.length === 0 ? (
            <EmptyState
              size="sm"
              title="No events"
              description="Events linked to this department appear here."
            />
          ) : (
            <ul className="divide-y divide-line">
              {events.map((ev) => (
                <li
                  key={ev.id}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <Link href={`/e/${ev.id}`} className="min-w-0 flex-1">
                    <EventThumb title={ev.title} src={ev.bannerUrl || null} size="md" />
                  </Link>
                  <StatusBadge status={ev.lifecycle} size="sm" />
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
