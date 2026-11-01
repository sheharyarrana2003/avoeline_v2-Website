import { cache } from "react";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { eventLifecycle } from "@/src/lib/eventState";

export type AdminOrgProfile = {
  id: string;
  name: string;
  orgType: "department" | "club";
  parentOrgId: string | null;
  ownerUserId: string | null;
  description: string;
  logoUrl: string;
  contactEmail: string;
  contactPhone: string;
  websiteUrl: string;
  isVerified: boolean;
  createdAt: string;
};

export type AdminOrgTenure = {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
};

export type AdminOrgEventCard = {
  id: string;
  title: string;
  bannerUrl: string;
  status: string;
  lifecycle: string;
  startDate: string;
  organizerId: string;
  organizerName: string;
};

function mapOrg(row: Record<string, unknown>): AdminOrgProfile {
  return {
    id: String(row.id),
    name: String(row.name || ""),
    orgType: row.org_type === "club" ? "club" : "department",
    parentOrgId: row.parent_org_id ? String(row.parent_org_id) : null,
    ownerUserId: row.owner_user_id ? String(row.owner_user_id) : null,
    description: String(row.description || ""),
    logoUrl: String(row.logo_url || ""),
    contactEmail: String(row.contact_email || ""),
    contactPhone: String(row.contact_phone || ""),
    websiteUrl: String(row.website_url || ""),
    isVerified: Boolean(row.is_verified),
    createdAt: String(row.created_at || ""),
  };
}

export const getAdminOrg = cache(async (orgId: string): Promise<AdminOrgProfile | null> => {
  if (!orgId) return null;
  const { data } = await supabaseAdmin
    .from(TABLES.ORGANIZATIONS)
    .select("*")
    .eq("id", orgId)
    .maybeSingle();
  if (!data) return null;
  const type = String(data.org_type || "");
  if (type !== "department" && type !== "club") return null;
  return mapOrg(data as Record<string, unknown>);
});

export const listClubsForDepartment = cache(
  async (departmentId: string): Promise<AdminOrgProfile[]> => {
    if (!departmentId) return [];
    const { data } = await supabaseAdmin
      .from(TABLES.ORGANIZATIONS)
      .select("*")
      .eq("org_type", "club")
      .eq("parent_org_id", departmentId)
      .order("name");
    return (data ?? []).map((row) => mapOrg(row as Record<string, unknown>));
  },
);

function mapTenure(row: {
  id: string;
  label: string | null;
  start_date: string;
  end_date: string;
  is_current: boolean | null;
}): AdminOrgTenure {
  return {
    id: String(row.id),
    label: String(row.label || ""),
    startDate: String(row.start_date || ""),
    endDate: String(row.end_date || ""),
    isCurrent: Boolean(row.is_current),
  };
}

export const getCurrentTenure = cache(async (orgId: string): Promise<AdminOrgTenure | null> => {
  if (!orgId) return null;
  const { data } = await supabaseAdmin
    .from(TABLES.ORG_TENURES)
    .select("id, label, start_date, end_date, is_current")
    .eq("org_id", orgId)
    .eq("is_current", true)
    .maybeSingle();
  if (!data) {
    const { data: latest } = await supabaseAdmin
      .from(TABLES.ORG_TENURES)
      .select("id, label, start_date, end_date, is_current")
      .eq("org_id", orgId)
      .order("start_date", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!latest) return null;
    return mapTenure(latest);
  }
  return mapTenure(data);
});

export type ClubTenureSummary = {
  clubId: string;
  clubName: string;
  logoUrl: string;
  tenureLabel: string | null;
};

/** Clubs under a department with their current tenure label (or null). */
export const listClubTenuresForDepartment = cache(
  async (departmentId: string): Promise<ClubTenureSummary[]> => {
    const clubs = await listClubsForDepartment(departmentId);
    if (!clubs.length) return [];
    const clubIds = clubs.map((c) => c.id);
    const { data: tenures } = await supabaseAdmin
      .from(TABLES.ORG_TENURES)
      .select("org_id, label, is_current, start_date")
      .in("org_id", clubIds)
      .eq("is_current", true);
    const labelByOrg = new Map(
      (tenures ?? []).map((t) => [String(t.org_id), String(t.label || "")]),
    );
    return clubs.map((club) => ({
      clubId: club.id,
      clubName: club.name,
      logoUrl: club.logoUrl,
      tenureLabel: labelByOrg.get(club.id) || null,
    }));
  },
);

export type ClubLeadership = {
  presidentName: string;
  presidentEmail: string;
  executives: { name: string; role: string }[];
};

