import { redirect } from "next/navigation";

export function redirectHackathonToEvent(organizerId: string, eventId: string, suffix = "") {
  const base = `/organizer/${organizerId}/events/${eventId}`;
  redirect(suffix ? `${base}${suffix.startsWith("/") ? suffix : `/${suffix}`}` : base);
}
