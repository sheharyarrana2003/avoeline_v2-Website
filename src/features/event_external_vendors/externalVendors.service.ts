import { cache } from "react";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { isExternalVendorStatus, type EventExternalVendor } from "./types";

function mapRow(row: Record<string, unknown>): EventExternalVendor {
  const statusRaw = String(row.status || "planned");
  return {
    id: String(row.id),
    eventId: String(row.event_id),
    name: String(row.name || ""),
    vendorType: String(row.vendor_type || ""),
    description: String(row.description || ""),
    budget: row.budget == null ? null : Number(row.budget),
    contact: String(row.contact || ""),
    status: isExternalVendorStatus(statusRaw) ? statusRaw : "planned",
    createdBy: row.created_by ? String(row.created_by) : null,
    createdAt: row.created_at ? String(row.created_at) : null,
    updatedAt: row.updated_at ? String(row.updated_at) : null,
  };
}

export const listExternalVendors = cache(
  async (eventId: string): Promise<EventExternalVendor[]> => {
    if (!eventId) return [];
    const { data, error } = await supabaseAdmin
      .from(TABLES.EVENT_EXTERNAL_VENDORS)
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r) => mapRow(r as Record<string, unknown>));
  },
);
