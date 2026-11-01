import "server-only";

import { getRegistrationById } from "@/src/features/registration/registration.service";
import { EventService } from "@/src/services/event.service";
import { getTrack, listTeamsOfEvent, teamsForRegistration } from "./hackathon.service";
import { deadlinePassed, rosterLocked } from "./types";

export type ParticipantAccessReason =
  | "ok"
  | "not_logged_in"
  | "registration_not_found"
  | "payment_pending"
  | "payment_rejected"
  | "awaiting_approval"
  | "waitlisted"
  | "not_checked_in"
  | "roster_not_locked"
  | "competition_not_open"
  | "competition_closed";

export type ParticipantAccess = {
  allowed: boolean;
  reasonCode: ParticipantAccessReason;
  title: string;
  message: string;
  nextAction: string;
  opensAt?: string | null;
  closesAt?: string | null;
};

const COPY: Record<
  Exclude<ParticipantAccessReason, "ok">,
  { title: string; message: string; nextAction: string }
> = {
  not_logged_in: {
    title: "Enter your team code",
    message: "Use the access code emailed to your team lead to open the compete workspace.",
    nextAction: "Enter your team access code below.",
  },
  registration_not_found: {
    title: "Registration not found",
    message: "We could not find a registration linked to this session for this event.",
    nextAction: "Register for the event or ask the organizer for help.",
  },
  payment_pending: {
    title: "Payment pending",
    message: "Your place is held until the organizer confirms payment.",
    nextAction: "Upload payment proof from your ticket page, or wait for confirmation.",
  },
  payment_rejected: {
    title: "Payment not accepted",
    message: "The organizer rejected the payment on this registration.",
    nextAction: "Contact the organizer or upload a new proof if they ask you to.",
  },
  awaiting_approval: {
    title: "Awaiting approval",
    message: "The organizer still needs to approve your registration.",
    nextAction: "Wait for an email, or contact the organizer.",
  },
  waitlisted: {
    title: "You are on the waitlist",
    message: "A place will open if someone drops out.",
    nextAction: "Wait for a promotion email from the organizer.",
  },
  not_checked_in: {
    title: "Check-in required",
    message: "This event requires on-site check-in before you can compete.",
    nextAction: "Find an usher or organizer to check you in.",
  },
  roster_not_locked: {
    title: "Roster still open",
    message: "The competition roster is not locked yet, so the workspace is not open.",
    nextAction: "Wait until the roster lock time, or ask the organizer.",
  },
  competition_not_open: {
    title: "Competition not open yet",
    message: "You can enter once the competition opens.",
    nextAction: "Wait for the countdown to finish.",
  },
  competition_closed: {
    title: "Competition closed",
    message: "This competition is no longer accepting work.",
    nextAction: "Contact the organizer if you believe this is a mistake.",
  },
};

function pack(
  reason: Exclude<ParticipantAccessReason, "ok">,
  extra?: Partial<ParticipantAccess>,
): ParticipantAccess {
  return { allowed: false, reasonCode: reason, ...COPY[reason], ...extra };
}

/**
 * Gate for compete workspace entry. Pass registrationId when a cookie/session exists.
 */
export async function getParticipantAccess(input: {
  eventId: string;
  registrationId?: string | null;
  teamId?: string | null;
  requireCheckIn?: boolean;
}): Promise<ParticipantAccess> {
  if (!input.registrationId) return pack("not_logged_in");

  const [event, registration] = await Promise.all([
    EventService.getEventByID(input.eventId),
    getRegistrationById(input.registrationId),
  ]);
  if (!registration || registration.eventId !== input.eventId)
    return pack("registration_not_found");

  const status = registration.status;
  if (status === "waitlisted") return pack("waitlisted");
  if (status === "awaiting_payment") return pack("payment_pending");
  if (status === "pending") return pack("awaiting_approval");
  if (status === "rejected" || status === "cancelled" || status === "no_show") {
    return pack("awaiting_approval");
  }

  const pay = registration.payment?.paymentStatus;
  if (pay === "pending") return pack("payment_pending");
  if (pay === "failed" || pay === "refunded") return pack("payment_rejected");

  if (input.requireCheckIn && status !== "checked_in" && status !== "attended") {
    return pack("not_checked_in");
  }

  if (!["confirmed", "checked_in", "attended"].includes(status)) {
    return pack("awaiting_approval");
  }

  const teams = await teamsForRegistration(registration.registrationId);
  const team =
    (input.teamId ? teams.find((t) => t.id === input.teamId) : null) ??
    teams[0] ??
    (await listTeamsOfEvent(input.eventId)).find((t) => t.id === input.teamId);
  if (!team) return pack("registration_not_found");

  const track = await getTrack(team.trackId);
  if (!track) return pack("registration_not_found");

  const now = Date.now();
  if (track.status === "ended" || (track.closesAt && Date.parse(track.closesAt) < now)) {
    return pack("competition_closed", { closesAt: track.closesAt || null });
  }
  if (track.opensAt && Date.parse(track.opensAt) > now) {
    return pack("competition_not_open", { opensAt: track.opensAt });
  }

  // Optional: require roster lock before compete (when lock time is set and not yet reached)
  if (track.rosterLocksAt && Date.parse(track.rosterLocksAt) > now) {
    return pack("roster_not_locked");
  }

  void event;
  void rosterLocked;
  void deadlinePassed;

  return {
    allowed: true,
    reasonCode: "ok",
    title: "Ready",
    message: "You can enter the compete workspace.",
    nextAction: "Continue",
    opensAt: track.opensAt || null,
    closesAt: track.closesAt || null,
  };
}
