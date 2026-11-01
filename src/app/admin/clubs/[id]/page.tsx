import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Building2, ChevronLeft } from "lucide-react";
import { Card, CardBody } from "@/src/shared_components/ui/Card";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { EventThumb } from "@/src/shared_components/ui/EventThumb";
import { formatDateMedium } from "@/src/lib/datetime";
import { buttonClass } from "@/src/lib/ui";
import { requireAdminArea } from "@/src/features/admin/guard";
import {
  getAdminOrg,
  getClubTenureBundle,
  listEventsForOrg,
} from "@/src/features/admin/orgDetail.service";

export const metadata = { title: "Club — Admin — Avoeline" };

/**
 * Owner / platform staff club view — read-only.
 * Clubs belong to departments; platform cannot rename or edit them here.
 */
export default async function AdminClubDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminArea("orgs");
  if (!admin) redirect("/admin/signin?next=/admin/orgs");

  const { id } = await params;
  const org = await getAdminOrg(id);
  if (!org || org.orgType !== "club") notFound();

  const [parent, events, tenureBundle] = await Promise.all([
    org.parentOrgId ? getAdminOrg(org.parentOrgId) : Promise.resolve(null),
    listEventsForOrg(org.id),
    getClubTenureBundle(org.id),
  ]);

  const { current: tenure, history, leadership } = tenureBundle;

  return (
    <div className="space-y-8">
      <Link
        href="/admin/orgs"
        className="inline-flex items-center gap-1 text-xs text-ink-soft hover:text-ink"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Departments & clubs
      </Link>

      <div className="flex flex-wrap items-start gap-4">
        <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
          {org.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={org.logoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <Building2 className="h-6 w-6 text-ink-soft" />
          )}
        </div>
        <div className="min-w-0">
          <h1 className="font-display text-2xl text-ink">{org.name}</h1>
          <p className="mt-1 text-sm text-ink-soft">Club · read-only for platform staff</p>
          {parent ? (
            <Link
              href={`/admin/departments/${parent.id}`}
              className={`${buttonClass("secondary", "sm")} mt-3`}
            >
              Parent: {parent.name}
            </Link>
          ) : null}
        </div>
      </div>

      <p className="rounded-xl border border-line bg-muted px-4 py-3 text-sm text-ink-soft">
        Clubs are owned by their department. Platform staff can inspect this club but cannot rename
        or edit personal details. Ask the department admin to make changes.
      </p>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card title="Profile" tone="raised">
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
              <div>
                <dt className="text-ink-soft">Website</dt>
                <dd className="text-ink">
                  {org.websiteUrl ? (
                    <a
                      href={org.websiteUrl}
                      className="hover:underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {org.websiteUrl}
                    </a>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
            </dl>
          </CardBody>
        </Card>

        <Card title="Tenure">
          <CardBody>
            {tenure ? (
              <div className="space-y-4 text-sm text-ink">
                <div>
                  <p className="font-medium">{tenure.label}</p>
                  <p className="mt-1 text-ink-soft">
                    {formatDateMedium(tenure.startDate)} – {formatDateMedium(tenure.endDate)}
                    {tenure.isCurrent ? " · current" : ""}
                  </p>
                </div>
                {leadership.presidentName || leadership.presidentEmail ? (
                  <div>
                    <p className="text-ink-soft">President</p>
                    <p className="text-ink">
                      {leadership.presidentName || "—"}
                      {leadership.presidentEmail ? (
                        <span className="text-ink-soft"> · {leadership.presidentEmail}</span>
                      ) : null}
                    </p>
                  </div>
                ) : null}
                {leadership.executives.length > 0 ? (
                  <div>
                    <p className="text-ink-soft">Executives</p>
                    <ul className="mt-1 space-y-1">
                      {leadership.executives.map((ex) => (
                        <li key={`${ex.name}-${ex.role}`}>
                          {ex.name}
                          <span className="text-ink-soft"> · {ex.role}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {history.length > 0 ? (
                  <div id="tenure-history" className="border-t border-line pt-3">
                    <a href="#tenure-history" className="text-ink-soft hover:text-ink">
                      Tenure history
                    </a>
                    <ul className="mt-1 divide-y divide-line">
                      {history.map((t) => (
                        <li key={t.id} className="py-2 first:pt-0">
                          <span className="font-medium">{t.label}</span>
                          <span className="ml-2 text-ink-soft">
                            {formatDateMedium(t.startDate)} – {formatDateMedium(t.endDate)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-ink-soft">
                No tenure recorded yet. The department adds tenures.
              </p>
            )}
          </CardBody>
        </Card>
      </div>

      <Card title="Events">
        <CardBody>
          {events.length === 0 ? (
            <EmptyState
              size="sm"
              title="No events"
              description="Events linked to this club appear here."
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
