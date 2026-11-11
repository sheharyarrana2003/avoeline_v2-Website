import "server-only";

import { cache } from "react";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { absoluteUrl } from "@/src/lib/appUrl";
import { formatCurrency } from "@/src/lib/money";
import { rateLimit } from "@/src/lib/rateLimit";
import { eventLifecycle } from "@/src/lib/eventState";
import {
  competitionRegisterState,
  effectiveRegistrationClosesAt,
  publicEventPresentation,
  trackRegistrationOpen,
} from "@/src/lib/publicEventStatus";
import { toDate } from "@/src/lib/datetime";
import { isSupportViewer } from "@/src/features/admin/supportPreview";
import { accessTypeOf, resolveEventAccess } from "@/src/features/access/access.service";
import {
  getCollaboratingEventIds,
  getEventOrganizations,
} from "@/src/features/organizations/organizations.service";
import { publicOrder, type EventOrganization } from "@/src/features/organizations/types";
import {
  listActiveFields,
  seedDefaultsForEvent,
} from "@/src/features/registration/forms/formFields.service";
import type { EventFormField } from "@/src/features/registration/forms/formFields.types";
import {
  isPaidEvent,
  occupyingGroupRegs,
  occupyingHackathonRegs,
  ticketFor,
} from "@/src/features/registration/registration.service";
import { listRegistrationGroups } from "@/src/features/registration_groups/groups.service";
import {
  eventIsHackathon,
  listPrizesForTracks,
  listTeamsOfEvent,
  listTracks,
  type TrackPrize,
} from "@/src/features/hackathon/hackathon.service";
import { trackDueAmount, trackSponsor } from "@/src/features/hackathon/types";
import { isHackathonKind, type HackathonKind } from "@/src/features/hackathon/kinds";
import { TicketingService } from "@/src/features/ticketing/ticketing.service";
import { RegService } from "@/src/services/registeration.service";
import { EventService } from "@/src/services/event.service";
import type { EventModel, EventFormat } from "@/src/services/models/event.model";
import type {
  PublicCompetition,
  PublicDiscount,
  PublicEventAttempt,
  PublicEventDto,
  PublicEventGateReason,
  PublicEventView,
  PublicEventViewer,
  PublicFormField,
  PublicOrgCredit,
} from "./types";
import { resolveRegisterButtonState } from "./publicEvent.logic";
import { sortPublicAgendaItems } from "@/src/features/agendas/agendaSort";
import { AgendaService } from "@/src/features/agendas/agenda.service";
import { normalizeAgendaType } from "@/src/features/agendas/agendaTypes";

export {
  resolveRegisterButtonState,
  dtoContainsForbiddenKey,
  filterPublicOrgCredits,
} from "./publicEvent.logic";

const FORMAT_LABEL: Record<EventFormat, string> = {
  physical: "In person",
  virtual: "Online",
  hybrid: "Hybrid",
};

function formatLabelOf(format: string | null | undefined): string {
  const f = String(format || "physical").toLowerCase() as EventFormat;
  return FORMAT_LABEL[f] ?? "In person";
}

function mapFormFields(fields: EventFormField[]): PublicFormField[] {
  return fields
    .filter((f) => !f.archivedAt)
    .map((f) => ({
      key: f.key,
      label: f.label,
      type: f.type,
      required: f.required,
      options: f.options ?? [],
      help: f.helpText,
      placeholder: f.placeholder,
      scope: f.scope,
    }));
}

function mapOrgCredit(o: EventOrganization): PublicOrgCredit {
  return {
    id: o.id,
    name: o.name,
    logoUrl: o.logoUrl || "",
    websiteUrl: o.websiteUrl || "",
    tier: o.tier || "",
    type: o.type,
    kindLabel:
      o.type === "partner"
        ? o.partnershipKind || undefined
        : o.type === "collaborator"
          ? o.contributionKind || undefined
          : undefined,
    trackId: o.trackId || o.sponsorTrackId || undefined,
  };
}

