"use server";

import { z } from "zod";
import { safeAction, safeFail, safeOk } from "@/src/lib/safeAction";
import { AuthService } from "@/src/features/auth/authService";
import { can } from "@/src/features/permissions/can";
import { hasModuleAccess } from "@/src/features/permissions/permissions.service";
import { TeamEngineService } from "@/src/features/teams/teamEngine.service";
import { APPLICANT_STATUSES, type ApplicantStatus } from "@/src/features/teams/teamEngine.types";
import { requireConnectedSender } from "@/src/features/email/organizerTransport.service";
import { buildInterviewIcs, interviewIcsDataUrl } from "@/src/features/teams/interviewIcs";
import type { DynamicFieldDefinition } from "@/src/shared_components/DynamicFieldBuilder";

async function gateOrganizerAdvanced(user: { userId: string }, organizerId: string) {
  const advanced = await hasModuleAccess(organizerId, "teams_advanced_roles");
  if (!advanced) return safeFail("PLAN", "Advanced team roles are locked on this plan.");
  const allowed = await can(user, "teams:manage", { organizerId });
  if (!allowed) return safeFail("FORBIDDEN", "Not allowed.");
  return null;
}

const fieldSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  type: z.string().min(1),
  options: z.array(z.string()).optional(),
  required: z.boolean().optional(),
  id: z.string().optional(),
});

export const saveOrganizerRecruitmentFormAction = safeAction({
  input: z.object({
    organizerId: z.string().uuid(),
    formId: z.string().uuid().optional(),
    teamId: z.string().uuid(),
    positionId: z.string().uuid().nullable().optional(),
    title: z.string().min(1).max(200),
    intro: z.string().max(5000).optional(),
    closesAt: z.string().nullable().optional(),
    cap: z.number().int().positive().nullable().optional(),
    isOpen: z.boolean(),
    fields: z.array(fieldSchema).max(80),
  }),
  auth: async () => {
    const user = await AuthService.getCurrentUser();
    if (!user) return safeFail("UNAUTHORIZED", "Sign in required.");
    return user;
  },
  async run(input, user) {
    const denied = await gateOrganizerAdvanced(user, input.organizerId);
    if (denied) return denied;
    const owns = await TeamEngineService.organizerOwnsStaffTeam(input.organizerId, input.teamId);
    if (!owns) return safeFail("FORBIDDEN", "Team not found in your library.");

    const fields = input.fields as DynamicFieldDefinition[];
    try {
      if (input.formId) {
        const existing = await TeamEngineService.getRecruitmentForm(input.formId);
        if (!existing || existing.teamId !== input.teamId) {
          return safeFail("NOT_FOUND", "Form not found.");
        }
        await TeamEngineService.saveRecruitmentForm(input.formId, {
          title: input.title,
          fields,
          isOpen: input.isOpen,
          intro: input.intro ?? "",
          closesAt: input.closesAt ?? null,
          cap: input.cap ?? null,
          positionId: input.positionId ?? null,
        });
        return safeOk({ formId: input.formId });
      }
      const formId = await TeamEngineService.createRecruitmentForm({
        teamId: input.teamId,
        positionId: input.positionId ?? null,
        title: input.title,
        fields,
        isOpen: input.isOpen,
        intro: input.intro ?? "",
        closesAt: input.closesAt ?? null,
        cap: input.cap ?? null,
      });
      return safeOk({ formId });
    } catch (err) {
      return safeFail("SAVE", err instanceof Error ? err.message : "Could not save the form.");
    }
  },
});

export const duplicateOrganizerRecruitmentFormAction = safeAction({
  input: z.object({ organizerId: z.string().uuid(), formId: z.string().uuid() }),
  auth: async () => {
    const user = await AuthService.getCurrentUser();
    if (!user) return safeFail("UNAUTHORIZED", "Sign in required.");
    return user;
  },
  async run(input, user) {
    const denied = await gateOrganizerAdvanced(user, input.organizerId);
    if (denied) return denied;
    const form = await TeamEngineService.getRecruitmentForm(input.formId);
    if (!form) return safeFail("NOT_FOUND", "Form not found.");
    const owns = await TeamEngineService.organizerOwnsStaffTeam(input.organizerId, form.teamId);
    if (!owns) return safeFail("FORBIDDEN", "Not allowed.");
    try {
      const formId = await TeamEngineService.duplicateRecruitmentForm(input.formId);
      return safeOk({ formId });
    } catch (err) {
      return safeFail("DUPLICATE", err instanceof Error ? err.message : "Could not duplicate.");
    }
  },
});

