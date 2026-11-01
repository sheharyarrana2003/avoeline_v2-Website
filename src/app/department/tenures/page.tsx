import Link from "next/link";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { Card, CardBody } from "@/src/shared_components/ui/Card";
import { EventThumb } from "@/src/shared_components/ui/EventThumb";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { formatDate } from "@/src/lib/datetime";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import {
  listClubOverviews,
  listTenuresForOrg,
  resolveDepartment,
} from "@/src/features/department/department.service";
import { eventLifecycle } from "@/src/lib/eventState";
import { TeamEngineService } from "@/src/features/teams/teamEngine.service";

export const metadata = { title: "Tenures — Department — Avoeline" };

export default async function DepartmentTenuresPage({
  searchParams,
}: {
  searchParams: Promise<{ orgId?: string; club?: string; tenure?: string }>;
}) {
  const sp = await searchParams;
  const { department } = await resolveDepartment(sp.orgId);
  const clubs = await listClubOverviews(department.id);
  const clubId = clubs.some((c) => c.id === sp.club) ? sp.club! : clubs[0]?.id;
  if (!clubId) {
    return (
      <div className="mx-auto max-w-4xl">
        <PageHeader title="Tenures" description="Add a club first." />
      </div>
    );
  }

  const tenures = await listTenuresForOrg(clubId);
  const current = tenures.find((t) => t.isCurrent);
  const tenureId =
    (sp.tenure && tenures.some((t) => t.id === sp.tenure) && sp.tenure) ||
    current?.id ||
    tenures[0]?.id ||
    null;
  const selected = tenures.find((t) => t.id === tenureId) || null;
  const past = !!(selected && current && selected.id !== current.id);

  const [{ data: events }, committees] = await Promise.all([
    tenureId
      ? supabaseAdmin
          .from(TABLES.EVENTS)
          .select(
            "id, title, banner_image, status, start_date, end_date, start_time, short_description",
          )
          .eq("org_id", clubId)
          .eq("tenure_id", tenureId)
      : Promise.resolve({ data: [] as never[] }),
    TeamEngineService.getTeamsByContext({ contextType: "club_committee", orgId: clubId }),
  ]);

  const { data: teamRows } = committees.length
    ? await supabaseAdmin
        .from(TABLES.TEAMS)
        .select("id, tenure_id")
        .in(
          "id",
          committees.map((t) => t.id),
        )
    : { data: [] as { id: string; tenure_id: string | null }[] };
  const tenureTeams = committees.filter((t) => {
    const tid = teamRows?.find((r) => r.id === t.id)?.tenure_id;
    return !tenureId || tid === tenureId || tid == null;
  });
  const membersByTeam = await TeamEngineService.getTeamMembersForTeams(
    tenureTeams.map((t) => t.id),
  );

  const qBase = `/department/tenures?club=`;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Tenure overview"
        description="Pick a club and tenure. Past tenures are read-only."
      />

      <div className="flex flex-wrap gap-2">
        {clubs.map((c) => (
          <Link
            key={c.id}
            href={`${qBase}${c.id}`}
            className={
              c.id === clubId
                ? "rounded-md bg-muted px-3 py-1.5 text-sm font-medium"
                : "rounded-md px-3 py-1.5 text-sm text-ink-soft hover:bg-muted"
            }
          >
            {c.name}
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {tenures.map((t) => (
          <Link
            key={t.id}
            href={`${qBase}${clubId}&tenure=${t.id}`}
            className={
              t.id === tenureId
                ? "rounded-md bg-muted px-3 py-1.5 text-sm font-medium"
                : "rounded-md px-3 py-1.5 text-sm text-ink-soft hover:bg-muted"
            }
          >
            {t.label}
            {t.isCurrent ? " (Ongoing)" : ""}
          </Link>
        ))}
      </div>

      {past ? (
        <p className="rounded-lg border border-line bg-muted/40 px-3 py-2 text-xs text-ink-soft">
          Past tenure — read-only.
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Committee">
          <CardBody>
            {tenureTeams.length === 0 ? (
              <p className="text-sm text-ink-soft">No committee for this tenure.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {tenureTeams.map((team) => (
                  <li key={team.id}>
                    <p className="font-medium text-ink">{team.name}</p>
                    <ul className="mt-1 text-ink-soft">
                      {(membersByTeam.get(team.id) ?? []).map((m) => (
                        <li key={m.id}>
                          {m.displayName || m.email || m.userId} · {m.role}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card title="Events">
          <CardBody className="space-y-3">
            {(events ?? []).length === 0 ? (
              <p className="text-sm text-ink-soft">No events tagged to this tenure.</p>
            ) : (
              (events ?? []).map((ev) => (
                <Link
                  key={ev.id}
                  href={`/events/${ev.id}`}
                  className="flex gap-3 rounded-lg border border-line p-2 hover:bg-muted/40"
                >
                  <EventThumb title={ev.title || ""} src={ev.banner_image} size="sm" />
                  <div>
                    <p className="text-sm font-medium text-ink">{ev.title}</p>
                    <StatusBadge
                      status={eventLifecycle(ev.status, {
                        startDate: ev.start_date,
                        endDate: ev.end_date,
                        startTime: ev.start_time,
                      })}
                      size="sm"
                    />
                    <p className="text-2xs text-ink-faint">{formatDate(ev.start_date)}</p>
                  </div>
                </Link>
              ))
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