async function organizerChipFor(
  event: EventModel,
): Promise<{ name: string; logoUrl?: string | null }> {
  const organizerId = String(event.organizerId || "");
  if (!organizerId) return { name: "Organizer" };

  const [{ data: profile }, { data: eventRow }] = await Promise.all([
    supabaseAdmin
      .from(TABLES.ORGANIZER_PROFILES)
      .select("org_name, org_id")
      .eq("user_id", organizerId)
      .maybeSingle(),
    supabaseAdmin.from(TABLES.EVENTS).select("org_id").eq("id", event.id).maybeSingle(),
  ]);

  const orgId = String(eventRow?.org_id || profile?.org_id || "");
  let orgName: string | null = null;
  let logoUrl: string | null = null;
  if (orgId) {
    const { data: org } = await supabaseAdmin
      .from(TABLES.ORGANIZATIONS)
      .select("name, logo_url")
      .eq("id", orgId)
      .maybeSingle();
    orgName = org?.name ? String(org.name) : null;
    logoUrl = org?.logo_url ? String(org.logo_url) : null;
  }

  const name = String(orgName || profile?.org_name || "").trim() || "Organizer";
  return { name, logoUrl };
}

async function canPreviewUnpublished(
  event: EventModel,
  viewer: PublicEventViewer | null | undefined,
): Promise<boolean> {
  if (!viewer?.userId) return false;
  if (isSupportViewer({ role: viewer.role ?? undefined, userType: viewer.userType ?? undefined })) {
    return true;
  }
  if (String(event.organizerId) === String(viewer.userId)) return true;

  const collaborating = await getCollaboratingEventIds(viewer.userId).catch(() => [] as string[]);
  if (collaborating.includes(event.id)) return true;

  // Service-role has no auth.uid(); check staff membership by viewer id.
  const { data: staffRows } = await supabaseAdmin
    .from(TABLES.EVENT_STAFF_ASSIGNMENTS)
    .select("id, team_id, member_ids")
    .eq("event_id", event.id)
    .limit(20);
  if (staffRows?.length) {
    const teamIds = [...new Set(staffRows.map((r) => String(r.team_id)).filter(Boolean))];
    if (teamIds.length) {
      const { data: members } = await supabaseAdmin
        .from(TABLES.TEAM_MEMBERS)
        .select("id, user_id, team_id")
        .in("team_id", teamIds)
        .eq("user_id", viewer.userId);
      if (members?.length) {
        const allowed = staffRows.some((row) => {
          const ids = Array.isArray(row.member_ids) ? row.member_ids.map(String) : [];
          const onTeam = members.filter((m) => String(m.team_id) === String(row.team_id));
          if (!onTeam.length) return false;
          // Empty member_ids = whole roster.
          if (!ids.length) return true;
          return onTeam.some((m) => ids.includes(String(m.id)));
        });
        if (allowed) return true;
      }
    }
  }

  const managed = viewer.managedOrgIds ?? [];
  const presidents = viewer.presidentOfOrgIds ?? [];
  if (!managed.length && !presidents.length) return false;

  const { data: row } = await supabaseAdmin
    .from(TABLES.EVENTS)
    .select("org_id")
    .eq("id", event.id)
    .maybeSingle();
  const orgId = String(row?.org_id || "");
  if (!orgId) return false;
  return managed.includes(orgId) || presidents.includes(orgId);
}

function gateReasonOf(reason: string | undefined): PublicEventGateReason {
  const allowed: PublicEventGateReason[] = [
    "needs_code",
    "bad_code",
    "needs_invite",
    "invite_expired",
    "invite_used",
    "not_whitelisted",
    "not_found",
    "closed",
    "rate_limited",
  ];
  if (reason && (allowed as string[]).includes(reason)) return reason as PublicEventGateReason;
  return "needs_code";
}

