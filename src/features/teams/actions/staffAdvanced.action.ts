"use server";

import { finishForm } from "@/src/lib/formRedirect";
import { ok, fail } from "@/src/lib/action";
import { looksLikeEmail, normalizeEmail } from "@/src/features/access/types";
import { assertOwnedEvent } from "@/src/features/events/ownership";
import { hasModuleAccess } from "@/src/features/permissions/permissions.service";
import { TeamEngineService } from "@/src/features/teams/teamEngine.service";
import {
  APPLICANT_STATUSES,
  STAFF_PERMISSIONS,
  STAFF_TITLE_PRESETS,
  type ApplicantStatus,
} from "@/src/features/teams/teamEngine.types";
import type { DynamicFieldDefinition } from "@/src/shared_components/DynamicFieldBuilder";

async function requireAdvanced(eventId: string) {
  const event = await assertOwnedEvent(eventId);
  if (!event) return { event: null as null, error: "Not allowed." as const };
  const allowed = await hasModuleAccess(event.organizerId, "teams_advanced_roles");
  if (!allowed)
    return { event: null as null, error: "Advanced team roles are locked on this plan." as const };
  return { event, error: null };
}

function permissionKeys(formData: FormData): string[] {
  const allowed = new Set<string>(STAFF_PERMISSIONS.map((p) => p.key));
  return formData
    .getAll("permissions")
    .map(String)
    .filter((key) => allowed.has(key));
}

function trackIdsFrom(formData: FormData): string[] {
  return formData.getAll("trackIds").map(String).filter(Boolean);
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
      : await TeamEngineService.createPosition(
          teamId,
          title,
          permissionKeys(formData).length
            ? permissionKeys(formData)
            : (STAFF_TITLE_PRESETS[title] ?? []),
          trackIdsFrom(formData),
        )
          .then(() => ok())
          .catch(() => fail("Could not add the position."));
  finishForm(
    formData,
    `/organizer/${organizerId}/events/${eventId}/staff`,
    result,
    "Position added.",
  );
}

