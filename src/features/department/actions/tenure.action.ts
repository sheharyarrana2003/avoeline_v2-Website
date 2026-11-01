"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AuthService } from "@/src/features/auth/authService";
import { canManageOrg } from "@/src/features/department/orgScope";
import { startTenureSchema } from "@/src/features/department/schemas";
import { TeamEngineService } from "@/src/features/teams/teamEngine.service";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { type ActionResult, fail, ok } from "@/src/lib/action";
import { finishForm } from "@/src/lib/formRedirect";
import { safeAction, safeFail, safeOk } from "@/src/lib/safeAction";
import { logger } from "@/src/lib/logger";

export async function startTenure(formData: FormData): Promise<void> {
  finishForm(formData, "/department/clubs", await startTenureImpl(formData), "Tenure started.");
}

async function startTenureImpl(formData: FormData): Promise<ActionResult> {
  const parsed = startTenureSchema.safeParse({
    departmentId: String(formData.get("departmentId") ?? ""),
    clubId: String(formData.get("clubId") ?? ""),
    label: String(formData.get("label") ?? ""),
    startDate: String(formData.get("startDate") ?? ""),
    endDate: String(formData.get("endDate") ?? ""),
    copyRoster: formData.get("copyRoster") === "on" || formData.get("copyRoster") === "true",
  });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid tenure.");
  const input = parsed.data;
  if (input.endDate < input.startDate) return fail("The tenure must end after it starts.");

  const user = await AuthService.getCurrentUser();
  if (!user?.userId) return fail("Please sign in.");
  if (!(await canManageOrg(user, input.departmentId)))
    return fail("You can't manage this department.");

  const club = await TeamEngineService.getOrg(input.clubId);
  if (!club || club.type !== "club" || club.parentOrgId !== input.departmentId) {
    return fail("That club is not in this department.");
  }

  const { data, error } = await supabaseAdmin.rpc("start_org_tenure", {
    p_club_id: input.clubId,
    p_label: input.label,
    p_start: input.startDate,
    p_end: input.endDate,
    p_copy_roster: input.copyRoster,
  });
  if (error) {
    logger.error("[startTenure]", { message: error.message });
    if (/overlap|exclusion|unique/i.test(error.message)) {
      return fail("That tenure overlaps another term, or this club already has a current tenure.");
    }
    return fail("Could not start that tenure.");
  }

  revalidatePath("/department/clubs");
  revalidatePath(`/department/clubs/${input.clubId}`);
  revalidatePath("/department/tenures");
  revalidatePath("/department/analytics");
  void data;
  return ok();
}

export const setEventTenureAction = safeAction({
  input: z.object({
    eventId: z.string().uuid(),
    tenureId: z.string().uuid().nullable(),
    departmentId: z.string().uuid(),
  }),
  auth: async () => {
    const user = await AuthService.getCurrentUser();
    if (!user?.userId) return safeFail("UNAUTHORIZED", "Please sign in.");
    return user;
  },
  run: async (input, user) => {
    if (!(await canManageOrg(user, input.departmentId))) {
      return safeFail("FORBIDDEN", "You can't manage this department.");
    }
    const { data: event } = await supabaseAdmin
      .from(TABLES.EVENTS)
      .select("id, org_id")
      .eq("id", input.eventId)
      .maybeSingle();
    if (!event) return safeFail("NOT_FOUND", "Event not found.");
    if (event.org_id) {
      const club = await TeamEngineService.getOrg(event.org_id);
      if (!club || club.parentOrgId !== input.departmentId) {
        return safeFail("FORBIDDEN", "Event is not under this department.");
      }
    }
    const { error } = await supabaseAdmin
      .from(TABLES.EVENTS)
      .update({ tenure_id: input.tenureId })
      .eq("id", input.eventId);
    if (error) return safeFail("DB", "Could not update tenure.");
    revalidatePath("/department/events");
    revalidatePath(`/department/clubs/${event.org_id}`);
    return safeOk(undefined);
  },
});