export const setOrganizerRecruitmentFormOpenAction = safeAction({
  input: z.object({
    organizerId: z.string().uuid(),
    formId: z.string().uuid(),
    isOpen: z.boolean(),
  }),
  auth: async () => {
    const user = await AuthService.getCurrentUser();
    if (!user) return safeFail("UNAUTHORIZED", "Sign in required.");
    return user;
  },
  async run(input, user) {
    const denied = await gateOrganizerAdvanced(user, input.organizerId);
    if (denied) return denied;
    const form = await TeamEngineService.getRecruitmentForm(input.formId);
    if (!form) return safeFail("NOT_FOUND", "Form not found.");
    const owns = await TeamEngineService.organizerOwnsStaffTeam(input.organizerId, form.teamId);
    if (!owns) return safeFail("FORBIDDEN", "Not allowed.");
    await TeamEngineService.setRecruitmentFormOpen(input.formId, input.isOpen);
    return safeOk({ isOpen: input.isOpen });
  },
});

export const deleteOrganizerRecruitmentFormAction = safeAction({
  input: z.object({ organizerId: z.string().uuid(), formId: z.string().uuid() }),
  auth: async () => {
    const user = await AuthService.getCurrentUser();
    if (!user) return safeFail("UNAUTHORIZED", "Sign in required.");
    return user;
  },
  async run(input, user) {
    const denied = await gateOrganizerAdvanced(user, input.organizerId);
    if (denied) return denied;
    const form = await TeamEngineService.getRecruitmentForm(input.formId);
    if (!form) return safeFail("NOT_FOUND", "Form not found.");
    const owns = await TeamEngineService.organizerOwnsStaffTeam(input.organizerId, form.teamId);
    if (!owns) return safeFail("FORBIDDEN", "Not allowed.");
    await TeamEngineService.deleteRecruitmentForm(input.formId);
    return safeOk({ deleted: true as const });
  },
});

