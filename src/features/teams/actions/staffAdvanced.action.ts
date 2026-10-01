"use server";

import { finishForm } from "@/src/lib/formRedirect";
import { ok, fail } from "@/src/lib/action";
import { assertOwnedEvent } from "@/src/features/events/ownership";
import { hasModuleAccess } from "@/src/features/permissions/permissions.service";
import { TeamEngineService } from "@/src/features/teams/teamEngine.service";

async function requireAdvanced(eventId: string) {
  const event = await assertOwnedEvent(eventId);
  if (!event) return { event: null as null, error: "Not allowed." as const };
  const allowed = await hasModuleAccess(event.organizerId, "teams_advanced_roles");
  if (!allowed) return { event: null as null, error: "Advanced team roles are locked on this plan." as const };
  return { event, error: null };
}

export async function addStaffPosition(formData: FormData): Promise<void> {
  const eventId = String(formData.get("eventId") || "");
  const organizerId = String(formData.get("organizerId") || "");
  const teamId = String(formData.get("teamId") || "");
  const title = String(formData.get("title") || "").trim();
  const gate = await requireAdvanced(eventId);
  const result = !gate.event
    ? fail(gate.error)
    : !teamId || !title
      ? fail("Choose a position title.")
      : await TeamEngineService.createPosition(teamId, title).then(() => ok()).catch(() => fail("Could not add the position."));
  finishForm(formData, `/organizer/${organizerId}/events/${eventId}/staff`, result, "Position added.");
}

export async function addStaffApplicant(formData: FormData): Promise<void> {
  const eventId = String(formData.get("eventId") || "");
  const organizerId = String(formData.get("organizerId") || "");
  const teamId = String(formData.get("teamId") || "");
  const name = String(formData.get("name") || "").trim();
  const note = String(formData.get("note") || "").trim();
  const gate = await requireAdvanced(eventId);
  let result = gate.event ? ok() : fail(gate.error);
  if (gate.event) {
    if (!teamId || !name) result = fail("Name is required.");
    else {
      try {
        const formId = await TeamEngineService.ensureRecruitmentForm(teamId, "Event staff");
        await TeamEngineService.addApplicant(teamId, formId, { name, note });
        result = ok();
      } catch {
        result = fail("Could not save the application.");
      }
    }
  }
  finishForm(formData, `/organizer/${organizerId}/events/${eventId}/staff`, result, "Applicant added.");
}

export async function setStaffApplicantStatus(formData: FormData): Promise<void> {
  const eventId = String(formData.get("eventId") || "");
  const organizerId = String(formData.get("organizerId") || "");
  const applicantId = String(formData.get("applicantId") || "");
  const status = String(formData.get("status") || "applied");
  const gate = await requireAdvanced(eventId);
  const result = !gate.event
    ? fail(gate.error)
    : await TeamEngineService.setApplicantStatus(applicantId, status).then(() => ok()).catch(() => fail("Could not update the applicant."));
  finishForm(formData, `/organizer/${organizerId}/events/${eventId}/staff`, result, "Pipeline updated.");
}