export async function addStaffApplicant(formData: FormData): Promise<void> {
  const eventId = String(formData.get("eventId") || "");
  const organizerId = String(formData.get("organizerId") || "");
  const teamId = String(formData.get("teamId") || "");
  const positionId = String(formData.get("positionId") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const email = normalizeEmail(formData.get("email"));
  const note = String(formData.get("note") || "").trim();
  const gate = await requireAdvanced(eventId);
  let result = gate.event ? ok() : fail(gate.error);
  if (gate.event) {
    if (!teamId || !name) result = fail("Name is required.");
    else if (!looksLikeEmail(email)) result = fail("A valid email is required.");
    else {
      try {
        const formId = await TeamEngineService.ensureRecruitmentForm(
          teamId,
          "Event team",
          positionId || null,
        );
        await TeamEngineService.addApplicant({
          teamId,
          formId,
          email,
          name,
          positionId: positionId || null,
          responses: note ? { note } : {},
        });
        result = ok();
      } catch (err) {
        result = fail(err instanceof Error ? err.message : "Could not save the application.");
      }
    }
  }
  finishForm(
    formData,
    `/organizer/${organizerId}/events/${eventId}/staff`,
    result,
    "Applicant added.",
  );
}

export async function setStaffApplicantStatus(formData: FormData): Promise<void> {
  const eventId = String(formData.get("eventId") || "");
  const organizerId = String(formData.get("organizerId") || "");
  const applicantId = String(formData.get("applicantId") || "");
  const raw = String(formData.get("status") || "applied");
  const status = (raw === "interview" ? "interview_scheduled" : raw) as ApplicantStatus;
  const interviewAt = String(formData.get("interviewAt") || "").trim();
  const interviewNotes = String(formData.get("interviewNotes") || "").trim();
  const emailSubject = String(formData.get("emailSubject") || "").trim();
  const emailBody = String(formData.get("emailBody") || "").trim();
  const gate = await requireAdvanced(eventId);
  let result = gate.event ? ok() : fail(gate.error);
  let okMsg = "Pipeline updated.";
  if (gate.event) {
    if (!APPLICANT_STATUSES.includes(status)) result = fail("Unknown status.");
    else {
      try {
        const mailOrgId = gate.event.organizerId || organizerId;
        const applicantBefore = await TeamEngineService.getApplicant(applicantId);
        let willEmail = status === "shortlisted" && !!applicantBefore?.email;
        if (status === "accepted" && applicantBefore?.email) {
          const { supabaseAdmin } = await import("@/data/supabase");
          const { TABLES } = await import("@/data/collections");
          const { data: existingUser } = await supabaseAdmin
            .from(TABLES.USERS)
            .select("id")
            .eq("email", applicantBefore.email.trim().toLowerCase())
            .maybeSingle();
          willEmail = !existingUser?.id;
        }
        if (willEmail) {
          const { getActiveConnectionRow } =
            await import("@/src/features/email/organizerEmailConnection.service");
          const { RECRUITMENT_CONNECT_GOOGLE_MSG } =
            await import("@/src/features/teams/recruitmentEmail");
          const connected = await getActiveConnectionRow(mailOrgId);
          if (!connected) {
            result = fail(RECRUITMENT_CONNECT_GOOGLE_MSG);
            finishForm(formData, `/organizer/${organizerId}/events/${eventId}/staff`, result);
            return;
          }
        }

        const outcome = await TeamEngineService.setApplicantStatus({
          applicantId,
          status,
          interviewAt: interviewAt || null,
          interviewNotes,
        });

        if (status === "shortlisted") {
          const applicant = applicantBefore ?? (await TeamEngineService.getApplicant(applicantId));
          if (applicant?.email) {
            const { sendRecruitmentEmail } = await import("@/src/features/teams/recruitmentEmail");
            const mailed = await sendRecruitmentEmail({
              organizerId: mailOrgId,
              to: applicant.email,
              name: String(applicant.responses?.name || applicant.email),
              kind: "shortlisted",
              subject: emailSubject || undefined,
              bodyHtml: emailBody || undefined,
            });
            if (!mailed.ok) {
              result = fail(mailed.message);
              finishForm(formData, `/organizer/${organizerId}/events/${eventId}/staff`, result);
              return;
            }
            okMsg = "Shortlisted and notified via your Google email.";
          } else {
            okMsg = "Shortlisted.";
          }
        } else if (status === "accepted" && outcome.needsJoin) {
          try {
            const onboarded = await TeamEngineService.onboardApplicantWithoutUser({ applicantId });
            const { absoluteUrl } = await import("@/src/lib/appUrl");
            const { supabaseAdmin } = await import("@/data/supabase");
            const { sendRecruitmentEmail } = await import("@/src/features/teams/recruitmentEmail");
            const redirectTo = await absoluteUrl("/auth/change-password");
            const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
              type: "invite",
              email: onboarded.email,
              options: {
                redirectTo,
                data: { full_name: onboarded.displayName, user_type: "organizer" },
              },
            });
            const inviteLink = linkData?.properties?.action_link;
            if (inviteLink) {
              const mailed = await sendRecruitmentEmail({
                organizerId: mailOrgId,
                to: onboarded.email,
                name: onboarded.displayName,
                kind: "onboarded",
                inviteLink,
                subject: emailSubject || undefined,
                bodyHtml: emailBody || undefined,
              });
              if (!mailed.ok) {
                result = fail(mailed.message);
                finishForm(formData, `/organizer/${organizerId}/events/${eventId}/staff`, result);
                return;
              }
              okMsg =
                "Accepted, added to event team, and invite emailed via Google (no password in email).";
            } else {
              okMsg = "Accepted and added to event team. Invite link could not be emailed.";
            }
            if (linkData?.user?.id) {
              const { TABLES } = await import("@/data/collections");
              await supabaseAdmin
                .from(TABLES.TEAM_MEMBERS)
                .update({ user_id: linkData.user.id })
                .eq("id", onboarded.memberId);
            }
          } catch (inviteErr) {
            okMsg =
              inviteErr instanceof Error
                ? `Accepted with roster row; invite failed: ${inviteErr.message}`
                : "Accepted with roster row; invite failed.";
          }
        } else if (status === "accepted" && outcome.memberCreated) {
          okMsg = "Accepted and added to the event team.";
        }
        if (result.success) result = ok();
      } catch (err) {
        result = fail(err instanceof Error ? err.message : "Could not update the applicant.");
      }
    }
  }
  finishForm(formData, `/organizer/${organizerId}/events/${eventId}/staff`, result, okMsg);
}

