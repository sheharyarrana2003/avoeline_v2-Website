import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { TeamEngineService } from "@/src/features/teams/teamEngine.service";
import { eventLifecycle } from "@/src/lib/eventState";
import { listClubModules, listTenuresForOrg } from "./department.service";

export type ClubDetailTab = "overview" | "events" | "teams" | "tenures" | "budget";

export function parseClubTab(raw: string | undefined): ClubDetailTab {
  if (raw === "events" || raw === "teams" || raw === "tenures" || raw === "budget") return raw;
  return "overview";
}

export async function getClubDetailBundle(clubId: string, tenureId?: string | null) {
  const tenures = await listTenuresForOrg(clubId);
  const current = tenures.find((t) => t.isCurrent) || tenures[0] || null;
  const selectedTenureId =
    tenureId && tenures.some((t) => t.id === tenureId) ? tenureId : current?.id || null;

  const [modules, committees, { data: events }, { data: budget }, { data: memberships }] =
    await Promise.all([
      listClubModules(clubId),
      TeamEngineService.getTeamsByContext({ contextType: "club_committee", orgId: clubId }),
      supabaseAdmin
        .from(TABLES.EVENTS)
        .select(
          "id, title, short_description, banner_image, status, start_date, end_date, start_time, tenure_id",
        )
        .eq("org_id", clubId)
        .order("start_date", { ascending: false }),
      supabaseAdmin
        .from(TABLES.BUDGET_ENTRIES)
        .select("id, note, amount, entry_type, category, created_at, entry_date")
        .eq("org_id", clubId)
        .order("entry_date", { ascending: false })
        .limit(50),
      supabaseAdmin
        .from(TABLES.ORG_MEMBERSHIPS)
        .select("user_id, role")
        .eq("org_id", clubId)
        .eq("role", "president")
        .limit(1),
    ]);

  let president = { name: "", email: "" };
  const presidentId = memberships?.[0]?.user_id;
  if (presidentId) {
    const { data: u } = await supabaseAdmin
      .from(TABLES.USERS)
      .select("full_name, email")
      .eq("id", presidentId)
      .maybeSingle();
    president = { name: u?.full_name || "", email: u?.email || "" };
  }

  const eventCards = (events ?? [])
    .filter((e) => !selectedTenureId || e.tenure_id === selectedTenureId || !e.tenure_id)
    .map((e) => ({
      id: e.id,
      title: e.title || "Untitled",
      shortDescription: e.short_description || "",
      bannerUrl: e.banner_image || null,
      startDate: e.start_date,
      endDate: e.end_date,
      lifecycle: eventLifecycle(e.status, {
        startDate: e.start_date,
        endDate: e.end_date,
        startTime: e.start_time,
      }),
      tenureId: e.tenure_id,
    }));

  const teamIds = committees.map((t) => t.id);
  const { data: teamRows } = teamIds.length
    ? await supabaseAdmin.from(TABLES.TEAMS).select("id, tenure_id, name").in("id", teamIds)
    : { data: [] as { id: string; tenure_id: string | null; name: string }[] };
  const tenureByTeam = new Map((teamRows ?? []).map((t) => [t.id, t.tenure_id]));

  const teamsForTenure = committees.filter((t) => {
    const tid = tenureByTeam.get(t.id);
    if (!selectedTenureId) return true;
    return tid === selectedTenureId || tid == null;
  });

  const membersByTeam = await TeamEngineService.getTeamMembersForTeams(
    teamsForTenure.map((t) => t.id),
  );
  const { data: positions } = teamIds.length
    ? await supabaseAdmin
        .from(TABLES.TEAM_POSITIONS)
        .select("id, title, team_id")
        .in("team_id", teamIds)
    : { data: [] as { id: string; title: string; team_id: string }[] };
  const posMap = new Map((positions ?? []).map((p) => [p.id, p.title]));

  const roster: {
    teamName: string;
    name: string;
    email: string;
    role: string;
    position: string;
  }[] = [];
  for (const team of teamsForTenure) {
    for (const m of membersByTeam.get(team.id) ?? []) {
      roster.push({
        teamName: team.name,
        name: m.displayName || "",
        email: m.email || "",
        role: m.role || "member",
        position: m.positionId ? posMap.get(m.positionId) || "" : "",
      });
    }
  }

  return {
    tenures,
    selectedTenureId,
    currentTenure: current,
    modules,
    president,
    eventCards,
    roster,
    budget: (budget ?? []).map((b) => ({
      id: b.id,
      title: b.note || b.category || "Entry",
      amount: Number(b.amount) || 0,
      entryType: b.entry_type || "",
      category: b.category || "",
      createdAt: b.created_at || b.entry_date || "",
    })),
    pastTenureReadOnly: !!(selectedTenureId && current && selectedTenureId !== current.id),
  };
}
