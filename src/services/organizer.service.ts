import { cache } from "react";
import { Organizer } from "./models/organizer.model";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";

function mapToOrganizer(item: Record<string, unknown> | null): Organizer {
  if (!item) {
    return new Organizer("unknown", "unknown@gmail.com", "unknown");
  }
  const organizer = new Organizer(
    String(item.user_id || item.userId || ""),
    String(item.contact_email || (item.contact as { primaryEmail?: string })?.primaryEmail || ""),
    String(item.org_name || (item.organization as { name?: string })?.name || ""),
  );
  organizer.organizerId = String(item.user_id || item.organizerId || organizer.organizerId);
  organizer.organization = {
    type: "individual",
    name: String(item.org_name || organizer.organization.name),
    establishedYear: new Date().getFullYear(),
    description: "",
    logo: "",
    coverImage: "",
  };
  organizer.contact = {
    primaryEmail: String(item.contact_email || organizer.contact.primaryEmail),
    primaryPhone: "",
    socialMedia: {},
  };
  organizer.banking = {
    bankName: String(item.bank_name || ""),
    accountTitle: String(item.account_title || ""),
    accountNumber: String(item.account_number || ""),
    iban: String(item.iban || ""),
    paymentMethods: [],
    payoutSchedule: (item.payout_schedule as Organizer["banking"]["payoutSchedule"]) || "weekly",
    minimumPayout: Number(item.minimum_payout) || 5000,
  };
  organizer.eventStats.totalEventsCreated = Number(item.total_events_created) || 0;
  organizer.eventStats.publishedEvents = Number(item.published_events) || 0;
  organizer.eventStats.completedEvents = Number(item.completed_events) || 0;
  organizer.eventStats.cancelledEvents = Number(item.cancelled_events) || 0;
  organizer.eventStats.totalAttendees = Number(item.total_attendees) || 0;
  organizer.eventStats.totalRevenue = Number(item.total_revenue) || 0;
  organizer.eventStats.averageRating = Number(item.average_rating) || 5;
  organizer.verification.isVerified = Boolean(item.is_verified);
  organizer.plan.type = (item.plan_type as Organizer["plan"]["type"]) || "free";
  return organizer;
}

export const OrganizerService = {
  getOrganizerById: cache(async (id: String) => {
    const { data: profile } = await supabaseAdmin
      .from(TABLES.ORGANIZER_PROFILES)
      .select("*")
      .eq("user_id", String(id))
      .maybeSingle();
    if (profile) return mapToOrganizer(profile);
    const { data: user } = await supabaseAdmin.from(TABLES.USERS).select("*").eq("id", String(id)).maybeSingle();
    if (user) {
      return mapToOrganizer({ user_id: user.id, org_name: user.full_name, contact_email: user.email });
    }
    return mapToOrganizer(null);
  }),
};