export async function saveStaffRecruitmentForm(formData: FormData): Promise<void> {
  const eventId = String(formData.get("eventId") || "");
  const organizerId = String(formData.get("organizerId") || "");
  const teamId = String(formData.get("teamId") || "");
  const positionId = String(formData.get("positionId") || "").trim();
  const title = String(formData.get("title") || "").trim();
  const redirectTo = String(formData.get("redirectTo") || "").trim();
  const successPath =
    redirectTo ||
    (eventId
      ? `/organizer/${organizerId}/events/${eventId}/staff`
      : `/organizer/${organizerId}/teams?tab=recruitment`);

  let result = ok();
  if (eventId) {
    const gate = await requireAdvanced(eventId);
    if (!gate.event) result = fail(gate.error);
  } else if (organizerId) {
    const allowed = await hasModuleAccess(organizerId, "teams_advanced_roles");
    if (!allowed) result = fail("Advanced team roles are locked on this plan.");
    else {
      const owns = await TeamEngineService.organizerOwnsStaffTeam(organizerId, teamId);
      if (!owns) result = fail("Team not found in your library.");
    }
  } else {
    result = fail("Missing organizer or event.");
  }

  if (result.success) {
    if (!teamId || !positionId) result = fail("Choose a position.");
    else {
      try {
        let fields: DynamicFieldDefinition[] = [];
        try {
          fields = JSON.parse(String(formData.get("fields") || "[]")) as DynamicFieldDefinition[];
        } catch {
          result = fail("The form fields could not be read.");
        }
        if (result.success) {
          const formId = await TeamEngineService.ensureRecruitmentForm(
            teamId,
            title || "Event team application",
            positionId,
          );
          await TeamEngineService.saveRecruitmentForm(formId, {
            title: title || "Event team application",
            fields,
            isOpen: formData.get("isOpen") !== "off",
            intro: String(formData.get("intro") || ""),
            closesAt: String(formData.get("closesAt") || "").trim() || null,
            cap: (() => {
              const raw = String(formData.get("cap") || "").trim();
              if (!raw) return null;
              const n = Number(raw);
              return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
            })(),
          });
          result = ok();
        }
      } catch {
        result = fail("Could not save the recruitment form.");
      }
    }
  }
  finishForm(formData, successPath, result, "Recruitment form saved.");
}

export async function applyStaffRecruitment(formData: FormData): Promise<void> {
  const eventId = String(formData.get("eventId") || "");
  const formId = String(formData.get("formId") || "");
  const name = String(formData.get("name") || "").trim();
  const email = normalizeEmail(formData.get("email"));
  const form = await TeamEngineService.getRecruitmentForm(formId);
  const team = form ? await TeamEngineService.getTeam(form.teamId) : null;
  let result = ok();
  if (!form || !form.isOpen || !team || team.eventId !== eventId) {
    result = fail("This application form is not open.");
  } else if (!name) result = fail("Name is required.");
  else if (!looksLikeEmail(email)) result = fail("A valid email is required.");
  else {
    const responses: Record<string, unknown> = {};
    for (const field of form.fields) {
      const value = String(formData.get(`field_${field.key}`) || "").trim();
      if (field.required && !value && field.type !== "checkbox") {
        result = fail(`${field.label} is required.`);
        break;
      }
      responses[field.key] =
        field.type === "checkbox" ? formData.get(`field_${field.key}`) === "on" : value;
    }
    if (result.success) {
      try {
        await TeamEngineService.addApplicant({
          teamId: form.teamId,
          formId: form.id,
          email,
          name,
          positionId: form.positionId,
          responses,
        });
      } catch (err) {
        result = fail(err instanceof Error ? err.message : "Could not submit the application.");
      }
    }
  }
  finishForm(
    formData,
    `/events/${eventId}/staff-apply/${formId}`,
    result,
    "Application submitted.",
  );
}

export async function updateStaffPosition(formData: FormData): Promise<void> {
  const eventId = String(formData.get("eventId") || "");
  const organizerId = String(formData.get("organizerId") || "");
  const positionId = String(formData.get("positionId") || "");
  const gate = await requireAdvanced(eventId);
  const result = !gate.event
    ? fail(gate.error)
    : !positionId
      ? fail("Choose a position.")
      : await TeamEngineService.updatePosition(positionId, {
          permissions: permissionKeys(formData),
          trackIds: trackIdsFrom(formData),
        })
          .then(() => ok())
          .catch(() => fail("Could not save access."));
  finishForm(
    formData,
    `/organizer/${organizerId}/events/${eventId}/staff`,
    result,
    "Access updated.",
  );
}
