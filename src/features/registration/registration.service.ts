import { cache } from "react";
import { randomUUID } from "crypto";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { regStatusToDb, payStatusToDb } from "@/data/statusMaps";
import { EventService } from "@/src/services/event.service";
import {
  RegService,
  mapToRegistration,
  hydrateRegistrationRow,
} from "@/src/services/registeration.service";
import { EventModel } from "@/src/services/models/event.model";
import { Registration, CommunicationLog } from "@/src/services/models/reg.type";
import { eventLifecycle, isActiveLifecycle } from "@/src/lib/eventState";
import { PublicRegistrationInput, RegistrationRefusal } from "./types";
import { generateAndHostQr } from "./qr";
import { generateShortCode } from "@/src/features/registration/shortCode";
import { isShortCodeUniqueViolation } from "@/src/features/registration/allocateShortCode";
import { resolveEventAccess, type AccessAttempt } from "@/src/features/access/access.service";
import type { AccessDenial } from "@/src/features/access/types";
import type { RegistrationStatus } from "@/src/services/models/reg.type";
import { sanitizeAnswers } from "@/src/lib/customFields";
import { TicketingService } from "@/src/features/ticketing/ticketing.service";
import { recordPayment } from "@/src/features/payments/payments.service";
import { markInviteRegistered } from "@/src/features/access/access.service";
import { listTracks } from "@/src/features/hackathon/hackathon.service";
import { trackDueAmount } from "@/src/features/hackathon/types";
import { listRegistrationGroups } from "@/src/features/registration_groups/groups.service";

/**
 * One refusal code per access denial, so the form explains what is missing
 * instead of collapsing everything into "event not found".
 */
const ACCESS_REFUSAL: Record<AccessDenial, RegistrationRefusal> = {
  not_found: "event_not_found",
  closed: "event_closed",
  needs_code: "needs_code",
  bad_code: "bad_code",
  needs_invite: "needs_invite",
  invite_expired: "invite_expired",
  invite_used: "invite_used",
  not_whitelisted: "not_whitelisted",
};

/**
 * Which tier this registration gets.
 *
 * An invite or guest-list row wins: the organizer set it deliberately per
 * person. Otherwise the attendee's own choice counts only when the event allows
 * self-selection AND the tier is one the event actually offers -- the value
 * arrives from a form, so an unlisted tier is either a stale page or someone
 * editing the request. Failing that, the first configured tier.
 */
function resolveTier(event: EventModel, entitled: string, requested?: string): string {
  const offered = event.access?.attendeeTiers ?? [];
  if (entitled) return entitled;
  if (event.access?.allowTierSelfSelect && requested && offered.includes(requested))
    return requested;
  return offered[0] ?? "";
}

/** What `createPublicRegistration` hands back. */
export type CreateRegistrationResult =
  | {
      ok: true;
      registrationId: string;
      registration: Registration;
      event: EventModel;
      promoId: string | null;
      listPrice: number;
      chosenTrackId: string | null;
    }
  | { ok: false; refusal: RegistrationRefusal };

import {
  registrationCountsTowardCapacity,
  occupyingHackathonRegs,
  occupyingGroupRegs,
  occupyingRegsForOrganizer,
} from "./occupancy";

export {
  registrationCountsTowardCapacity,
  occupyingHackathonRegs,
  occupyingGroupRegs,
  occupyingRegsForOrganizer,
};

function occupiesASeat(reg: Registration): boolean {
  return registrationCountsTowardCapacity(reg);
}

/**
 * The tier an attendee is buying and its price, resolved together.
 *
 * Live data states the price twice and the two disagree on four of the five
 * published events: `PriceOfTicket` is a loose top-level number while each entry
 * in `pricing.tiers` carries its own. Taking the amount from one and the label
 * from the other stamped registrations "Early Bird Pass" at a price that was not
 * the Early Bird price -- 1500 against a tier that reads 1000. Both values leave
 * this function from the same object so they cannot drift apart again.
 *
 * A priced tier wins, because it is the only place a name and an amount are
 * stated together. `PriceOfTicket` is the fallback and gets a generic label
 * rather than borrowing a tier's name it does not match.
 */
