import { cache } from "react";
import {
  VendorData,
  Contact,
  Service,
  Address,
  PricingPackage,
  Ratings,
  VendorPortfolio,
  PortfolioImage,
  ClientTestimonial,
} from "@/src/services/models/vendor.model";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { vendorIsBookable } from "@/src/features/admin/types";
import type { Database, Json } from "@/src/lib/database.types";

type VendorRow = Database["public"]["Tables"]["vendor_profiles"]["Row"];
type VendorUpdate = Database["public"]["Tables"]["vendor_profiles"]["Update"];

function toDt(v: any): Date {
  if (v && typeof v.toDate === "function") return v.toDate();
  const d = v ? new Date(v) : new Date();
  return isNaN(d.getTime()) ? new Date() : d;
}

function asRecord(v: unknown): Record<string, any> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, any>) : {};
}

function asJson(value: unknown): Json {
  return value as Json;
}

export function mapToAddress(raw: any): Address {
  return {
    street: raw?.street || "",
    city: raw?.city || "",
    country: raw?.country || "",
    coordinates: {
      lat: raw?.coordinates?.lat || 0,
      lng: raw?.coordinates?.lng || 0,
    },
  };
}

export function mapToContact(raw: any): Contact {
  return {
    primaryPhone: raw?.primaryPhone || "",
    secondaryPhone: raw?.secondaryPhone || "",
    businessEmail: raw?.businessEmail || "",
    website: raw?.website || "",
    address: mapToAddress(raw?.address),
  };
}

export function mapToPricingPackage(raw: any): PricingPackage {
  return {
    packageId: raw?.packageId || "",
    name: raw?.name || "",
    description: raw?.description || "",
    inclusions: Array.isArray(raw?.inclusions) ? raw.inclusions : [],
    price: Number(raw?.price) || 0,
    minOrder: Number(raw?.minOrder) || 0,
    customizationOptions: Array.isArray(raw?.customizationOptions) ? raw.customizationOptions : [],
  };
}

export function mapToService(raw: any): Service {
  return {
    serviceId: raw?.serviceId || "",
    name: raw?.name || "",
    description: raw?.description || "",
    category: raw?.category || "",
    inclusions: Array.isArray(raw?.inclusions) ? raw.inclusions : [],
    price: Number(raw?.price) || 0,
    minOrder: Number(raw?.minOrder) || 0,
    images: Array.isArray(raw?.images) ? raw.images : [],
    videos: Array.isArray(raw?.videos) ? raw.videos : [],
  };
}

export function mapToRatings(raw: any): Ratings {
  const totalReviews = Number(raw?.totalReviews) || 0;
  return {
    // A rating with no reviews behind it is not a rating. The vendor model seeds
    // averageRating at 5.0 and only reviewVendor recomputes it, so every vendor
    // who has never been reviewed carries a stored 5.0 — and every screen that
    // read this field advertised a perfect score for them.
    averageRating: totalReviews > 0 ? Number(raw?.averageRating) || 0 : 0,
    totalReviews,
    breakdown: raw?.breakdown || {},
  };
}

export function mapToPortfolio(raw: any): VendorPortfolio {
  const images: PortfolioImage[] = Array.isArray(raw?.images)
    ? raw.images.map((img: any) => ({
        url: img?.url || "",
        caption: img?.caption || "",
        eventType: img?.eventType || "",
        date: img?.date || "",
      }))
    : [];

  const clientTestimonials: ClientTestimonial[] = Array.isArray(raw?.clientTestimonials)
    ? raw.clientTestimonials.map((t: any) => ({
        clientName: t?.clientName || "",
        testimonial: t?.testimonial || "",
        rating: Number(t?.rating) || 0,
        eventDate: t?.eventDate || "",
      }))
    : [];

  return {
    images,
    videos: Array.isArray(raw?.videos) ? raw.videos.filter((v: any) => typeof v === "string") : [],
    clientTestimonials,
    pastEvents: Array.isArray(raw?.pastEvents)
      ? raw.pastEvents.filter((e: any) => typeof e === "string")
      : [],
    coverImage: raw?.coverImage || "",
  };
}

