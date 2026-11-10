import type { Registration } from "@/src/services/models/reg.type";
import type { User } from "@/src/services/models/user.type";

export type RegistrantIdentity = {
  name: string;
  email: string;
  phone: string;
  initials: string;
};

function initialsFrom(name: string, email: string): string {
  const cleaned = String(name || "").trim();
  if (cleaned) {
    const parts = cleaned.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
    }
    return cleaned.slice(0, 2).toUpperCase();
  }
  const e = String(email || "").trim();
  return e ? e.slice(0, 2).toUpperCase() : "?";
}

/**
 * Snapshot-canonical identity for roster / exports (docs/23 A6).
 * Prefer registration form snapshot over the linked account (organizer self-test bug).
 */
export function registrantIdentity(
  reg: Pick<Registration, "attendee"> | null | undefined,
  user?: Pick<User, "email" | "profile"> | null,
): RegistrantIdentity {
  const snap = reg?.attendee;
  const name = String(snap?.name || user?.profile?.fullName || "").trim();
  const email = String(snap?.email || user?.email || "").trim();
  const phone = String(snap?.phone || user?.profile?.phoneNumber || "").trim();
  return {
    name: name || "Unknown",
    email,
    phone,
    initials: initialsFrom(name, email),
  };
}
