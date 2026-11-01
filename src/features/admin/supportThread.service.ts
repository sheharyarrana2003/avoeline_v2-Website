import { cache } from "react";
import { TABLES } from "@/data/collections";
import { SUPPORT_ATTACHMENTS_BUCKET, getSignedUrl, supabaseAdmin } from "@/data/supabase";
import { toIsoString } from "@/src/lib/datetime";

export type SupportAttachment = {
  id: string;
  messageId: string;
  storagePath: string;
  filename: string;
  mime: string;
  bytes: number;
  signedUrl: string | null;
  createdAt: string;
};

export type SupportMessage = {
  id: string;
  ticketId: string;
  authorUserId: string;
  body: string;
  createdAt: string;
  attachments: SupportAttachment[];
};

export const listTicketMessages = cache(async (ticketId: string): Promise<SupportMessage[]> => {
  if (!ticketId) return [];
  const { data: msgs, error } = await supabaseAdmin
    .from(TABLES.SUPPORT_TICKET_MESSAGES)
    .select("*")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  if (!msgs?.length) return [];

  const messageIds = msgs.map((m) => m.id);
  const { data: atts, error: attErr } = await supabaseAdmin
    .from(TABLES.SUPPORT_TICKET_ATTACHMENTS)
    .select("*")
    .in("message_id", messageIds);
  if (attErr) throw attErr;

  const byMessage = new Map<string, SupportAttachment[]>();
  await Promise.all(
    (atts ?? []).map(async (row) => {
      let signedUrl: string | null = null;
      try {
        signedUrl = await getSignedUrl(SUPPORT_ATTACHMENTS_BUCKET, row.storage_path, 300);
      } catch {
        signedUrl = null;
      }
      const att: SupportAttachment = {
        id: row.id,
        messageId: row.message_id,
        storagePath: row.storage_path,
        filename: row.filename || "file",
        mime: row.mime || "",
        bytes: Number(row.bytes) || 0,
        signedUrl,
        createdAt: toIsoString(row.created_at) || "",
      };
      const list = byMessage.get(row.message_id) ?? [];
      list.push(att);
      byMessage.set(row.message_id, list);
    }),
  );

  return msgs.map((m) => ({
    id: m.id,
    ticketId: m.ticket_id,
    authorUserId: String(m.author_user_id || ""),
    body: String(m.body || ""),
    createdAt: toIsoString(m.created_at) || "",
    attachments: byMessage.get(m.id) ?? [],
  }));
});

export async function getSupportTicket(ticketId: string) {
  if (!ticketId) return null;
  const { data, error } = await supabaseAdmin
    .from(TABLES.SUPPORT_TICKETS)
    .select("*")
    .eq("id", ticketId)
    .maybeSingle();
  if (error) throw error;
  return data;
}