/** Flatten a vendor_profiles row (+ extra jsonb) into the camelCase shape mapToVendorData expects. */
function vendorRowToRaw(row: VendorRow): Record<string, any> {
  const extra = asRecord(row.extra);
  const portfolioCol = asRecord(row.portfolio);
  const portfolioExtra = asRecord(extra.portfolio);
  const ratingsExtra = asRecord(extra.ratings);
  const contactExtra = asRecord(extra.contact);

  return {
    ...extra,
    vendorId: extra.vendorId || row.user_id,
    userId: row.user_id,
    businessName: row.business_name || extra.businessName || "",
    logo: row.logo_url || extra.logo || "",
    contact: {
      ...contactExtra,
      businessEmail: contactExtra.businessEmail || row.business_email || "",
    },
    serviceCategories: Array.isArray(row.service_categories)
      ? row.service_categories
      : Array.isArray(extra.serviceCategories)
        ? extra.serviceCategories
        : [],
    portfolio: {
      ...portfolioExtra,
      ...portfolioCol,
      coverImage: portfolioCol.coverImage || portfolioExtra.coverImage || row.cover_image_url || "",
    },
    pricingPackages: Array.isArray(extra.pricingPackages) ? extra.pricingPackages : [],
    services: Array.isArray(extra.services) ? extra.services : [],
    ratings: {
      averageRating: row.average_rating ?? ratingsExtra.averageRating ?? 0,
      totalReviews: row.total_reviews ?? ratingsExtra.totalReviews ?? 0,
      breakdown: ratingsExtra.breakdown || {},
    },
    stats: {
      ...asRecord(extra.stats),
      totalBookings: row.total_bookings ?? asRecord(extra.stats).totalBookings,
      completedBookings: row.completed_bookings ?? asRecord(extra.stats).completedBookings,
      cancellationRate: row.cancellation_rate ?? asRecord(extra.stats).cancellationRate,
      avgResponseTime: row.avg_response_time ?? asRecord(extra.stats).avgResponseTime,
      repeatClients: row.repeat_clients ?? asRecord(extra.stats).repeatClients,
      totalRevenue: row.total_revenue ?? asRecord(extra.stats).totalRevenue,
    },
    settings: {
      ...asRecord(extra.settings),
      autoAcceptQuotes: row.auto_accept_quotes ?? asRecord(extra.settings).autoAcceptQuotes,
      commissionRate: row.commission_rate ?? asRecord(extra.settings).commissionRate,
    },
    verification: {
      verified: Boolean(row.is_verified ?? asRecord(extra.verification).verified),
      verificationMethod:
        row.verification_method || asRecord(extra.verification).verificationMethod || "unknown",
      verifiedAt: row.verified_at || asRecord(extra.verification).verifiedAt || "",
      verificationBadges: Array.isArray(asRecord(extra.verification).verificationBadges)
        ? asRecord(extra.verification).verificationBadges
        : [],
    },
    status: row.status || extra.status || "active",
    featured: Boolean(row.featured ?? extra.featured),
    createdAt: extra.createdAt,
    updatedAt: row.updated_at ?? extra.updatedAt,
    lastActive: extra.lastActive,
  };
}

export function mapToVendorData(raw: any, fallbackId: string = ""): VendorData {
  return {
    vendorId: raw?.vendorId || fallbackId,
    userId: raw?.userId || "",
    businessName: raw?.businessName || "",
    logo: raw?.logo || "",

    contact: mapToContact(raw?.contact),

    serviceCategories: Array.isArray(raw?.serviceCategories) ? raw.serviceCategories : [],
    portfolio: mapToPortfolio(raw?.portfolio),

    pricingPackages: Array.isArray(raw?.pricingPackages)
      ? raw.pricingPackages.map(mapToPricingPackage)
      : [],

    services: Array.isArray(raw?.services) ? raw.services.map(mapToService) : [],

    ratings: mapToRatings(raw?.ratings),

    stats: raw?.stats || {},
    settings: raw?.settings || {},

    verification: {
      verified: Boolean(raw?.verification?.verified),
      verificationMethod: raw?.verification?.verificationMethod || "unknown",
      verifiedAt: raw?.verification?.verifiedAt || "",
      verificationBadges: Array.isArray(raw?.verification?.verificationBadges)
        ? raw.verification.verificationBadges
        : [],
    },

    status: raw?.status || "active",
    featured: Boolean(raw?.featured),

    createdAt: toDt(raw?.createdAt),
    updatedAt: toDt(raw?.updatedAt),
    lastActive: toDt(raw?.lastActive),
  };
}