async function buildDto(
  event: EventModel,
  opts: {
    preview: boolean;
    lockedTiers: string[];
    attempt: PublicEventAttempt;
  },
): Promise<PublicEventDto> {
  const presentation = publicEventPresentation(event.status, event.schedule, {
    registrationOpenDate: event.registration?.registrationOpenDate,
    registrationCloseDate: event.registration?.registrationCloseDate,
    timezone: event.schedule?.timezone,
  });
  const hackathon = await eventIsHackathon(event);

  const [
    regs,
    organizations,
    tracks,
    teamsOnEvent,
    groupsOnEvent,
    tiers,
    chip,
    shareUrl,
    publicPromos,
  ] = await Promise.all([
    RegService.getRegsOfEvent(event.id),
    getEventOrganizations(event.id),
    hackathon ? listTracks(event.id) : Promise.resolve([]),
    hackathon ? listTeamsOfEvent(event.id) : Promise.resolve([]),
    !hackathon && event.registration?.groupRegistration
      ? listRegistrationGroups(event.id)
      : Promise.resolve([]),
    TicketingService.listTiers(event.id).catch(() => []),
    organizerChipFor(event),
    absoluteUrl(`/e/${event.id}`),
    TicketingService.listPublicPromoChips(event.id).catch(() => []),
  ]);

  let formFieldsRaw = await listActiveFields(event.id).catch(() => [] as EventFormField[]);
  if (!formFieldsRaw.length) {
    formFieldsRaw = await seedDefaultsForEvent(event.id, {
      isFree: !isPaidEvent(event),
    }).catch(() => [] as EventFormField[]);
  }

  const prizesByTrack = hackathon ? await listPrizesForTracks(tracks.map((t) => t.id)) : new Map();

  const taken = hackathon
    ? occupyingHackathonRegs(regs, teamsOnEvent).length
    : event.registration?.groupRegistration
      ? occupyingGroupRegs(regs, groupsOnEvent).length
      : regs.filter((r) => r.status !== "cancelled" && r.status !== "rejected").length;
  const totalSeats = Number(event.capacity?.totalSeats) || 0;
  const seatsLeft = totalSeats > 0 ? Math.max(0, totalSeats - taken) : null;

  const eventCloseDate =
    event.registration?.registrationCloseDate ||
    (event as { registrationCloseDate?: string }).registrationCloseDate ||
    null;
  const waitlistEnabled = !!(event.access?.waitlistEnabled ?? event.capacity?.waitingListEnabled);
  const openTracks = tracks.filter((t) =>
    trackRegistrationOpen(t, {
      eventRegistrationOpen: presentation.registrationOpen,
      eventRegistrationCloseDate: eventCloseDate,
      seatsLeft,
      waitlistEnabled,
    }),
  );
  const showSponsors = !!(event as EventModel & { showSponsors?: boolean }).showSponsors;
  const showCollaborators = !!(event as EventModel & { showCollaborators?: boolean })
    .showCollaborators;
  const showPartners = !!(event as EventModel & { showPartners?: boolean }).showPartners;

  const competitions: PublicCompetition[] = tracks.map((t) => {
    const sponsor = showSponsors ? trackSponsor(organizations, t.id) : null;
    const kind: HackathonKind = isHackathonKind(t.kind) ? t.kind : "business";
    const prizeRows: TrackPrize[] = prizesByTrack.get(t.id) ?? [];
    const effectiveClose = effectiveRegistrationClosesAt(t.registrationClosesAt, eventCloseDate);
    const registerState = competitionRegisterState({
      effectiveClosesAt: effectiveClose,
      opensAt: (t as { opensAt?: string }).opensAt || null,
      trackEnded: String(t.status || "").toLowerCase() === "ended",
      eventLifecycleActive: presentation.registrationOpen,
      seatsLeft,
      waitlistEnabled,
    });
    const finalState = registerState;
    return {
      id: t.id,
      name: t.name,
      kind,
      description: t.description || "",
      rulesText: (t.instructions || "").trim() || t.rulesText || "",
      imageUrl: t.imageUrl || "",
      fee: t.fee,
      due: trackDueAmount(t),
      currency: t.currency || event.pricing?.currency || "PKR",
      discountPercent: t.discountPercent,
      discountNote: t.discountNote || "",
      discountExpiresAt: t.discountExpiresAt || "",
      minTeamSize: t.minTeamSize,
      maxTeamSize: t.maxTeamSize,
      submissionDeadline: t.submissionDeadline || t.submissionDeadlineAt || "",
      registrationClosesAt: t.registrationClosesAt || "",
      effectiveRegistrationClosesAt: effectiveClose,
      prizePool: t.prizePool || "",
      prizes: prizeRows.map((p) => ({
        positionLabel: p.positionLabel,
        amount: p.amount,
        description: p.description,
      })),
      registerState: finalState,
      registrationOpen: finalState === "open",
      sponsorLogoUrl: sponsor?.logoUrl || null,
      sponsorName: sponsor?.name || null,
    };
  });

  const paid = isPaidEvent(event);
  const { price } = ticketFor(event);
  const currency = event.pricing?.currency || "PKR";
  const fromPrices = competitions.map((c) => c.due).filter((n) => n > 0);
  const admissionLabel = competitions.length
    ? fromPrices.length === 0
      ? "Free"
      : fromPrices.length === 1
        ? formatCurrency(
            fromPrices[0],
            competitions.find((c) => c.due === fromPrices[0])?.currency || currency,
            "Free",
          )
        : `From ${formatCurrency(Math.min(...fromPrices), competitions[0]?.currency || currency)}`
    : paid
      ? formatCurrency(price, currency, "Free")
      : "Free";

  // listTiers already demotes past available_until; only expose active in-window tiers.
  const activeTiers = (tiers ?? [])
    .filter((t) => t.active !== false)
    .filter((t) => t.seatsLeft == null || t.seatsLeft > 0)
    .map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description || "",
      price: t.price,
      availableUntil: t.availableUntil,
      seatsAvailable: t.seatsAvailable,
      seatsLeft: t.seatsLeft,
    }));

  // Fallback to embedded pricing.tiers when ticket_tiers table is empty.
  const pricingTiers =
    activeTiers.length > 0
      ? activeTiers
      : (event.pricing?.tiers ?? []).map((t, i) => ({
          id: `legacy-${i}`,
          name: t.name || "General",
          description: "",
          price: Number(t.price) || 0,
          availableUntil: t.availableUntil || null,
          seatsAvailable: typeof t.seats === "number" ? t.seats : null,
          seatsLeft: typeof t.seats === "number" ? t.seats : null,
        }));

  const discounts: PublicDiscount[] = [];
  if (event.pricing?.studentDiscount?.enabled && event.pricing.studentDiscount.percentage > 0) {
    discounts.push({
      kind: "student",
      percentage: event.pricing.studentDiscount.percentage,
      requiresVerification: !!event.pricing.studentDiscount.requiresVerification,
    });
  }
  if (event.pricing?.groupDiscount?.enabled && event.pricing.groupDiscount.percentage > 0) {
    discounts.push({
      kind: "group",
      percentage: event.pricing.groupDiscount.percentage,
      minGroupSize: event.pricing.groupDiscount.minGroupSize,
    });
  }

  const ordered = publicOrder(organizations, event.sponsorTiers ?? []);
  const sponsors = showSponsors
    ? ordered.filter((o) => o.type === "sponsor").map(mapOrgCredit)
    : [];
  const collaborators = showCollaborators
    ? ordered.filter((o) => o.type === "collaborator").map(mapOrgCredit)
    : [];
  const partners = showPartners
    ? ordered.filter((o) => o.type === "partner").map(mapOrgCredit)
    : [];

  // Speakers: public fields only (no email/phone even when isContactPublic — plan forbids private contact).
  const speakers = (event.speakers ?? []).map((s) => ({
    id: String(s.speakerId || s.name),
    name: s.name || "",
    title: s.designation || s.sessionTitle || "",
    bio: s.bio || "",
    photoUrl: s.profileImage || "",
  }));

  const agendaSessions = await AgendaService.getSessionsByEventId(event.id).catch(() => []);
  const agenda = sortPublicAgendaItems(
    agendaSessions.map((s) => ({
      id: s.id,
      title: s.title || "",
      type: normalizeAgendaType(s.type),
      date: s.date || "",
      startTime: s.startTime || "",
      endTime: s.endTime || "",
      location: [s.location, s.room].filter(Boolean).join(" · "),
      description: s.description || "",
      speakerNames: s.speakers.map((sp) => sp.name),
      speakers: s.speakers.map((sp) => ({
        id: sp.id,
        name: sp.name,
        photoUrl: sp.avatarUrl || "",
      })),
      trackName: s.trackName ?? null,
    })),
  );

  const tags: string[] = [];
  if (event.category) tags.push(String(event.category));
  if (event.eventType) tags.push(String(event.eventType));

  const registerState = resolveRegisterButtonState({
    preview: opts.preview,
    requiresRegistration: event.requiresRegistration !== false,
    lifecycle: presentation.lifecycle,
    registrationOpen: presentation.registrationOpen,
    registrationOpenDate: event.registration?.registrationOpenDate || "",
    seatsLeft,
    waitlistEnabled: !!event.access?.waitlistEnabled,
    hasTracks: tracks.length > 0,
    openCompetitionCount: openTracks.length,
  });

  const opens = toDate(event.registration?.registrationOpenDate);
  let registerOpensAt: string | null = null;
  if (registerState === "opens_at" && opens) {
    registerOpensAt = opens.toISOString();
  }

  void opts.attempt;

  const { getOrganizerDriveGmailStatus } =
    await import("@/src/features/connections/server/assertOrganizerDriveAndGmail");
  const connections = await getOrganizerDriveGmailStatus(event.organizerId);

  return {
    id: event.id,
    title: event.title,
    shortDescription: event.shortDescription || "",
    description: event.description || "",
    bannerImage: event.bannerImage || "",
    galleryImages: Array.isArray(event.galleryImages) ? event.galleryImages.filter(Boolean) : [],
    promoVideoUrl: event.promoVideoUrl || "",
    status: event.status,
    visibility: event.visibility,
    lifecycle: presentation.lifecycle,
    timezone: event.schedule?.timezone || "Asia/Karachi",
    tags,
    categoryLabel: event.category || null,
    formatLabel: formatLabelOf(event.format),
    schedule: {
      startDate: event.schedule?.startDate || "",
      endDate: event.schedule?.endDate || "",
      startTime: event.schedule?.startTime || "",
      endTime: event.schedule?.endTime || "",
      timezone: event.schedule?.timezone || "Asia/Karachi",
      formatLabel: formatLabelOf(event.format),
    },
    location: {
      venueName: event.location?.venueName || "",
      address: event.location?.address || "",
      city: event.location?.city || "",
      mapsUrl: event.mapsUrl || event.mapUrl || "",
    },
    registrationOpenDate: event.registration?.registrationOpenDate || "",
    registrationCloseDate: event.registration?.registrationCloseDate || "",
    requiresRegistration: event.requiresRegistration !== false,
    waitlistEnabled: !!event.access?.waitlistEnabled,
    requiresApproval: !!event.access?.requiresApproval,
    seats: { total: totalSeats, taken, left: seatsLeft },
    isFree: !paid && fromPrices.length === 0,
    currency,
    pricingTiers,
    discounts,
    publicPromos,
    showSponsors,
    showCollaborators,
    showPartners,
    sponsorTiers: Array.isArray(event.sponsorTiers) ? event.sponsorTiers.map(String) : [],
    organizerChip: chip,
    sponsors,
    collaborators,
    partners,
    formFields: mapFormFields(formFieldsRaw),
    agenda,
    speakers,
    competitions,
    isHackathon: hackathon,
    groupRegistration: !hackathon && !!event.registration?.groupRegistration,
    groupMinSize: event.registration?.groupMinSize ?? 2,
    groupMaxSize: event.registration?.groupMaxSize ?? 8,
    allowTierSelfSelect: !!event.access?.allowTierSelfSelect,
    attendeeTiers: event.access?.attendeeTiers ?? [],
    lockedTiers: opts.lockedTiers,
    registerState,
    registerOpensAt,
    admissionLabel,
    sharePath: shareUrl,
    organizerConnectionsReady: connections.ready,
    organizerConnectionsMessage: connections.message,
    paymentInstructions: (() => {
      const free = !paid && fromPrices.length === 0;
      if (free) return null;
      return String(event.paymentInstructions || "").trim() || null;
    })(),
  };
}

