import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { seatsLeftOf, tierWindowClosed } from "./tierWindow.logic";

export type TicketTier = {
  id: string;
  eventId: string;
  name: string;
  description: string;
  price: number;
  seatsAvailable: number | null;
  seatsSold: number;
  /** null when seats are not tracked. */
  seatsLeft: number | null;
  availableUntil: string | null;
  active: boolean;
};

export { seatsLeftOf, tierWindowClosed } from "./tierWindow.logic";

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
  perEmailLimit: number | null;
  /** Sum of discount_amount from promo_redemptions. */
  totalDiscounted: number;
};

export const TicketingService = {
  async listTiers(eventId: string): Promise<TicketTier[]> {
    const { data, error } = await supabaseAdmin
      .from(TABLES.TICKET_TIERS)
      .select("*")
      .eq("event_id", eventId);
    if (error) throw error;
    const now = Date.now();
    return (data ?? []).map((r) => {
      const seatsSold = Number(r.seats_sold) || 0;
      const seatsAvailable = r.seats_available;
      const windowClosed = tierWindowClosed(r.available_until, now);
      return {
        id: r.id,
        eventId: r.event_id,
        name: r.name,
        description: r.description || "",
        price: Number(r.price) || 0,
        seatsAvailable,
        seatsSold,
        seatsLeft: seatsLeftOf(seatsAvailable, seatsSold),
        availableUntil: r.available_until,
        // Past available_until demotes active at read (same pattern as promo expiry).
        active: r.active !== false && !windowClosed,
      };
    });
  },

  async createTier(
    eventId: string,
    input: {
      name: string;
      price: number;
      seatsAvailable?: number;
      description?: string;
      availableUntil?: string | null;
      active?: boolean;
    },
  ) {
    const { data, error } = await supabaseAdmin
      .from(TABLES.TICKET_TIERS)
      .insert({
        event_id: eventId,
        name: input.name,
        price: input.price,
        seats_available: input.seatsAvailable ?? null,
        description: input.description || "",
        available_until: input.availableUntil || null,
        active: input.active !== false,
      })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  async updateTier(
    eventId: string,
    id: string,
    patch: { availableUntil?: string | null; active?: boolean; name?: string; price?: number },
  ) {
    const { error } = await supabaseAdmin
      .from(TABLES.TICKET_TIERS)
      .update({
        ...(patch.name !== undefined ? { name: patch.name } : {}),
        ...(patch.price !== undefined ? { price: patch.price } : {}),
        ...(patch.availableUntil !== undefined ? { available_until: patch.availableUntil } : {}),
        ...(patch.active !== undefined ? { active: patch.active } : {}),
      })
      .eq("id", id)
      .eq("event_id", eventId);
    if (error) throw error;
  },

  async deleteTier(eventId: string, id: string) {
    const { error } = await supabaseAdmin
      .from(TABLES.TICKET_TIERS)
      .delete()
      .eq("id", id)
      .eq("event_id", eventId);
    if (error) throw error;
  },

  async listPromos(eventId: string): Promise<PromoCode[]> {
    const { data, error } = await supabaseAdmin
      .from(TABLES.PROMO_CODES)
      .select("*")
      .eq("event_id", eventId);
    if (error) throw error;
    const promos = data ?? [];
    const ids = promos.map((p) => p.id);
    const discountedByPromo = new Map<string, number>();
    if (ids.length) {
      const { data: redemptions } = await supabaseAdmin
        .from(TABLES.PROMO_REDEMPTIONS)
        .select("promo_id, discount_amount")
        .in("promo_id", ids);
      for (const row of redemptions ?? []) {
        const prev = discountedByPromo.get(row.promo_id) ?? 0;
        discountedByPromo.set(row.promo_id, prev + (Number(row.discount_amount) || 0));
      }
    }
    const now = Date.now();
    return promos.map((r) => {
      const expired = r.expires_at ? new Date(r.expires_at).getTime() <= now : false;
      return {
        id: r.id,
        eventId: r.event_id,
        code: r.code,
        discountType: r.discount_type,
        value: Number(r.value) || 0,
        usageLimit: r.usage_limit,
        usageCount: Number(r.usage_count) || 0,
        expiresAt: r.expires_at,
        active: r.active !== false && !expired,
        trackId: r.track_id || null,
        perEmailLimit: r.per_email_limit ?? null,
        totalDiscounted: discountedByPromo.get(r.id) ?? 0,
      };
    });
  },

  async createPromo(
    eventId: string,
    input: {
      code: string;
      discountType: "percent" | "flat";
      value: number;
      usageLimit?: number;
      trackId?: string | null;
      expiresAt?: string | null;
      active?: boolean;
    },
  ) {
    const { data, error } = await supabaseAdmin
      .from(TABLES.PROMO_CODES)
      .insert({
        event_id: eventId,
        code: input.code.trim().toUpperCase(),
        discount_type: input.discountType,
        value: input.value,
        usage_limit: input.usageLimit ?? null,
        track_id: input.trackId || null,
        expires_at: input.expiresAt || null,
        active: input.active !== false,
      })
      .select("*")
      .single();
    if (error) throw error;
    return data;
  },

  async updatePromo(eventId: string, id: string, patch: { active?: boolean }) {
    const { error } = await supabaseAdmin
      .from(TABLES.PROMO_CODES)
      .update(patch)
      .eq("id", id)
      .eq("event_id", eventId);
    if (error) throw error;
  },

  async deletePromo(eventId: string, id: string) {
    const { error } = await supabaseAdmin
      .from(TABLES.PROMO_CODES)
      .delete()
      .eq("id", id)
      .eq("event_id", eventId);
    if (error) throw error;
  },

  /** Soft preview only — does not increment usage or write redemptions. */
  async previewPromo(
    eventId: string,
    code: string,
    price: number,
    trackId?: string | null,
  ): Promise<
    { total: number; discount: number; code: string; promoId: string } | { error: string }
  > {
    const { data } = await supabaseAdmin
      .from(TABLES.PROMO_CODES)
      .select("*")
      .eq("event_id", eventId)
      .eq("code", code.trim().toUpperCase())
      .maybeSingle();
    if (!data || !data.active) return { error: "Invalid promo code." };
    if (data.track_id && trackId && data.track_id !== trackId)
      return { error: "That code is for a different competition." };
    if (data.track_id && !trackId) return { error: "That code applies to one competition only." };
    if (data.expires_at && new Date(data.expires_at) < new Date())
      return { error: "This code has expired." };
    if (data.usage_limit && data.usage_count >= data.usage_limit)
      return { error: "This code is exhausted." };
    const discount =
      data.discount_type === "percent"
        ? Math.round(((price * Number(data.value)) / 100) * 100) / 100
        : Math.min(price, Number(data.value) || 0);
    return {
      total: Math.max(0, price - discount),
      discount,
      code: data.code,
      promoId: data.id,
    };
  },

  /** @deprecated Prefer previewPromo + redeemPromo after insert. */
  async applyPromo(
    eventId: string,
    code: string,
    price: number,
    trackId?: string | null,
  ): Promise<{ amountPaid: number; code: string; promoId: string } | { error: string }> {
    const preview = await this.previewPromo(eventId, code, price, trackId);
    if ("error" in preview) return preview;
    return { amountPaid: preview.total, code: preview.code, promoId: preview.promoId };
  },

  /**
   * Atomic redeem via `redeem_promo` RPC after the registration/group row exists.
   * Pass exactly one of registrationId or groupId.
   */
  async redeemPromo(args: {
    promoId: string;
    eventId: string;
    trackId?: string | null;
    email: string;
    listPrice: number;
    registrationId?: string | null;
    groupId?: string | null;
  }): Promise<
    { original: number; discount: number; total: number; code: string } | { error: string }
  > {
    const regId = args.registrationId ?? null;
    const groupId = args.groupId ?? null;
    if ((regId && groupId) || (!regId && !groupId)) {
      return { error: "Promo redemption needs a registration or a group." };
    }
    const { data, error } = await supabaseAdmin.rpc("redeem_promo", {
      p_promo_id: args.promoId,
      p_event_id: args.eventId,
      p_track_id: (args.trackId || null) as string,
      p_email: args.email,
      p_list_price: args.listPrice,
      p_registration_id: regId as string,
      p_group_id: groupId as string,
    });
    if (error) {
      const msg = error.message || "";
      if (/promo_exhausted/i.test(msg)) return { error: "This code is exhausted." };
      if (/promo_expired/i.test(msg)) return { error: "This code has expired." };
      if (/promo_inactive/i.test(msg)) return { error: "Invalid promo code." };
      if (/promo_email_limit/i.test(msg))
        return { error: "This code has already been used with that email." };
      if (/promo_wrong_scope/i.test(msg))
        return { error: "That code is for a different competition." };
      if (/promo_not_found/i.test(msg)) return { error: "Invalid promo code." };
      console.error("[TicketingService.redeemPromo]", error);
      return { error: "That promo code could not be applied." };
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return { error: "That promo code could not be applied." };
    return {
      original: Number(row.original_amount) || args.listPrice,
      discount: Number(row.discount_amount) || 0,
      total: Number(row.total_amount) || 0,
      code: String(row.promo_code || ""),
    };
  },
};