export type ClubTenureBundle = {
  current: AdminOrgTenure | null;
  history: AdminOrgTenure[];
  leadership: ClubLeadership;
};

/** Tenure + president/executives for admin club detail. */
export const getClubTenureBundle = cache(async (clubId: string): Promise<ClubTenureBundle> => {
  if (!clubId) {
    return {
      current: null,
      history: [],
      leadership: { presidentName: "", presidentEmail: "", executives: [] },
    };
  }

  const [{ data: tenureRows }, { data: memberships }, { data: teams }] = await Promise.all([
    supabaseAdmin
      .from(TABLES.ORG_TENURES)
      .select("id, label, start_date, end_date, is_current")
      .eq("org_id", clubId)
      .order("start_date", { ascending: false }),
    supabaseAdmin
      .from(TABLES.ORG_MEMBERSHIPS)
      .select("user_id, role, title")
      .eq("org_id", clubId)
      .in("role", ["president"]),
    supabaseAdmin
      .from(TABLES.TEAMS)
      .select("id")
      .eq("org_id", clubId)
      .eq("context_type", "club_committee"),
  ]);

  const history = (tenureRows ?? []).map(mapTenure);
  const current = history.find((t) => t.isCurrent) || history[0] || null;

  let presidentName = "";
  let presidentEmail = "";
  const presidentId = memberships?.[0]?.user_id ? String(memberships[0].user_id) : "";
  if (presidentId) {
    const { data: u } = await supabaseAdmin
      .from(TABLES.USERS)
      .select("full_name, email")
      .eq("id", presidentId)
      .maybeSingle();
    presidentName = String(u?.full_name || "");
    presidentEmail = String(u?.email || "");
  }

  const executives: { name: string; role: string }[] = [];
  const teamIds = (teams ?? []).map((t) => String(t.id));
  if (teamIds.length) {
    const { data: members } = await supabaseAdmin
      .from(TABLES.TEAM_MEMBERS)
      .select("display_name, role, position_id, user_id")
      .in("team_id", teamIds)
      .eq("role", "lead")
      .limit(12);
    const positionIds = [
      ...new Set(
        (members ?? [])
          .map((m) => m.position_id)
          .filter(Boolean)
          .map(String),
      ),
    ];
    const { data: positions } = positionIds.length
      ? await supabaseAdmin.from(TABLES.TEAM_POSITIONS).select("id, title").in("id", positionIds)
      : { data: [] as { id: string; title: string }[] };
    const titleById = new Map((positions ?? []).map((p) => [String(p.id), String(p.title || "")]));
    for (const m of members ?? []) {
      const name = String(m.display_name || "").trim();
      if (!name) continue;
      if (presidentName && name.toLowerCase() === presidentName.toLowerCase()) continue;
      executives.push({
        name,
        role: (m.position_id && titleById.get(String(m.position_id))) || "Executive",
      });
    }
  }

  return {
    current,
    history: history.filter((t) => !current || t.id !== current.id),
    leadership: { presidentName, presidentEmail, executives },
  };
});

/** Events tied to this org (department or club) via events.org_id. */
export const listEventsForOrg = cache(async (orgId: string): Promise<AdminOrgEventCard[]> => {
  if (!orgId) return [];
  const { data: events } = await supabaseAdmin
    .from(TABLES.EVENTS)
    .select(
      "id, title, status, organizer_id, banner_image, start_date, end_date, start_time, end_time, created_at",
    )
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(40);
  if (!events?.length) return [];

  const organizerIds = [
    ...new Set(events.map((e) => String(e.organizer_id || "")).filter(Boolean)),
  ];
  const { data: profiles } = organizerIds.length
    ? await supabaseAdmin
        .from(TABLES.ORGANIZER_PROFILES)
        .select("user_id, org_name")
        .in("user_id", organizerIds)
    : { data: [] };
  const nameById = new Map(
    (profiles ?? []).map((p) => [String(p.user_id), String(p.org_name || "")]),
  );

  const now = new Date();
  return events.map((e) => {
    const status = String(e.status || "draft");
    return {
      id: String(e.id),
      title: String(e.title || "Untitled"),
      bannerUrl: String(e.banner_image || ""),
      status,
      lifecycle: eventLifecycle(
        status,
        {
          startDate: e.start_date,
          endDate: e.end_date,
          startTime: e.start_time,
          endTime: e.end_time,
        },
        now,
      ),
      startDate: String(e.start_date || ""),
      organizerId: String(e.organizer_id || ""),
      organizerName: nameById.get(String(e.organizer_id || "")) || "—",
    };
  });
});
