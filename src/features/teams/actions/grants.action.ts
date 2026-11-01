"use server";

import { createHash, randomBytes } from "crypto";
import { z } from "zod";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { safeAction, safeFail, safeOk } from "@/src/lib/safeAction";
import { AuthService } from "@/src/features/auth/authService";
import { can } from "@/src/features/permissions/can";
import { hasModuleAccess } from "@/src/features/permissions/permissions.service";
import {
  createAccessGrant,
  revokeAccessGrant,
  updateAccessGrant,
} from "@/src/features/permissions/grants.service";
import { ALL_PERMISSION_KEYS } from "@/src/lib/permissions";
import { escapeHtml } from "@/src/lib/email";
import {
  requireConnectedSender,
  sendViaOrganizerConnection,
} from "@/src/features/email/organizerTransport.service";
import { absoluteUrl } from "@/src/lib/appUrl";
import { rateLimit } from "@/src/lib/rateLimit";
import { logger } from "@/src/lib/logger";

function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function newInviteToken(): string {
  return randomBytes(24).toString("base64url");
}

async function auditGrant(
  actorUserId: string,
  action: string,
  extra: Record<string, unknown>,
): Promise<void> {
  try {
    await supabaseAdmin.from(TABLES.MODERATION_LOGS).insert({
      admin_id: actorUserId,
      action,
      target_type: "access_grant",
      target_id: String(extra.grantId || extra.granteeUserId || ""),
      reason: String(extra.reason || action),
      extra,
    });
  } catch (err) {
    logger.warn("[auditGrant] skipped", {
      action,
      err: err instanceof Error ? err.message : String(err),
    });
  }
}

const grantSchema = z.object({
  email: z.string().email(),
  organizerId: z.string().uuid(),
  eventId: z.string().uuid().optional(),
  eventIds: z.array(z.string().uuid()).optional(),
  memberUserId: z.string().uuid().optional(),
  scopeType: z.enum(["organizer", "event"]),
  permissions: z.array(z.string()).min(1),
  expiresAt: z.string().nullable().optional(),
  showTempPasswordOnce: z.boolean().optional(),
  emailSubject: z.string().max(200).optional(),
  emailBody: z.string().max(5000).optional(),
});

