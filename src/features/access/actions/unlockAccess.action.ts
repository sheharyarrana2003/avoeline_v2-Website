"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { EventService } from "@/src/services/event.service";
import { rateLimit } from "@/src/lib/rateLimit";
import { accessUnlockCookieName, mintAccessUnlockToken } from "../lib/accessUnlock";

/**
 * Validate an access code and set a same-origin httpOnly unlock cookie,
 * then redirect to the event page without ?code= in the URL.
 */
export async function unlockAccessAction(formData: FormData): Promise<void> {
  const eventId = String(formData.get("eventId") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  const invite = String(formData.get("invite") ?? "").trim();

  if (!eventId) redirect("/events");

  const rl = rateLimit(`access-unlock:${eventId}`, 20, 60);
  if (!rl.ok) {
    const q = new URLSearchParams();
    if (invite) q.set("invite", invite);
    q.set("code", "__rate__");
    redirect(`/events/${eventId}?${q.toString()}`);
  }

  const event = await EventService.getEventByID(eventId);
  const required = String(event?.accessCode ?? "").trim();
  if (!event || !required || code !== required) {
    const q = new URLSearchParams();
    if (invite) q.set("invite", invite);
    q.set("bad", "1");
    redirect(`/events/${eventId}?${q.toString()}`);
  }

  const jar = await cookies();
  jar.set(accessUnlockCookieName(eventId), mintAccessUnlockToken(eventId), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 12 * 60 * 60,
  });

  const q = invite ? `?invite=${encodeURIComponent(invite)}` : "";
  redirect(`/events/${eventId}${q}`);
}
