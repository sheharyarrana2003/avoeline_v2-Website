import type { RegistrationStatus } from "@/src/services/models/reg.type";

export type TicketHeroState =
  | "awaiting_approval"
  | "awaiting_payment"
  | "waitlisted"
  | "confirmed"
  | "rejected"
  | "cancelled"
  | "other";

export function ticketHeroState(status: RegistrationStatus | string): TicketHeroState {
  switch (status) {
    case "pending":
      return "awaiting_approval";
    case "awaiting_payment":
      return "awaiting_payment";
    case "waitlisted":
      return "waitlisted";
    case "confirmed":
    case "checked_in":
    case "attended":
      return "confirmed";
    case "rejected":
      return "rejected";
    case "cancelled":
    case "no_show":
      return "cancelled";
    default:
      return "other";
  }
}

export function ticketCalendarAllowed(status: RegistrationStatus | string): boolean {
  return ticketHeroState(status) === "confirmed";
}

export function ticketShowsQr(status: RegistrationStatus | string): boolean {
  return ticketHeroState(status) === "confirmed";
}

export function ticketHeroCopy(
  status: RegistrationStatus | string,
  eventTitle: string,
  waitlistPosition?: number,
): { title: string; note: string } {
  const state = ticketHeroState(status);
  switch (state) {
    case "awaiting_approval":
      return {
        title: "Awaiting approval",
        note: `The organiser reviews registrations for ${eventTitle}. You will be emailed once they decide.`,
      };
    case "awaiting_payment":
      return {
        title: "Awaiting payment confirmation",
        note: `Your place at ${eventTitle} is held until the organiser confirms your payment.`,
      };
    case "waitlisted":
      return {
        title: "You're on the waitlist",
        note: waitlistPosition
          ? `${eventTitle} is full. You are number ${waitlistPosition} in the queue and will be emailed if a place frees up.`
          : `${eventTitle} is full. You will be emailed if a place frees up.`,
      };
    case "confirmed":
      return {
        title: "Confirmed",
        note: `Your place at ${eventTitle} is confirmed. Show your QR at the entrance.`,
      };
    case "rejected":
      return {
        title: "Rejected",
        note: `The organiser did not approve your registration for ${eventTitle}.`,
      };
    case "cancelled":
      return {
        title: "Cancelled",
        note: `Your registration for ${eventTitle} has been cancelled.`,
      };
    default:
      return {
        title: "Your registration",
        note: `Details for ${eventTitle}.`,
      };
  }
}

export function whatHappensNextLine(opts: {
  status: RegistrationStatus | string;
  isFree: boolean;
  requiresApproval: boolean;
}): string {
  const state = ticketHeroState(opts.status);
  switch (state) {
    case "awaiting_approval":
      return "The organiser will review your registration. You will get an email when they approve or reject it.";
    case "awaiting_payment":
      return "The organiser will verify your payment proof, then confirm your ticket by email.";
    case "waitlisted":
      return "If a seat opens, the organiser will move you off the waitlist and email you.";
    case "confirmed":
      return opts.isFree
        ? "Save this page and show your QR at the door. Add the event to your calendar if you like."
        : "Save this page and show your QR at the door. Keep your payment confirmation handy if asked.";
    case "rejected":
      return "No further action is needed. Contact the organiser if you think this is a mistake.";
    case "cancelled":
      return "This registration is no longer valid for entry.";
    default:
      return opts.requiresApproval
        ? "Watch your email for updates from the organiser."
        : "Watch your email for your ticket confirmation.";
  }
}

/** Email/display helpers must never label the UUID as Registration ID. */
export function registrationDisplayCode(shortCode: string | null | undefined): string {
  return String(shortCode || "").trim() || "—";
}