export const grantAccessAction = safeAction({
  input: grantSchema,
  auth: async () => {
    const user = await AuthService.getCurrentUser();
    if (!user) return safeFail("UNAUTHORIZED", "Sign in required.");
    return user;
  },
  async run(input, user) {
    const rl = rateLimit(`grant-access:${user.userId}`, 20, 3600);
    if (!rl.ok) return safeFail("RATE_LIMIT", "Too many invites. Try again later.");

    const advanced = await hasModuleAccess(input.organizerId, "teams_advanced_roles");
    if (!advanced) return safeFail("PLAN", "Advanced team roles are locked on this plan.");

    const allowed = await can(user, "teams:manage", {
      organizerId: input.organizerId,
      eventId: input.eventId,
    });
    if (!allowed) return safeFail("FORBIDDEN", "Not allowed.");

    const perms = input.permissions.filter((p) =>
      (ALL_PERMISSION_KEYS as readonly string[]).includes(p),
    );
    if (!perms.length) return safeFail("VALIDATION", "Pick at least one permission.");

    const email = input.email.trim().toLowerCase();
    let scopes: { scopeType: "organizer" | "event"; scopeId: string }[] = [];
    if (input.scopeType === "organizer") {
      scopes = [{ scopeType: "organizer", scopeId: input.organizerId }];
    } else if (input.eventIds?.length) {
      scopes = input.eventIds.map((id) => ({ scopeType: "event" as const, scopeId: id }));
    } else if (input.eventId) {
      scopes = [{ scopeType: "event", scopeId: input.eventId }];
    } else {
      return safeFail("VALIDATION", "Select at least one event or all-events scope.");
    }

    const { data: existing } = await supabaseAdmin
      .from(TABLES.USERS)
      .select("id")
      .eq("email", email)
      .maybeSingle();

    let granteeUserId = input.memberUserId || (existing?.id as string | undefined);
    let tempPasswordOnce: string | undefined;
    let inviteLink: string | null = null;
    let inviteTokenPlain: string | null = null;
    const connection = await requireConnectedSender(input.organizerId);
    const isNewUser = !granteeUserId;

    if (!granteeUserId) {
      const redirectTo = await absoluteUrl("/auth/change-password");
      inviteTokenPlain = newInviteToken();
      const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
        type: "invite",
        email,
        options: { redirectTo, data: { user_type: "organizer" } },
      });
      if (linkErr || !linkData.user) return safeFail("INVITE", "Could not invite that email.");
      granteeUserId = linkData.user.id;
      inviteLink = linkData.properties?.action_link ?? null;

      await supabaseAdmin.from(TABLES.USERS).upsert({
        id: granteeUserId,
        email,
        user_type: "organizer",
        account_status: "active",
        must_reset_password: true,
        updated_at: new Date().toISOString(),
      });

      if (input.showTempPasswordOnce) {
        tempPasswordOnce = `Av-${randomBytes(6).toString("base64url")}`;
        await supabaseAdmin.auth.admin.updateUserById(granteeUserId, {
          password: tempPasswordOnce,
        });
      }
    }

    const inviteTokenHash = inviteTokenPlain ? hashInviteToken(inviteTokenPlain) : null;
    const nowIso = new Date().toISOString();
    let emailed = false;
    let message = "Access grant saved.";

    if (inviteLink && connection.connected) {
      const customSubject = (input.emailSubject || "").trim();
      const customBody = (input.emailBody || "").trim();
      const subject = customSubject || "You're invited to the event team";
      const html = customBody
        ? customBody
            .replaceAll("{{inviteLink}}", escapeHtml(inviteLink))
            .replaceAll("{{email}}", escapeHtml(email))
        : `<p>You've been granted dashboard access on Avoeline.</p><p><a href="${escapeHtml(inviteLink)}">Set your password and open your account</a></p>`;
      const text = `Set your password: ${inviteLink}`;
      const mailed = await sendViaOrganizerConnection({
        organizerId: input.organizerId,
        to: email,
        subject,
        html,
        text,
      });
      if (mailed.ok) {
        emailed = true;
        message = "Invite emailed via Google with a set-password link (no password in the email).";
      } else {
        message = mailed.error || "Grant saved; email could not be sent.";
      }
    } else if (inviteLink && !connection.connected) {
      message = "Grant saved. Connect email to send automatically — copy the invite link below.";
    } else if (!isNewUser) {
      message = "Access grant saved for existing account.";
    }

    const grantIds: string[] = [];
    for (const scope of scopes) {
      const grantId = await createAccessGrant({
        granteeUserId,
        scopeType: scope.scopeType,
        scopeId: scope.scopeId,
        permissions: perms,
        grantedBy: user.userId,
        expiresAt: input.expiresAt ?? null,
        inviteTokenHash: isNewUser ? inviteTokenHash : null,
        inviteSentAt: emailed ? nowIso : null,
      });
      grantIds.push(grantId);
      await auditGrant(user.userId, "access_grant.create", {
        grantId,
        organizerId: input.organizerId,
        granteeUserId,
        scopeType: scope.scopeType,
        scopeId: scope.scopeId,
        emailed,
      });
    }

    return safeOk({
      message,
      tempPasswordOnce,
      inviteLink: !emailed && inviteLink ? inviteLink : null,
      needsEmailConnection: Boolean(inviteLink && !connection.connected),
      grantIds,
    });
  },
});

