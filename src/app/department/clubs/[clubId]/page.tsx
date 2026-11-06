import Link from "next/link";
import { notFound } from "next/navigation";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { Card, CardBody } from "@/src/shared_components/ui/Card";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { FilterTabs } from "@/src/shared_components/ui/FilterTabs";
import { EventThumb } from "@/src/shared_components/ui/EventThumb";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { formatCurrency } from "@/src/lib/money";
import { formatDate } from "@/src/lib/datetime";
import { MODULE_LABELS } from "@/src/features/permissions/moduleKeys";
import { TeamEngineService } from "@/src/features/teams/teamEngine.service";
import { resolveDepartment } from "@/src/features/department/department.service";
import { getClubDetailBundle, parseClubTab } from "@/src/features/department/clubDetail.service";

export default async function DepartmentClubInspectPage({
  params,
  searchParams,
}: {
  params: Promise<{ clubId: string }>;
  searchParams: Promise<{ e?: string; ok?: string; tab?: string; tenure?: string }>;
}) {
  const { clubId } = await params;
  const sp = await searchParams;
  const club = await TeamEngineService.getOrg(clubId);
  if (!club || club.type !== "club" || !club.parentOrgId) notFound();

  const { department } = await resolveDepartment(club.parentOrgId);
  if (club.parentOrgId !== department.id) notFound();

  const tab = parseClubTab(sp.tab);
  const detail = await getClubDetailBundle(clubId, sp.tenure);
  const base = `/department/clubs/${clubId}`;
  const tenureQ = detail.selectedTenureId ? `&tenure=${detail.selectedTenureId}` : "";

  const tabs = [
    { label: "Overview", value: "overview", href: `${base}?tab=overview${tenureQ}` },
    { label: "Events", value: "events", href: `${base}?tab=events${tenureQ}` },
    { label: "Teams", value: "teams", href: `${base}?tab=teams${tenureQ}` },
    { label: "Tenures", value: "tenures", href: `${base}?tab=tenures${tenureQ}` },
    { label: "Budget", value: "budget", href: `${base}?tab=budget${tenureQ}` },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title={club.name}
        description="Department oversight. Past tenures are read-only."
        actions={
          <Link
            href={`${base}/settings/connections`}
            className="text-sm font-medium text-ink underline hover:no-underline"
          >
            Connections
          </Link>
        }
      />
      <FormFeedback error={sp.e} success={sp.ok} />

      {detail.tenures.length ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-ink-soft">Tenure:</span>
          {detail.tenures.map((t) => {
            const active = t.id === detail.selectedTenureId;
            return (
              <Link
                key={t.id}
                href={`${base}?tab=${tab}&tenure=${t.id}`}
                className={
                  active
                    ? "rounded-md bg-muted px-2 py-1 font-medium text-ink"
                    : "rounded-md px-2 py-1 text-ink-soft hover:bg-muted"
                }
              >
                {t.label}
                {t.isCurrent ? " (Ongoing)" : ""}
              </Link>
            );
          })}
        </div>
      ) : null}

      <FilterTabs tabs={tabs} activeValue={tab} label="Club detail tabs" />

      {detail.pastTenureReadOnly ? (
        <p className="rounded-lg border border-line bg-muted/40 px-3 py-2 text-xs text-ink-soft">
          Viewing a past tenure — read-only.
        </p>
      ) : null}

      {tab === "overview" ? (
        <Card>
          <CardBody className="space-y-3 text-sm">
            <p>
              <span className="text-ink-soft">President:</span> {detail.president.name || "—"} (
              {detail.president.email || "no email"})
            </p>
            <p>
              <span className="text-ink-soft">Current tenure:</span>{" "}
              {detail.currentTenure?.label || "none"}
            </p>
            <p>
              <span className="text-ink-soft">Modules:</span>{" "}
              {detail.modules.length
                ? detail.modules.map((k) => MODULE_LABELS[k]).join(", ")
                : "none granted"}
            </p>
            <p className="text-ink-soft">
              Use Clubs → Grant / revoke access to change modules. Use Add tenure to start a new
              term.
            </p>
          </CardBody>
        </Card>
      ) : null}

      {tab === "events" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {detail.eventCards.length === 0 ? (
            <p className="text-sm text-ink-soft">No events for this tenure.</p>
          ) : (
            detail.eventCards.map((ev) => (
              <Link
                key={ev.id}
                href={`/events/${ev.id}`}
                className="flex gap-3 rounded-xl border border-line bg-paper p-3 hover:border-ink/20"
              >
                <EventThumb title={ev.title} src={ev.bannerUrl} size="md" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium text-ink">{ev.title}</h3>
                    <StatusBadge status={ev.lifecycle} size="sm" />
                  </div>
                  {ev.shortDescription ? (
                    <p className="mt-1 line-clamp-2 text-xs text-ink-soft">{ev.shortDescription}</p>
                  ) : null}
                  <p className="mt-1 text-2xs text-ink-faint">{formatDate(ev.startDate)}</p>
                </div>
              </Link>
            ))
          )}
        </div>
      ) : null}

      {tab === "teams" ? (
        <Card>
          <CardBody>
            {detail.roster.length === 0 ? (
              <p className="text-sm text-ink-soft">No committee members for this tenure.</p>
            ) : (
              <ul className="divide-y divide-line text-sm">
                {detail.roster.map((m, i) => (
                  <li key={`${m.email}-${i}`} className="flex flex-wrap justify-between gap-2 py-2">
                    <span>
                      {m.name || "Member"}
                      {m.position ? ` · ${m.position}` : ""}
                      <span className="ml-2 text-ink-faint">({m.role})</span>
                    </span>
                    <span className="text-ink-soft">{m.email}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      ) : null}

      {tab === "tenures" ? (
        <Card>
          <CardBody>
            <ul className="divide-y divide-line text-sm">
              {detail.tenures.map((t) => (
                <li key={t.id} className="flex flex-wrap justify-between gap-2 py-2">
                  <span>
                    {t.label} {t.isCurrent ? <StatusBadge status="ongoing" size="sm" /> : null}
                  </span>
                  <span className="text-ink-soft">
                    {t.startDate} → {t.endDate}
                  </span>
                </li>
              ))}
            </ul>
            {!detail.tenures.length ? (
              <p className="text-sm text-ink-soft">
                No tenures yet. Use Add tenure on the Clubs page.
              </p>
            ) : null}
          </CardBody>
        </Card>
      ) : null}

      {tab === "budget" ? (
        <Card>
          <CardBody>
            {detail.budget.length === 0 ? (
              <p className="text-sm text-ink-soft">No budget entries.</p>
            ) : (
              <ul className="divide-y divide-line text-sm">
                {detail.budget.map((b) => (
                  <li key={b.id} className="flex flex-wrap justify-between gap-2 py-2">
                    <span>
                      {b.title} <span className="text-ink-faint">({b.entryType})</span>
                    </span>
                    <span className="tabular-nums">{formatCurrency(b.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