export const setOrganizerApplicantStatusAction = safeAction({
  input: z.object({
    organizerId: z.string().uuid(),
    applicantId: z.string().uuid(),
    status: z.enum(APPLICANT_STATUSES as [ApplicantStatus, ...ApplicantStatus[]]),
    interviewAt: z.string().optional(),
    interviewNotes: z.string().max(2000).optional(),
    interviewLink: z.string().max(500).optional(),
    interviewLocation: z.string().max(500).optional(),
    interviewTz: z.string().max(80).optional(),
    emailSubject: z.string().max(200).optional(),
    emailBody: z.string().max(5000).optional(),
    grantAfterOnboard: z.boolean().optional(),
  }),
  auth: async () => {
    const user = await AuthService.getCurrentUser();
    if (!user) return safeFail("UNAUTHORIZED", "Sign in required.");
    return user;
  },
  async run(input, user) {
    const denied = await gateOrganizerAdvanced(user, input.organizerId);
    if (denied) return denied;

    const applicant = await TeamEngineService.getApplicant(input.applicantId);
    if (!applicant) return safeFail("NOT_FOUND", "Applicant not found.");
    const owns = await TeamEngineService.organizerOwnsStaffTeam(
      input.organizerId,
      applicant.teamId,
    );
    if (!owns) return safeFail("FORBIDDEN", "Not allowed.");

    const name = String(applicant.responses?.name || applicant.email || "Applicant");
    let copyableMessage: string | null = null;
    let icsDataUrl: string | null = null;
    let message = "Pipeline updated.";
    let memberId: string | null = null;
    let needsGrant = false;

    const willEmail =
      (input.status === "shortlisted" || input.status === "interview_scheduled") &&
      !!applicant.email;

    if (willEmail || (input.status === "accepted" && applicant.email)) {
      // Interview / shortlist: soft-fail to copyable when no connection.
      // Onboard invite still requires connection for emailed set-password link,
      // but we still create the member when possible.
    }

    try {
      if (input.status === "interview_scheduled") {
        const whenLabel = input.interviewAt
          ? new Date(input.interviewAt).toLocaleString(undefined, {
              timeZone: input.interviewTz || undefined,
              dateStyle: "full",
              timeStyle: "short",
            })
          : "";
        const interviewExtras = {
          whenLabel,
          location: input.interviewLocation,
          link: input.interviewLink,
          notes: input.interviewNotes,
        };
        const ics = buildInterviewIcs({
          title: `Interview — ${name}`,
          description: input.interviewNotes || "Staff interview",
          startsAt: input.interviewAt || new Date().toISOString(),
          location: input.interviewLocation,
          url: input.interviewLink,
        });
        icsDataUrl = interviewIcsDataUrl(ics);

        const connected = await requireConnectedSender(input.organizerId);
        if (!connected.connected) {
          copyableMessage = [
            `Hello ${name},`,
            "",
            "Your interview has been scheduled.",
            whenLabel ? `When: ${whenLabel}` : "",
            input.interviewLocation ? `Where: ${input.interviewLocation}` : "",
            input.interviewLink ? `Link: ${input.interviewLink}` : "",
            input.interviewNotes || "",
          ]
            .filter(Boolean)
            .join("\n");
          message =
            "Interview saved. Connect email to send automatically — copy the message or download .ics.";
        } else {
          const { sendRecruitmentEmail } = await import("@/src/features/teams/recruitmentEmail");
          const mailed = await sendRecruitmentEmail({
            organizerId: input.organizerId,
            to: applicant.email,
            name,
            kind: "interview",
            subject: input.emailSubject,
            bodyHtml: input.emailBody,
            interview: interviewExtras,
          });
          if (!mailed.ok) {
            copyableMessage = [
              `Hello ${name},`,
              "",
              "Your interview has been scheduled.",
              whenLabel ? `When: ${whenLabel}` : "",
              input.interviewLocation ? `Where: ${input.interviewLocation}` : "",
              input.interviewLink ? `Link: ${input.interviewLink}` : "",
            ]
              .filter(Boolean)
              .join("\n");
            message = mailed.message;
          } else {
            message = "Interview scheduled and emailed.";
          }
        }
      }

      if (input.status === "shortlisted" && applicant.email) {
        const connected = await requireConnectedSender(input.organizerId);
        if (connected.connected) {
          const { sendRecruitmentEmail } = await import("@/src/features/teams/recruitmentEmail");
          const mailed = await sendRecruitmentEmail({
            organizerId: input.organizerId,
            to: applicant.email,
            name,
            kind: "shortlisted",
            subject: input.emailSubject,
            bodyHtml: input.emailBody,
          });
          if (!mailed.ok) message = mailed.message;
          else message = "Shortlisted and notified.";
        } else {
          message = "Shortlisted. Connect email to notify automatically.";
        }
      }

      const outcome = await TeamEngineService.setApplicantStatus({
        applicantId: input.applicantId,
        status: input.status,
        interviewAt: input.interviewAt || null,
        interviewNotes: input.interviewNotes,
        interviewLink: input.interviewLink || null,
        interviewLocation: input.interviewLocation || null,
        interviewTz: input.interviewTz || null,
      });

      if (input.status === "accepted" && outcome.needsJoin) {
        const onboarded = await TeamEngineService.onboardApplicantWithoutUser({
          applicantId: input.applicantId,
        });
        memberId = onboarded.memberId;
        needsGrant = !!input.grantAfterOnboard;
        const connected = await requireConnectedSender(input.organizerId);
        if (connected.connected) {
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
              organizerId: input.organizerId,
              to: onboarded.email,
              name: onboarded.displayName,
              kind: "onboarded",
              inviteLink,
              subject: input.emailSubject,
              bodyHtml: input.emailBody,
            });
            if (!mailed.ok) {
              copyableMessage = `Set your password: ${inviteLink}`;
              message = mailed.message;
            } else {
              message = "Onboarded and invite emailed (no password in email).";
            }
          } else {
            message = "Onboarded. Invite link could not be generated.";
          }
          if (linkData?.user?.id) {
            const { TABLES } = await import("@/data/collections");
            await supabaseAdmin
              .from(TABLES.TEAM_MEMBERS)
              .update({ user_id: linkData.user.id })
              .eq("id", onboarded.memberId);
          }
        } else {
          message = "Onboarded to roster. Connect email to send the set-password invite.";
        }
      } else if (input.status === "accepted" && outcome.memberCreated) {
        message = "Onboarded — already had an account.";
        needsGrant = !!input.grantAfterOnboard;
      }

      return safeOk({
        message,
        copyableMessage,
        icsDataUrl,
        memberId,
        needsGrant,
      });
    } catch (err) {
      return safeFail("STATUS", err instanceof Error ? err.message : "Could not update applicant.");
    }
  },
});

export const saveOrganizerApplicantNotesAction = safeAction({
  input: z.object({
    organizerId: z.string().uuid(),
    applicantId: z.string().uuid(),
    privateNotes: z.string().max(8000),
  }),
  auth: async () => {
    const user = await AuthService.getCurrentUser();
    if (!user) return safeFail("UNAUTHORIZED", "Sign in required.");
    return user;
  },
  async run(input, user) {
    const denied = await gateOrganizerAdvanced(user, input.organizerId);
    if (denied) return denied;
    const applicant = await TeamEngineService.getApplicant(input.applicantId);
    if (!applicant) return safeFail("NOT_FOUND", "Applicant not found.");
    const owns = await TeamEngineService.organizerOwnsStaffTeam(
      input.organizerId,
      applicant.teamId,
    );
    if (!owns) return safeFail("FORBIDDEN", "Not allowed.");
    await TeamEngineService.updateApplicantNotes(input.applicantId, input.privateNotes);
    return safeOk({ saved: true as const });
  },
});
