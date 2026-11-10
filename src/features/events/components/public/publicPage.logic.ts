import type { PublicEventDto } from "@/src/features/events/types";
import type { EventLifecycle } from "@/src/lib/eventState";

/** Public page: calendar menus when previewing or published, not cancelled/archived. */
export function calendarActionsAllowed(
  dto: Pick<PublicEventDto, "lifecycle" | "status">,
  preview: boolean,
): boolean {
  if (dto.lifecycle === "cancelled" || dto.lifecycle === "archived") return false;
  if (preview) return true;
  return dto.status === "published" || dto.lifecycle === "upcoming" || dto.lifecycle === "ongoing";
}

/** Absolute share URL from dto.sharePath (may already be absolute or /e/…). */
export function absoluteShareUrl(sharePath: string, origin?: string): string {
  const raw = String(sharePath || "").trim();
  if (!raw) return origin || "";
  if (/^https?:\/\//i.test(raw)) return raw;
  const base =
    origin ||
    (typeof window !== "undefined" ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL) ||
    "";
  const path = raw.startsWith("/") ? raw : `/${raw}`;
  return `${String(base).replace(/\/$/, "")}${path}`;
}

export type ShareMenuItem = {
  id: "copy" | "whatsapp" | "linkedin" | "x" | "email";
  label: string;
  href?: string;
};

export function buildShareMenuItems(absoluteUrl: string, title: string): ShareMenuItem[] {
  const encoded = encodeURIComponent(absoluteUrl);
  const text = encodeURIComponent(title || "Event");
  return [
    { id: "copy", label: "Copy link" },
    {
      id: "whatsapp",
      label: "WhatsApp",
      href: `https://wa.me/?text=${encodeURIComponent(`${title} ${absoluteUrl}`.trim())}`,
    },
    {
      id: "linkedin",
      label: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`,
    },
    {
      id: "x",
      label: "X",
      href: `https://twitter.com/intent/tweet?url=${encoded}&text=${text}`,
    },
    {
      id: "email",
      label: "Email",
      href: `mailto:?subject=${text}&body=${encoded}`,
    },
  ];
}

/** Gallery + banner media list for PublicMedia (banner first when present). */
export function buildPublicMediaItems(dto: Pick<PublicEventDto, "bannerImage" | "galleryImages">): {
  src: string;
  kind: "banner" | "gallery";
}[] {
  const out: { src: string; kind: "banner" | "gallery" }[] = [];
  const banner = String(dto.bannerImage || "").trim();
  if (banner) out.push({ src: banner, kind: "banner" });
  const seen = new Set(banner ? [banner] : []);
  for (const g of dto.galleryImages || []) {
    const src = String(g || "").trim();
    if (!src || seen.has(src)) continue;
    seen.add(src);
    out.push({ src, kind: "gallery" });
  }
  return out;
}

/** Hide seats fact when capacity is unlimited. */
export function showSeatsFact(seats: { total: number; left: number | null }): boolean {
  return seats.left !== null;
}

/** Payment instructions only for paid events with non-empty text. */
export function publicPaymentInstructions(
  isFree: boolean,
  raw: string | null | undefined,
): string | null {
  if (isFree) return null;
  const text = String(raw || "").trim();
  return text || null;
}

export function whatHappensNextLine(opts: { isFree: boolean; requiresApproval: boolean }): string {
  if (opts.requiresApproval) {
    return opts.isFree
      ? "What happens next: your registration waits for organizer approval, then you get a ticket email."
      : "What happens next: after you submit payment proof, the organizer reviews it and sends your ticket when approved.";
  }
  return opts.isFree
    ? "What happens next: you get a confirmation and ticket email right away."
    : "What happens next: the organizer verifies your payment, then sends your ticket email.";
}

export function lifecycleLabel(lifecycle: EventLifecycle | string, preview: boolean): string {
  if (preview) return "Admin preview";
  const map: Record<string, string> = {
    draft: "Draft",
    upcoming: "Upcoming",
    ongoing: "Happening now",
    completed: "Completed",
    cancelled: "Cancelled",
    archived: "Archived",
    published: "Published",
  };
  return map[lifecycle] || String(lifecycle);
}

/** Hero must not paint text/glass over the banner image. */
export const HERO_BANNER_OVERLAY_FORBIDDEN = [
  "from-ink/",
  "bg-black/",
  "backdrop-blur",
  "bg-white/10",
] as const;
