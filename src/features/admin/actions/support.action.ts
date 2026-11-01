"use server";

import { revalidatePath } from "next/cache";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { TABLES } from "@/data/collections";
import { SUPPORT_ATTACHMENTS_BUCKET, supabaseAdmin } from "@/data/supabase";
import { type ActionResult, fail, ok } from "@/src/lib/action";
import { AuthService } from "@/src/features/auth/authService";
import { absoluteUrl } from "@/src/lib/appUrl";
import { sendNotification } from "@/src/lib/notifications";
import { NotificationServices } from "@/src/services/notification.services";
import { canManageArea, isTicketStatus } from "../types";
import { sendSupportStatusEmail } from "@/src/features/email/platformMail.service";
import { logger } from "@/src/lib/logger";

const SUPPORT_MAX_BYTES = 10 * 1024 * 1024;
const SUPPORT_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/zip",
  "application/x-zip-compressed",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function safeFileName(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9.-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(-80) || "file"
  );
}

function revalidateTicket(ticketId: string) {
  revalidatePath("/support");
  revalidatePath(`/support/${ticketId}`);
  revalidatePath("/admin/support");
  revalidatePath(`/admin/support/${ticketId}`);
}

/**
 * Support tickets (spec 9.7).
 *
 * The spec asks for the admin's list, but a list nothing can write to would be
 * permanently empty -- so the submit half is here too. It requires a signed-in
 * caller of any role, and takes the role and email from the session rather than
 * the form: a ticket that could claim to be from anybody is worse than none.
 */
export async function submitTicket(
  prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await AuthService.getCurrentUser();
    if (!user?.userId) return fail("Please sign in to contact support.");

    const subject = String(formData.get("subject") ?? "").trim();
    const body = String(formData.get("body") ?? "").trim();
    if (!subject) return fail("Give your request a subject.");
    if (!body) return fail("Describe what you need help with.");

    const now = new Date().toISOString();
    const { data: ticket, error } = await supabaseAdmin
      .from(TABLES.SUPPORT_TICKETS)
      .insert({
        from_user_id: user.userId,
        from_email: user.email ?? "",
        from_role: String(user.userType ?? "attendee"),
        subject: subject.slice(0, 160),
        body: body.slice(0, 4000),
        status: "open",
        admin_note: "",
        created_at: now,
        updated_at: now,
      })
      .select("id")
      .single();
    if (error) throw error;

    await supabaseAdmin.from(TABLES.SUPPORT_TICKET_MESSAGES).insert({
      ticket_id: ticket.id,
      author_user_id: user.userId,
      body: body.slice(0, 4000),
      created_at: now,
    });

    revalidatePath("/support");
    revalidatePath("/admin/support");
    return ok();
  } catch (err) {
    if (isRedirectError(err)) throw err;
    console.error("[submitTicket]", err);
    return fail("Could not send that. Please try again.");
  }
}

/** Move a ticket between Open, In progress and Resolved, and leave a note. */
export async function updateTicket(
  prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const admin = await AuthService.requireAdmin("support");
    if (!admin || !canManageArea(admin, "support")) {
      return fail("You do not have permission to work support tickets.");
    }

    const ticketId = String(formData.get("ticketId") ?? "").trim();
    const status = String(formData.get("status") ?? "");
    if (!isTicketStatus(status)) return fail("That is not a ticket status.");

    if (!ticketId) return fail("That ticket no longer exists.");
    const { data: existing, error: readErr } = await supabaseAdmin
      .from(TABLES.SUPPORT_TICKETS)
      .select("id, subject, from_user_id, admin_note")
      .eq("id", ticketId)
      .maybeSingle();
    if (readErr) throw readErr;
    if (!existing) return fail("That ticket no longer exists.");

    const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (formData.has("adminNote")) {
      patch.admin_note = String(formData.get("adminNote") ?? "")
        .trim()
        .slice(0, 2000);
    }
    const { error } = await supabaseAdmin
      .from(TABLES.SUPPORT_TICKETS)
      .update(patch)
      .eq("id", ticketId);
    if (error) throw error;

    if (existing.from_user_id) {
      const deepLink = await absoluteUrl(`/support/${ticketId}`);
      await sendSupportStatusEmail({
        toUserId: existing.from_user_id,
        subject: existing.subject,
        status,
        body: formData.has("adminNote")
          ? String(formData.get("adminNote") ?? "")
              .trim()
              .slice(0, 500) || undefined
          : undefined,
        actionUrl: deepLink,
      }).catch((err) =>
        logger.warn("[updateTicket] support status email failed", {
          err: err instanceof Error ? err.message : "unknown",
        }),
      );
    }

    revalidateTicket(ticketId);
    return ok();
  } catch (err) {
    if (isRedirectError(err)) throw err;
    console.error("[updateTicket]", err);
    return fail("Could not update that ticket. Please try again.");
  }
}