export function ticketFor(event: EventModel): { tierName: string; price: number } {
  if (event.pricing?.isFree) return { tierName: "General", price: 0 };

  // The first tier with a real price, not the highest: a zero-priced lead tier
  // should not be read as "this event is free", and picking the max would pair
  // one tier's name with another tier's amount.
  const tier = event.pricing?.tiers?.find((t) => (Number(t.price) || 0) > 0);
  if (tier) return { tierName: tier.name || "General", price: Number(tier.price) || 0 };

  return { tierName: "General", price: Number(event.PriceOfTicket) || 0 };
}

/** Whether an event charges for entry. */
export function isPaidEvent(event: EventModel): boolean {
  return ticketFor(event).price > 0;
}

/**
 * An event as a stranger is allowed to see it, or null.
 *
 * Gated on visibility and lifecycle, deliberately NOT on
 * `registration.registrationCloseDate`. Stored event dates in this project are
 * genuinely inconsistent -- some documents hold DD/MM/YYYY and some MM/DD/YYYY --
 * so a date comparison would close registration on the wrong day for some events
 * and never close it for others. `eventLifecycle` derives position from the
 * schedule and is the same reasoning the rest of the app already uses.
 *
 * `cache()`d because the page and its form both need the event within one request.
 */
export const getPublicEvent = cache(async (eventId: string): Promise<EventModel | null> => {
  if (!eventId) {
    console.warn("[getPublicEvent] called with empty eventId");
    return null;
  }

  const event = await EventService.getEventByID(eventId);
  if (!event) return null;

  if (!isActiveLifecycle(eventLifecycle(event.status, event.schedule))) return null;

  return event;
});

/**
 * The event a visitor is allowed to see, with the access decision attached.
 *
 * Replaces the old rule inside `getPublicEvent`, which denied anything that was
 * not `public` and so 404'd a private event on its own direct link. Access is
 * now `resolveEventAccess`'s job; this only fetches and hands the visitor's
 * credentials over.
 *
 * The event is returned even when access is refused, because the page needs to
 * render a code-entry form for it -- the caller must check `access.allowed`
 * before showing anything else about the event.
 */
export const getEventForVisitor = cache(
  async (
    eventId: string,
    attempt: AccessAttempt = {},
  ): Promise<{
    event: EventModel | null;
    access: Awaited<ReturnType<typeof resolveEventAccess>>;
  }> => {
    const event = eventId ? await EventService.getEventByID(eventId) : null;
    const access = await resolveEventAccess(event, attempt);
    return { event, access };
  },
);