/**
 * Allowlisted public event view. Never returns raw EventModel or select('*') payloads.
 */
export const getPublicEventView = cache(
  async (
    eventId: string,
    viewer?: PublicEventViewer | null,
    attempt: PublicEventAttempt = {},
  ): Promise<PublicEventView> => {
    const id = String(eventId || "").trim();
    if (!id) return { kind: "unavailable" };

    const event = await EventService.getEventByID(id);
    if (!event || event.deletedAt) return { kind: "unavailable" };

    const lifecycle = eventLifecycle(event.status, event.schedule);
    const preview = await canPreviewUnpublished(event, viewer);

    // Draft / archived / cancelled: guests see unavailable; staff get preview.
    if (lifecycle === "draft" || lifecycle === "archived" || lifecycle === "cancelled") {
      if (!preview) return { kind: "unavailable" };
      const dto = await buildDto(event, { preview: true, lockedTiers: [], attempt });
      return { kind: "full", dto, preview: true };
    }

    // Published but not active lifecycle (e.g. completed) — still show full page with ended state.
    // Unpublished intent only blocked above.

    const accessType = accessTypeOf(event);
    const needsGate =
      accessType === "invite_only" ||
      accessType === "private" ||
      !!String(event.accessCode || "").trim();

    // Rate-limit code / token probing (including hybrid invite unlock probes).
    if (attempt.code || attempt.token) {
      const key = `public-gate:${id}:${viewer?.userId || viewer?.email || "anon"}`;
      const rl = rateLimit(key, 20, 60);
      if (!rl.ok) {
        return {
          kind: "gated",
          title: event.title,
          eventId: id,
          reason: "rate_limited",
          inviteToken: attempt.token ?? undefined,
        };
      }
    }

    // Unified gate: whitelist + invites via resolveEventAccess / decideAccess.
    const access = await resolveEventAccess(event, {
      token: attempt.token,
      code: attempt.code,
      email: viewer?.email,
    });

    if (needsGate && !access.allowed) {
      if (preview) {
        const dto = await buildDto(event, { preview: true, lockedTiers: [], attempt });
        return {
          kind: "full",
          dto,
          preview: true,
          gate: {
            reason: gateReasonOf(access.reason),
            inviteToken: attempt.token ?? undefined,
          },
        };
      }
      return {
        kind: "gated",
        title: event.title,
        eventId: id,
        reason: gateReasonOf(access.reason),
        inviteToken: attempt.token ?? undefined,
      };
    }

    // Hybrid: unlock gated tiers only after a validated invite/code (no bare ?invite=).
    const lockedTiers: string[] =
      accessType === "hybrid" && access.allowed ? [...access.lockedTiers] : [];

    const dto = await buildDto(event, {
      preview,
      lockedTiers,
      attempt,
    });

    return { kind: "full", dto, preview };
  },
);

/** Lightweight SEO metadata fetch — title + banner only; no secrets. */
export const getPublicEventMeta = cache(async (eventId: string) => {
  const id = String(eventId || "").trim();
  if (!id) return null;
  const { data, error } = await supabaseAdmin
    .from(TABLES.EVENTS)
    .select(
      "id, title, short_description, banner_image, status, visibility, start_date, end_date, venue_name, city",
    )
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  const status = String(data.status || "").toLowerCase();
  if (status === "draft" || status === "archived" || status === "cancelled") {
    return {
      id: data.id,
      title: "Event",
      description: "",
      bannerImage: "",
      indexable: false,
    };
  }
  const visibility = String(data.visibility || "public").toLowerCase();
  const indexable = visibility === "public" || visibility === "hybrid" || visibility === "tiered";
  return {
    id: data.id,
    title: String(data.title || "Event"),
    description: String(data.short_description || ""),
    bannerImage: String(data.banner_image || ""),
    startDate: data.start_date,
    endDate: data.end_date,
    venueName: data.venue_name,
    city: data.city,
    indexable,
  };
});