/** Requester may reopen a resolved ticket. */
export async function reopenTicket(
  prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await AuthService.getCurrentUser();
    if (!user?.userId) return fail("Please sign in.");

    const ticketId = String(formData.get("ticketId") ?? "").trim();
    if (!ticketId) return fail("That ticket no longer exists.");

    const { data: ticket, error: readErr } = await supabaseAdmin
      .from(TABLES.SUPPORT_TICKETS)
      .select("id, from_user_id, status")
      .eq("id", ticketId)
      .maybeSingle();
    if (readErr) throw readErr;
    if (!ticket) return fail("That ticket no longer exists.");
    if (ticket.from_user_id !== user.userId) return fail("You can only reopen your own tickets.");
    if (ticket.status !== "resolved") return fail("Only resolved tickets can be reopened.");

    const { error } = await supabaseAdmin
      .from(TABLES.SUPPORT_TICKETS)
      .update({ status: "open", updated_at: new Date().toISOString() })
      .eq("id", ticketId);
    if (error) throw error;

    revalidateTicket(ticketId);
    return ok();
  } catch (err) {
    if (isRedirectError(err)) throw err;
    console.error("[reopenTicket]", err);
    return fail("Could not reopen that ticket.");
  }
}

/** Reply on a ticket thread (admin with manage, or the requester). Optional attachment. */
export async function replyToTicket(
  prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await AuthService.getCurrentUser();
    if (!user?.userId) return fail("Please sign in.");

    const ticketId = String(formData.get("ticketId") ?? "").trim();
    const body = String(formData.get("body") ?? "").trim();
    if (!ticketId) return fail("That ticket no longer exists.");
    if (!body) return fail("Write a reply.");

    const { data: ticket, error: readErr } = await supabaseAdmin
      .from(TABLES.SUPPORT_TICKETS)
      .select("id, from_user_id, from_email, subject, status")
      .eq("id", ticketId)
      .maybeSingle();
    if (readErr) throw readErr;
    if (!ticket) return fail("That ticket no longer exists.");

    const isRequester = ticket.from_user_id === user.userId;
    const admin = await AuthService.requireAdmin("support");
    const asAdmin = !!admin && canManageArea(admin, "support");
    if (!isRequester && !asAdmin) return fail("You cannot reply on this ticket.");

    const file = formData.get("attachment");
    let upload: { path: string; filename: string; mime: string; bytes: number } | null = null;
    if (file && typeof file !== "string" && (file as File).size > 0) {
      const f = file as File;
      if (f.size > SUPPORT_MAX_BYTES) return fail("Attachment must be 10MB or smaller.");
      if (!SUPPORT_MIME.has(f.type) && !f.type.startsWith("image/")) {
        return fail("Allowed attachments: images, PDF, TXT, CSV, ZIP, or DOCX.");
      }
      const path = `${ticketId}/${user.userId}/${crypto.randomUUID()}-${safeFileName(f.name)}`;
      const { error: upErr } = await supabaseAdmin.storage
        .from(SUPPORT_ATTACHMENTS_BUCKET)
        .upload(path, f, { contentType: f.type, upsert: false });
      if (upErr) {
        console.error("[replyToTicket] upload", upErr);
        return fail("Could not upload the attachment.");
      }
      upload = { path, filename: f.name.slice(0, 200), mime: f.type, bytes: f.size };
    }

    const now = new Date().toISOString();
    const { data: message, error: msgErr } = await supabaseAdmin
      .from(TABLES.SUPPORT_TICKET_MESSAGES)
      .insert({
        ticket_id: ticketId,
        author_user_id: user.userId,
        body: body.slice(0, 4000),
        created_at: now,
      })
      .select("id")
      .single();
    if (msgErr) throw msgErr;

    if (upload) {
      const { error: attErr } = await supabaseAdmin.from(TABLES.SUPPORT_TICKET_ATTACHMENTS).insert({
        message_id: message.id,
        storage_path: upload.path,
        filename: upload.filename,
        mime: upload.mime,
        bytes: upload.bytes,
        created_at: now,
      });
      if (attErr) throw attErr;
    }

    const statusPatch =
      asAdmin && ticket.status === "open"
        ? { status: "in_progress" as const }
        : isRequester && ticket.status === "resolved"
          ? { status: "open" as const }
          : {};

    await supabaseAdmin
      .from(TABLES.SUPPORT_TICKETS)
      .update({ ...statusPatch, updated_at: now })
      .eq("id", ticketId);

    const path = asAdmin ? `/support/${ticketId}` : `/admin/support/${ticketId}`;
    const deepLink = await absoluteUrl(path);
    const title = asAdmin ? `Reply on: ${ticket.subject}` : `New reply: ${ticket.subject}`;
    const snippet = body.slice(0, 500);

    const notifyUser = async (userId: string) => {
      await NotificationServices.createNotification({
        userId,
        title,
        message: snippet,
        type: "category_request",
        deepLink: path,
      });
      await sendNotification(
        userId,
        "support_reply",
        { subject: title, body: snippet, message: snippet, ticketId, deepLink },
        ["email"],
      );
    };

    if (asAdmin && ticket.from_user_id) {
      await notifyUser(ticket.from_user_id);
    } else if (isRequester) {
      const { data: admins } = await supabaseAdmin
        .from(TABLES.USERS)
        .select("id")
        .eq("user_type", "platform_admin")
        .eq("account_status", "active")
        .limit(5);
      await Promise.all((admins ?? []).map((a) => notifyUser(a.id)));
    }

    revalidateTicket(ticketId);
    return ok();
  } catch (err) {
    if (isRedirectError(err)) throw err;
    console.error("[replyToTicket]", err);
    return fail("Could not send that reply.");
  }
}
