import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";

export type TicketTier = {
  id: string;
  eventId: string;
  name: string;
  description: string;
  price: number;
  seatsAvailable: number | null;
  seatsSold: number;
  availableUntil: string | null;
};

export type PromoCode = {
  id: string;
  eventId: string;
  code: string;
  discountType: "percent" | "flat";
  value: number;
  usageLimit: number | null;
  usageCount: number;
  expiresAt: string | null;
  active: boolean;
  trackId: string | null;
};

export const TicketingService = {
  async listTiers(eventId: string): Promise<TicketTier[]> {
    const { data, error } = await supabaseAdmin.from(TABLES.TICKET_TIERS).select("*").eq("event_id", eventId);
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id: r.id,
      eventId: r.event_id,
      name: r.name,
      description: r.description || "",
      price: Number(r.price) || 0,
      seatsAvailable: r.seats_available,
      seatsSold: Number(r.seats_sold) || 0,
      availableUntil: r.available_until,
    }));
  },

  async createTier(eventId: string, input: { name: string; price: number; seatsAvailable?: number; description?: string }) {
    const { data, error } = await supabaseAdmin.from(TABLES.TICKET_TIERS).insert({
      event_id: eventId,
      name: input.name,
      price: input.price,
      seats_available: input.seatsAvailable ?? null,
      description: input.description || "",
    }).select("*").single();
    if (error) throw error;
    return data;
  },

  async deleteTier(id: string) {
    const { error } = await supabaseAdmin.from(TABLES.TICKET_TIERS).delete().eq("id", id);
    if (error) throw error;
  },

  async listPromos(eventId: string): Promise<PromoCode[]> {
    const { data, error } = await supabaseAdmin.from(TABLES.PROMO_CODES).select("*").eq("event_id", eventId);
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id: r.id,
      eventId: r.event_id,
      code: r.code,
      discountType: r.discount_type,
      value: Number(r.value) || 0,
      usageLimit: r.usage_limit,
      usageCount: Number(r.usage_count) || 0,
      expiresAt: r.expires_at,
      active: r.active !== false,
      trackId: r.track_id || null,
    }));
  },

  async createPromo(eventId: string, input: { code: string; discountType: "percent" | "flat"; value: number; usageLimit?: number; trackId?: string | null }) {
    const { data, error } = await supabaseAdmin.from(TABLES.PROMO_CODES).insert({
      event_id: eventId,
      code: input.code.trim().toUpperCase(),
      discount_type: input.discountType,
      value: input.value,
      usage_limit: input.usageLimit ?? null,
      track_id: input.trackId || null,
    }).select("*").single();
    if (error) throw error;
    return data;
  },

  async applyPromo(eventId: string, code: string, price: number, trackId?: string | null): Promise<{ amountPaid: number; code: string } | { error: string }> {
    const { data } = await supabaseAdmin
      .from(TABLES.PROMO_CODES)
      .select("*")
      .eq("event_id", eventId)
      .eq("code", code.trim().toUpperCase())
      .maybeSingle();
    if (!data || !data.active) return { error: "Invalid promo code." };
    if (data.track_id && trackId && data.track_id !== trackId) return { error: "That code is for a different competition." };
    if (data.track_id && !trackId) return { error: "That code applies to one competition only." };
    if (data.expires_at && new Date(data.expires_at) < new Date()) return { error: "This code has expired." };
    if (data.usage_limit && data.usage_count >= data.usage_limit) return { error: "This code is exhausted." };
    const discount = data.discount_type === "percent" ? (price * Number(data.value)) / 100 : Number(data.value);
    return { amountPaid: Math.max(0, price - discount), code: data.code };
  },
};