export const resendGrantInviteAction = safeAction({
  input: z.object({
    grantId: z.string().uuid(),
    organizerId: z.string().uuid(),
    emailSubject: z.string().max(200).optional(),
    emailBody: z.string().max(5000).optional(),
  }),
  auth: async () => {
    const user = await AuthService.getCurrentUser();
    if (!user) return safeFail("UNAUTHORIZED", "Sign in required.");
    return user;
  },
  async run(input, user) {
    if (!(await can(user, "teams:manage", { organizerId: input.organizerId }))) {
      return safeFail("FORBIDDEN", "Not allowed.");
    }
    const advanced = await hasModuleAccess(input.organizerId, "teams_advanced_roles");
    if (!advanced) return safeFail("PLAN", "Advanced team roles are locked on this plan.");

    const { data: grant } = await supabaseAdmin
      .from(TABLES.ACCESS_GRANTS)
      .select("id, grantee_user_id, revoked_at")
      .eq("id", input.grantId)
      .maybeSingle();
    if (!grant || grant.revoked_at) return safeFail("NOT_FOUND", "Grant not found.");

    const { data: grantee } = await supabaseAdmin
      .from(TABLES.USERS)
      .select("id, email")
      .eq("id", grant.grantee_user_id)
      .maybeSingle();
    if (!grantee?.email) return safeFail("VALIDATION", "Grantee has no email.");

    const redirectTo = await absoluteUrl("/auth/change-password");
    const inviteTokenPlain = newInviteToken();
    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: "invite",
      email: grantee.email,
      options: { redirectTo, data: { user_type: "organizer" } },
    });
    if (linkErr) return safeFail("INVITE", "Could not regenerate invite link.");
    const inviteLink = linkData?.properties?.action_link ?? null;
    if (!inviteLink) return safeFail("INVITE", "Invite link missing.");

    const connection = await requireConnectedSender(input.organizerId);
    let emailed = false;
    let message = "Invite link ready.";

    if (connection.connected) {
      const customSubject = (input.emailSubject || "").trim();
      const customBody = (input.emailBody || "").trim();
      const subject = customSubject || "You're invited to the event team";
      const html = customBody
        ? customBody
            .replaceAll("{{inviteLink}}", escapeHtml(inviteLink))
            .replaceAll("{{email}}", escapeHtml(grantee.email))
        : `<p>You've been granted dashboard access on Avoeline.</p><p><a href="${escapeHtml(inviteLink)}">Set your password and open your account</a></p>`;
      const mailed = await sendViaOrganizerConnection({
        organizerId: input.organizerId,
        to: grantee.email,
        subject,
        html,
        text: `Set your password: ${inviteLink}`,
      });
      if (mailed.ok) {
        emailed = true;
        message = "Invite resent via Google (no password in the email).";
      } else {
        message = mailed.error || "Could not send; copy the invite link.";
      }
    } else {
      message = "Connect email to send automatically — copy the invite link below.";
    }

    await updateAccessGrant(input.grantId, {
      inviteTokenHash: hashInviteToken(inviteTokenPlain),
      inviteSentAt: emailed ? new Date().toISOString() : null,
    });
    await auditGrant(user.userId, "access_grant.resend", {
      grantId: input.grantId,
      organizerId: input.organizerId,
      emailed,
    });

    return safeOk({
      message,
      inviteLink: emailed ? null : inviteLink,
      needsEmailConnection: !connection.connected,
    });
  },
});

export const updateGrantAction = safeAction({
  input: z.object({
    grantId: z.string().uuid(),
    organizerId: z.string().uuid(),
    permissions: z.array(z.string()).min(1),
    expiresAt: z.string().nullable().optional(),
  }),
  auth: async () => {
    const user = await AuthService.getCurrentUser();
    if (!user) return safeFail("UNAUTHORIZED", "Sign in required.");
    return user;
  },
  async run(input, user) {
    if (!(await can(user, "teams:manage", { organizerId: input.organizerId }))) {
      return safeFail("FORBIDDEN", "Not allowed.");
    }
    const perms = input.permissions.filter((p) =>
      (ALL_PERMISSION_KEYS as readonly string[]).includes(p),
    );
    if (!perms.length) return safeFail("VALIDATION", "Pick at least one permission.");
    await updateAccessGrant(input.grantId, {
      permissions: perms,
      expiresAt: input.expiresAt ?? null,
    });
    await auditGrant(user.userId, "access_grant.edit", {
      grantId: input.grantId,
      organizerId: input.organizerId,
    });
    return safeOk({ updated: true as const });
  },
});

export const revokeGrantAction = safeAction({
  input: z.object({ grantId: z.string().uuid(), organizerId: z.string().uuid() }),
  auth: async () => {
    const user = await AuthService.getCurrentUser();
    if (!user) return safeFail("UNAUTHORIZED", "Sign in required.");
    return user;
  },
  async run(input, user) {
    if (!(await can(user, "teams:manage", { organizerId: input.organizerId }))) {
      return safeFail("FORBIDDEN", "Not allowed.");
    }
    await revokeAccessGrant(input.grantId);
    await auditGrant(user.userId, "access_grant.revoke", {
      grantId: input.grantId,
      organizerId: input.organizerId,
    });
    return safeOk({ revoked: true as const });
  },
});