function mapVendorRow(row: VendorRow): VendorData {
  return mapToVendorData(vendorRowToRaw(row), row.user_id);
}

/** Merge column + extra patches onto a vendor_profiles row keyed by user_id. */
export async function patchVendorProfile(
  userId: string,
  columns: Record<string, unknown> = {},
  extraPatch?: Record<string, unknown>,
): Promise<void> {
  let extra: Json | undefined;
  if (extraPatch) {
    const { data, error } = await supabaseAdmin
      .from(TABLES.VENDOR_PROFILES)
      .select("extra")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    const current = asRecord(data?.extra);
    extra = asJson({ ...current, ...extraPatch });
  }
  const { portfolio, ...rest } = columns;
  const patch: Record<string, unknown> = {
    ...rest,
    ...(portfolio !== undefined ? { portfolio: asJson(portfolio) } : {}),
    ...(extra !== undefined ? { extra } : {}),
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabaseAdmin
    .from(TABLES.VENDOR_PROFILES)
    .update(patch)
    .eq("user_id", userId);
  if (error) throw error;
}

export const EventVendorService = {
  getVendorsByEvent: async (eventId: string) => {
    const { data: bookingRows, error } = await supabaseAdmin
      .from(TABLES.BOOKINGS)
      .select("id, vendor_id, status, extra")
      .eq("event_id", eventId);
    if (error) throw error;
    if (!bookingRows?.length) return null;

    const validStatuses = ["confirmed", "in_progress", "completed"];
    const active = bookingRows.filter((b) => {
      const extra = asRecord(b.extra);
      const status = String(b.status || extra.status || "");
      return validStatuses.includes(status);
    });

    const vendorIds = [...new Set(active.map((b) => b.vendor_id).filter(Boolean))];
    if (!vendorIds.length) return [];

    return EventVendorService.getVendorsByIds(vendorIds);
  },

  /** Batch fetch by user_id (canonical vendor URL / bookings.vendor_id key). */
  async getVendorsByIds(ids: string[]): Promise<VendorData[]> {
    const unique = [...new Set(ids.map(String).filter(Boolean))];
    if (!unique.length) return [];

    const { data, error } = await supabaseAdmin
      .from(TABLES.VENDOR_PROFILES)
      .select("*")
      .in("user_id", unique);
    if (error) throw error;
    return (data ?? []).map(mapVendorRow);
  },

  getVendorById: cache(async (vendor_id: string) => {
    const id = String(vendor_id || "").trim();
    if (!id) return null;

    // Profiles are keyed by auth uid. Legacy docs also stored vendorId in extra.
    const { data, error } = await supabaseAdmin
      .from(TABLES.VENDOR_PROFILES)
      .select("*")
      .eq("user_id", id)
      .maybeSingle();
    if (error) throw error;
    if (data) return mapVendorRow(data);

    const { data: byExtra, error: extraErr } = await supabaseAdmin
      .from(TABLES.VENDOR_PROFILES)
      .select("*")
      .contains("extra", { vendorId: id })
      .limit(1)
      .maybeSingle();
    if (extraErr) throw extraErr;
    if (!byExtra) return null;
    return mapVendorRow(byExtra);
  }),

  async getAllVendors() {
    const { data, error } = await supabaseAdmin.from(TABLES.VENDOR_PROFILES).select("*").limit(60);
    if (error) throw error;
    if (!data?.length) return null;

    const arr_of_vendors = data.map(mapVendorRow);

    // Spec 9.6: only an approved vendor is bookable.
    return arr_of_vendors.filter((v: VendorData) => vendorIsBookable(v.status));
  },
};
