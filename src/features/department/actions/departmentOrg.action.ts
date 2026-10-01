"use server";

import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { type ActionResult, fail, ok } from "@/src/lib/action";
import { AuthService } from "@/src/features/auth/authService";
import { revalidatePath } from "next/cache";
import { NotificationServices } from "@/src/services/notification.services";
import { canLeadClub, canManageOrg } from "../orgScope";
import { finishForm } from "@/src/lib/formRedirect";

export async function createTenure(formData: FormData): Promise<void> {
  finishForm(formData, "/department", await createTenureImpl(formData), "Tenure added.");
}

export async function setClubModuleAccess(formData: FormData): Promise<void> {
  finishForm(formData, "/department/clubs", await setClubModuleAccessImpl(formData), "Club feature access saved.");
}

export async function postOrgAnnouncement(formData: FormData): Promise<void> {
  finishForm(formData, "/department/announcements", await postOrgAnnouncementImpl(formData), "Announcement posted.");
}

async function createTenureImpl(formData: FormData): Promise<ActionResult> {
  const user = await AuthService.getCurrentUser();
  if (!user) return fail("Please sign in.");
  const orgId = String(formData.get("orgId") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  const start = String(formData.get("startDate") ?? "");
  const end = String(formData.get("endDate") ?? "");
  if (!orgId || !label || !start || !end) return fail("Tenure label and dates are required.");
  if (end < start) return fail("The tenure must end after it starts.");
  if (!(await canManageOrg(user, orgId))) return fail("You can't manage this department.");
  await supabaseAdmin.from(TABLES.ORG_TENURES).insert({
    org_id: orgId,
    label,
    start_date: start,
    end_date: end,
    is_current: formData.get("isCurrent") === "on",
  });
  revalidatePath("/department");
  return ok();
}

async function setClubModuleAccessImpl(formData: FormData): Promise<ActionResult> {
  const user = await AuthService.getCurrentUser();
  if (!user) return fail("Please sign in.");
  const { isModuleKey } = await import("@/src/features/permissions/moduleKeys");
  const { getDepartmentPlan, moduleOptions } = await import("../department.service");
  const TeamEngineService = (await import("@/src/features/teams/teamEngine.service")).TeamEngineService;

  const departmentId = String(formData.get("departmentId") ?? "");
  const orgId = String(formData.get("orgId") ?? "");
  const applyAll = formData.get("applyAll") === "on" || formData.get("applyAll") === "true";
  const selected = formData.getAll("modules").map(String).filter(isModuleKey);
  if (!departmentId) return fail("Missing department.");
  if (!(await canManageOrg(user, departmentId))) return fail("You can't manage this department.");

  const plan = await getDepartmentPlan(departmentId);
  const allowed = new Set(moduleOptions(plan).map((o) => o.value));
  const granted = selected.filter((k) => allowed.has(k));

  const targets: string[] = [];
  if (applyAll) {
    targets.push(...(await TeamEngineService.listClubsByDepartment(departmentId)).map((c) => c.id));
  } else if (orgId) {
    const club = await TeamEngineService.getOrg(orgId);
    if (!club || club.parentOrgId !== departmentId) return fail("That club is not in this department.");
    targets.push(orgId);
  } else {
    return fail("Pick a club or apply to all clubs.");
  }

  for (const clubId of targets) {
    await supabaseAdmin.from(TABLES.ORG_MODULE_ACCESS).delete().eq("org_id", clubId);
    if (granted.length) {
      await supabaseAdmin.from(TABLES.ORG_MODULE_ACCESS).insert(
        granted.map((module_key) => ({
          org_id: clubId,
          module_key,
          enabled: true,
          granted_by: user.userId,
        })),
      );
    }
    revalidatePath(`/clubs/${clubId}`);
  }
  revalidatePath("/department/clubs");
  return ok();
}

async function postOrgAnnouncementImpl(formData: FormData): Promise<ActionResult> {
  const user = await AuthService.getCurrentUser();
  if (!user) return fail("Please sign in.");
  const orgId = String(formData.get("orgId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!orgId || !title || !body) return fail("Title and body are required.");
  if (!(await canManageOrg(user, orgId)) && !(await canLeadClub(user, orgId))) return fail("You can't post to this club.");
  await supabaseAdmin.from(TABLES.ORG_ANNOUNCEMENTS).insert({
    org_id: orgId,
    title,
    body,
    created_by: user.userId,
  });

  const { data: org } = await supabaseAdmin.from(TABLES.ORGANIZATIONS).select("owner_user_id").eq("id", orgId).maybeSingle();
  const presidentId = org?.owner_user_id ? String(org.owner_user_id) : "";
  if (presidentId && presidentId !== user.userId) {
    await NotificationServices.createNotification({
      userId: presidentId,
      title: `Announcement: ${title}`,
      message: body.slice(0, 240),
      type: "org_announcement",
      deepLink: `/clubs/${orgId}`,
    }).catch(() => null);
  }

  revalidatePath("/department");
  revalidatePath(`/clubs/${orgId}`);
  return ok();
}