/** One registration by id, for the ticket page. */
export const getRegistrationById = cache(
  async (registrationId: string): Promise<Registration | null> => {
    if (!registrationId) {
      console.warn("[getRegistrationById] called with empty registrationId");
      return null;
    }

    try {
      const { data, error } = await supabaseAdmin
        .from(TABLES.REGISTRATIONS)
        .select("*")
        .eq("id", registrationId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return mapToRegistration(hydrateRegistrationRow(data as Record<string, unknown>), data.id);
    } catch (err) {
      console.error("[getRegistrationById] read failed", { registrationId, err });
      throw new Error(`Failed to fetch registration ${registrationId}`, { cause: err });
    }
  },
);

/**
 * Create a registration, for an account holder or for nobody in particular.
 *
 * Writes one new document and touches nothing else. In particular it does not
 * maintain `event.analytics.registrations` or `event.capacity.availableSeats`:
 * the organizer's event page derives both live from this collection (see the
 * "stale denormalized counters" note there), so writing them would update fields
 * nothing reads.
 *
 * The document ref is allocated before the write so `ref.id` can be embedded in
 * the QR payload -- the same trick `event.service.ts` uses for event ids.
 */
export async function createPublicRegistration(
  eventId: string,
  input: PublicRegistrationInput,
  extras?: {
    /** Storage key of the uploaded payment screenshot, if any. */
    proofPath?: string | null;
    metadata?: { ipAddress: string; userAgent: string; deviceType: string };
    /**
     * The signed-in account this registration belongs to, when there is
     * one. Registering deliberately does not require an account -- the
     * ticket link is the credential -- so this is blank for a stranger.
     */
    userId?: string | null;
    /** Extra teammates: no fee, same awaiting_payment as the lead on paid tracks. */
    holdForTeamPayment?: boolean;
    /** Extra teammates do not take another capacity unit. */
    skipCapacity?: boolean;
    hackathonRole?: "team_lead" | "participant";
    groupId?: string | null;
    groupRole?: "lead" | "member";
    /** When true, skip redeem_promo here so the caller can redeem against a group. */
    deferPromoRedeem?: boolean;
  },
  /** Access credentials the visitor presented: an invite token, a code. */
  attempt: AccessAttempt = {},
): Promise<CreateRegistrationResult> {
  const email = input.email.trim().toLowerCase();

  // The register-time gate. Unlike the page view this knows the email, so the
  // guest list is enforced here -- and the whole decision is re-made server
  // side rather than trusting anything the form implies about access.
  const event = await EventService.getEventByID(eventId);
  const access = await resolveEventAccess(event, { ...attempt, email });
  if (!event) return { ok: false, refusal: "event_not_found" };
  if (event.requiresRegistration === false) return { ok: false, refusal: "event_closed" };
  if (!access.allowed) return { ok: false, refusal: ACCESS_REFUSAL[access.reason] };

  // Server-enforce registration open/close window (UI alone is not enough).
  const { isWithinRegistrationDates } = await import("@/src/lib/publicEventStatus");
  const { effectiveRegistrationClosesAt, competitionRegisterState } =
    await import("@/src/lib/competitionRegistration");
  if (
    !isWithinRegistrationDates(
      {
        registrationOpenDate: event.registration?.registrationOpenDate,
        registrationCloseDate: event.registration?.registrationCloseDate,
        timezone: event.schedule?.timezone,
      },
      new Date(),
    )
  ) {
    return { ok: false, refusal: "event_closed" };
  }

  // One read serves the guards below.
  const existing = await RegService.getRegsOfEvent(eventId);

  const alreadyHere = existing.some(
    (r) => occupiesASeat(r) && (r.attendee?.email || "").trim().toLowerCase() === email,
  );
  if (alreadyHere) return { ok: false, refusal: "already_registered" };

  const tier = resolveTier(event, access.tier, input.tier);
  if (access.lockedTiers.includes(tier)) return { ok: false, refusal: "tier_locked" };

  // Counted live rather than read from `capacity.availableSeats`, which is
  // written once at event creation and never moves -- it is already stale in
  // main. totalSeats of 0 means uncapped.
  const totalSeats = Number(event.capacityCount ?? event.capacity?.totalSeats) || 0;
  let seatsTaken = existing.filter(occupiesASeat).length;
  if (!extras?.skipCapacity && event.registration?.groupRegistration) {
    const groups = await listRegistrationGroups(eventId).catch(() => []);
    seatsTaken = occupyingGroupRegs(existing, groups).length;
  }
  const full = !extras?.skipCapacity && totalSeats > 0 && seatsTaken >= totalSeats;

  const waitlistEnabled = Boolean(event.waitlistEnabled ?? event.access?.waitlistEnabled);

  // A full event now offers the waitlist instead of a dead end, when the
  // organizer turned it on. Without it the behaviour is the old refusal.
  if (full && !waitlistEnabled) {
    return { ok: false, refusal: "event_full" };
  }

  let waitlistPosition = 0;
  if (full) {
    try {
      const { count, error: waitlistError } = await supabaseAdmin
        .from(TABLES.REGISTRATIONS)
        .select("id", { count: "exact", head: true })
        .eq("event_id", eventId)
        .eq("status", "waitlisted");
      if (waitlistError) throw waitlistError;
      waitlistPosition = (count ?? 0) + 1;
    } catch {
      waitlistPosition = existing.filter((r) => r.status === "waitlisted").length + 1;
    }
  }

  const registrationId = randomUUID();
  const now = new Date().toISOString();

  // On-demand signed check-in QR (opaque token). Failure leaves qrCode empty —
  // a registration without a QR is recoverable; a lost registration is not.
  const qr = await generateAndHostQr({
    registrationId,
    eventId: event.id,
  });
  const dbTiers = await TicketingService.listTiers(event.id).catch(() => []);
  const requestedTier =
    input.ticketTierId || input.tier
      ? dbTiers.find((t) => t.id === input.ticketTierId || t.name === input.tier)
      : undefined;
  if ((input.ticketTierId || input.tier) && !requestedTier) {
    return { ok: false, refusal: "tier_unavailable" };
  }
  const chosenTier = requestedTier || dbTiers.find((t) => t.active) || dbTiers[0];
  if (chosenTier) {
    if (!chosenTier.active) return { ok: false, refusal: "tier_unavailable" };
    if (chosenTier.seatsLeft != null && chosenTier.seatsLeft <= 0) {
      return { ok: false, refusal: "tier_unavailable" };
    }
  }
  let ticket = chosenTier
    ? { tierName: chosenTier.name, price: chosenTier.price, ticketTierId: chosenTier.id }
    : { ...ticketFor(event), ticketTierId: null as string | null };
  let chosenTrackId: string | null = null;
  let trackPick: Awaited<ReturnType<typeof listTracks>>[number] | null = null;
  const tracks = await listTracks(event.id);
  if (tracks.length) {
    const open = tracks.filter((t) => t.status !== "ended");
    const pick = tracks.find((t) => t.id === String(input.trackId || "").trim());
    if (!pick || pick.eventId !== event.id) return { ok: false, refusal: "track_required" };
    if (pick.status === "ended") return { ok: false, refusal: "track_ended" };
    if (open.length && !open.some((t) => t.id === pick.id))
      return { ok: false, refusal: "track_ended" };
    chosenTrackId = pick.id;
    trackPick = pick;
    const eventClose = event.registration?.registrationCloseDate || null;
    const effectiveClose = effectiveRegistrationClosesAt(
      pick.registrationClosesAt || null,
      eventClose,
    );
    const trackState = competitionRegisterState({
      effectiveClosesAt: effectiveClose,
      opensAt: (pick as { opensAt?: string }).opensAt || null,
      trackEnded: String(pick.status || "").toLowerCase() === "ended",
      eventLifecycleActive: true,
      seatsLeft: null,
      waitlistEnabled: false,
    });
    if (trackState === "closed" || trackState === "not_yet_open" || trackState === "full") {
      return { ok: false, refusal: "track_ended" };
    }
    // Base fee before track/student/group discounts — promo applies to this only.
    ticket = { tierName: pick.name, price: Number(pick.fee) || 0, ticketTierId: null };
  }
  const basePrice = ticket.price;

  // One compensation only: a valid promo replaces track / student / group / badge cuts.
  // Without a promo, apply track fee discount, else a single student|group % (not both).
  let structuralPrice = basePrice;
  if (trackPick) {
    structuralPrice = trackDueAmount(trackPick);
  } else if (basePrice > 0) {
    const studentOn =
      !!event.pricing?.studentDiscount?.enabled &&
      !event.pricing.studentDiscount.requiresVerification;
    const groupOn =
      !!event.pricing?.groupDiscount?.enabled && !!(extras?.groupRole || extras?.groupId);
    const studentPct = studentOn
      ? Math.max(0, Number(event.pricing?.studentDiscount?.percentage) || 0)
      : 0;
    const groupPct = groupOn
      ? Math.max(0, Number(event.pricing?.groupDiscount?.percentage) || 0)
      : 0;
    // Prefer group when registering as a group; otherwise student (if no verification). Never both.
    const pct = groupOn && groupPct > 0 ? groupPct : studentPct;
    if (pct > 0) {
      structuralPrice = Math.round(basePrice * (1 - Math.min(100, pct) / 100) * 100) / 100;
    }
  }

  // Promo is redeemed atomically after insert (redeem_promo RPC).
  let promoUsed: string | null = null;
  let promoId: string | null = null;
  let listPrice = basePrice;
  if (input.promoCode && basePrice > 0 && !extras?.holdForTeamPayment) {
    const preview = await TicketingService.previewPromo(
      event.id,
      input.promoCode,
      basePrice,
      chosenTrackId,
    );
    if ("promoId" in preview) {
      promoId = preview.promoId;
      promoUsed = preview.code;
      listPrice = basePrice;
      ticket = { ...ticket, price: basePrice };
    }
  }
  if (!promoId) {
    ticket = { ...ticket, price: structuralPrice };
    const extrasUserId = String(extras?.userId ?? "");
    if (extrasUserId && ticket.price > 0) {
      const { data: badge } = await supabaseAdmin
        .from(TABLES.USER_BADGES)
        .select("badge_tier_id")
        .eq("user_id", extrasUserId);
      const ids = (badge ?? []).map((b) => b.badge_tier_id);
      if (ids.length) {
        const { data: tiers } = await supabaseAdmin
          .from(TABLES.BADGE_TIERS)
          .select("default_discount_pct")
          .in("id", ids);
        const pct = Math.max(0, ...(tiers ?? []).map((t) => Number(t.default_discount_pct) || 0));
        if (pct > 0) {
          ticket = { ...ticket, price: Math.round(ticket.price * (1 - pct / 100) * 100) / 100 };
        }
      }
    }
  }
  const payCurrency =
    (chosenTrackId && tracks.find((t) => t.id === chosenTrackId)?.currency) ||
    event.pricing?.currency ||
    "PKR";
  const paid = extras?.holdForTeamPayment ? true : ticket.price > 0;
  if (extras?.holdForTeamPayment) ticket = { ...ticket, price: 0 };

  const approvalRequired = Boolean(event.approvalRequired ?? event.access?.requiresApproval);

  /*
   * Status precedence, most binding first:
   *   waitlisted      -- there is no seat, so nothing else applies yet
   *   awaiting_payment-- money is owed; approval comes after it clears
   *   pending         -- the organizer vets registrations (approvalRequired)
   *   confirmed       -- nothing stands in the way
   */
  const status: RegistrationStatus = full
    ? "waitlisted"
    : extras?.holdForTeamPayment || paid
      ? "awaiting_payment"
      : approvalRequired
        ? "pending"
        : "confirmed";

  let shortCode = generateShortCode();

  const registration: Registration = {
    registrationId,
    shortCode: shortCode,
    eventId: event.id,
    // Linked to the account when the person registering is signed in.
    // This was hardcoded blank, and because `certsForUser`,
    // `certificatesByUser` and the attendee dashboard all match on it, an
    // attendee's own tickets and certificates were invisible to them and a
    // certificate could not be matched back to the account it was issued
    // to. Still blank for a registration made by a stranger, which is the
    // other half of how this collection is used.
    userId: String(extras?.userId ?? ""),
    attendee: { name: input.name.trim(), email, phone: input.phone.trim() },
    organizerId: event.organizerId,
    registrationDate: now,
    registrationSource: "web",
    status,
    statusHistory: [{ status, timestamp: now }],
    tier,
    waitlistPosition,
    inviteId: access.entry?.id ?? null,
    // Cleaned against the event's own question list rather than stored as
    // submitted: this is a public endpoint, so an unknown key here would be
    // arbitrary attacker-chosen data landing in the organizer's export.
    customResponses: sanitizeAnswers(event.registration?.customForm ?? [], input.customResponses),
    hackathonTrackId: chosenTrackId,
    hackathonRole: extras?.hackathonRole ?? null,
    groupId: extras?.groupId ?? null,
    groupRole: extras?.groupRole ?? null,
    payment: {
      paymentId: "",
      // What they owe, not what we have confirmed receiving -- paymentStatus
      // carries that, and an organizer flips it after seeing the screenshot.
      amountPaid: ticket.price,
      currency: payCurrency,
      paymentMethod: paid ? "bank_transfer" : "free_ticket",
      paymentStatus: paid ? "pending" : "completed",
      transactionId: null,
      invoiceUrl: null,
      proofPath: extras?.proofPath ?? null,
    },
    pricingTier: ticket.tierName,
    finalPrice: ticket.price,
    discountApplied: promoId
      ? { type: "promo", percentage: 0, originalPrice: listPrice, discountedPrice: listPrice }
      : null,
    checkIn: {
      checkedIn: false,
      checkInTime: null,
      checkInMethod: null,
      checkedInBy: null,
      deviceId: null,
    },
    qrCode: {
      data: qr?.data || "",
      imageUrl: qr?.imageUrl || "",
      scanCount: 0,
      lastScanned: null,
    },
    certificate: {
      type: "digital",
      issued: false,
      certificateId: null,
      issueDate: null,
      downloadUrl: null,
      sharedOnLinkedIn: false,
    },
    // Stays empty until a confirmation email genuinely goes out. Recording a
    // "sent" entry for mail we never sent would make the organizer's
    // communication history lie.
    communications: [],
    feedbackSubmitted: false,
    rating: null,
    reviewId: null,
    metadata: {
      ipAddress: extras?.metadata?.ipAddress || "",
      userAgent: extras?.metadata?.userAgent || "",
      deviceType: extras?.metadata?.deviceType || "desktop",
    },
    createdAt: now,
    updatedAt: now,
    cancelledAt: null,
  };

  try {
    let inserted = false;
    for (let attempt = 0; attempt < 8 && !inserted; attempt++) {
      shortCode = attempt === 0 ? shortCode : generateShortCode();
      registration.shortCode = shortCode;
      const { error: insertError } = await supabaseAdmin.from(TABLES.REGISTRATIONS).insert({
        id: registrationId,
        event_id: registration.eventId,
        user_id: registration.userId || null,
        attendee_name: registration.attendee?.name || "",
        attendee_email: registration.attendee?.email || "",
        attendee_phone: registration.attendee?.phone || null,
        organizer_id: registration.organizerId || null,
        status: regStatusToDb(registration.status),
        waitlist_position: registration.waitlistPosition || null,
        invite_id: registration.inviteId || null,
        custom_responses: registration.customResponses || {},
        registration_source: registration.registrationSource || "web",
        tier: registration.tier || null,
        pricing_tier: registration.pricingTier || null,
        final_price: registration.finalPrice ?? 0,
        payment_status: payStatusToDb(registration.payment?.paymentStatus),
        amount_paid: registration.payment?.amountPaid ?? 0,
        payment_proof_path: registration.payment?.proofPath ?? null,
        checked_in: false,
        qr_code_data: registration.qrCode?.data || "",
        // O1 A6 / N4: on-demand QR via signed token path — never store image URLs
        qr_code_image_url: null,
        short_code: shortCode,
        certificate_issued: false,
        ticket_tier_id: ticket.ticketTierId || null,
        promo_code_used: promoUsed,
        communications: [],
        status_history: registration.statusHistory || [],
        group_id: registration.groupId || null,
        created_at: now,
        updated_at: now,
        extra: {
          ...registration,
          shortCode,
          ticketTierId: ticket.ticketTierId,
          promoCodeUsed: promoUsed,
          hackathonTrackId: registration.hackathonTrackId,
          hackathonRole: registration.hackathonRole,
          groupRole: registration.groupRole,
          discountApplied: registration.discountApplied,
          metadata: registration.metadata,
        },
      });
      if (!insertError) {
        inserted = true;
        break;
      }
      if (!isShortCodeUniqueViolation(insertError)) throw insertError;
    }
    if (!inserted) throw new Error("Could not allocate a unique short_code");

    // Solo / lead: redeem immediately when not holding for a group redeem.
    if (promoId && !extras?.holdForTeamPayment && !extras?.deferPromoRedeem) {
      const redeemed = await TicketingService.redeemPromo({
        promoId,
        eventId: event.id,
        trackId: chosenTrackId,
        email,
        listPrice,
        registrationId,
        groupId: null,
      });
      if ("total" in redeemed) {
        ticket = { ...ticket, price: redeemed.total };
        promoUsed = redeemed.code;
        await supabaseAdmin
          .from(TABLES.REGISTRATIONS)
          .update({
            final_price: redeemed.total,
            amount_paid: redeemed.total,
            promo_code_used: redeemed.code,
            updated_at: new Date().toISOString(),
            extra: {
              ...registration,
              ticketTierId: ticket.ticketTierId,
              promoCodeUsed: redeemed.code,
              hackathonTrackId: registration.hackathonTrackId,
              hackathonRole: registration.hackathonRole,
              groupRole: registration.groupRole,
              discountApplied: {
                type: "promo",
                percentage: 0,
                originalPrice: redeemed.original,
                discountedPrice: redeemed.total,
              },
              metadata: registration.metadata,
            },
          })
          .eq("id", registrationId);
        registration.finalPrice = redeemed.total;
        registration.payment.amountPaid = redeemed.total;
        registration.discountApplied = {
          type: "promo",
          percentage: 0,
          originalPrice: redeemed.original,
          discountedPrice: redeemed.total,
        };
      } else {
        // Redeem failed — clear tentative promo marker, keep list price.
        promoUsed = null;
        await supabaseAdmin
          .from(TABLES.REGISTRATIONS)
          .update({ promo_code_used: null, updated_at: new Date().toISOString() })
          .eq("id", registrationId);
      }
    }

    if (paid) {
      await recordPayment({
        payerId: extras?.userId || null,
        receiverId: event.organizerId,
        purpose: "event_registration",
        referenceType: "registration",
        referenceId: registrationId,
        totalAmount: ticket.price,
        currency: payCurrency,
        status: "pending",
        screenshotUrl: extras?.proofPath ?? null,
      });
    }
  } catch (err) {
    console.error("[createPublicRegistration] write failed", { eventId, err });
    throw new Error(`Failed to create registration for event ${eventId}`, { cause: err });
  }

  // Mark invite link registered if a token was presented
  if (attempt?.token) {
    try {
      await markInviteRegistered(attempt.token, registrationId);
    } catch (err) {
      console.error("[createPublicRegistration] could not mark inviteLink registered", {
        token: attempt.token,
        err,
      });
    }
  }

  // Spec 2.2: an invite tracks whether the person it was sent to registered.
  // After the registration, and never throwing -- the registration exists and
  // must not be lost because a tracking write failed.
  if (access.entry) {
    try {
      const { error: inviteError } = await supabaseAdmin
        .from(TABLES.EVENT_INVITES)
        .update({
          registered_at: now,
          registration_id: registrationId,
          updated_at: now,
        })
        .eq("id", access.entry.id);
      if (inviteError) throw inviteError;
    } catch (err) {
      console.error("[createPublicRegistration] could not mark the invite as used", {
        inviteId: access.entry.id,
        err,
      });
    }
  }

  return {
    ok: true,
    registrationId,
    registration,
    event,
    promoId,
    listPrice,
    chosenTrackId,
  };
}

/**
 * Record that a confirmation email actually went out.
 *
 * A separate write rather than part of the create, because the email can only be
 * sent once the registration exists and its ticket URL is known. `communications[]`
 * is already rendered by the organizer's attendee drawer as "Communication
 * history", and has been permanently empty until now.
 *
 * `arrayUnion` rather than assignment so a later entry cannot clobber an earlier
 * one. Swallows its own failures: the email has already been delivered by this
 * point, and failing to write the audit line is not worth surfacing to someone who
 * has just registered successfully.
 */
export async function recordCommunication(
  registrationId: string,
  log: CommunicationLog,
): Promise<void> {
  try {
    const { data, error } = await supabaseAdmin
      .from(TABLES.REGISTRATIONS)
      .select("communications")
      .eq("id", registrationId)
      .maybeSingle();
    if (error) throw error;
    const prev = (
      Array.isArray(data?.communications) ? data.communications : []
    ) as CommunicationLog[];
    const { error: updateError } = await supabaseAdmin
      .from(TABLES.REGISTRATIONS)
      .update({
        communications: [...prev, log],
        updated_at: new Date().toISOString(),
      })
      .eq("id", registrationId);
    if (updateError) throw updateError;
  } catch (err) {
    console.error("[recordCommunication] could not append the log", { registrationId, err });
  }
}
