import type { EventFormData, WizardTrackDraft } from "@/src/services/models/event.model";

/**
 * Review / summary line for registration — never prints "0 seats" for unlimited.
 * Example: "Registration: 1 paid tier (Rs 100) · Unlimited seats · Approval required · 1 extra question"
 */
export function formatRegistrationSummary(
  form: Pick<
    EventFormData,
    | "requiresRegistration"
    | "ticketType"
    | "ticketTiers"
    | "totalSeats"
    | "requiresApproval"
    | "customFields"
    | "PriceOfTicket"
    | "isHackathon"
    | "multiTrack"
    | "wizardTracks"
  >,
): string {
  if (form.requiresRegistration === false) return "Registration: No registration";

  const parts: string[] = [];
  if (form.ticketType === "free") {
    parts.push("Free");
  } else if (form.isHackathon) {
    const fees = (form.wizardTracks ?? []).map((t) => Number(t.fee) || 0);
    const priced = fees.filter((n) => n > 0);
    if (form.multiTrack) {
      if (!priced.length) parts.push("Paid competitions");
      else if (priced.length === 1) parts.push(`Competition fee (Rs ${priced[0]})`);
      else {
        const min = Math.min(...priced);
        const max = Math.max(...priced);
        parts.push(
          min === max
            ? `${priced.length} competition fees (Rs ${min})`
            : `${priced.length} competition fees (Rs ${min}–${max})`,
        );
      }
    } else {
      const fee = priced[0] ?? fees[0] ?? 0;
      parts.push(fee > 0 ? `Entry fee (Rs ${fee})` : "Paid");
    }
  } else {
    const entry = Number(form.PriceOfTicket) || 0;
    const tiers = (form.ticketTiers ?? []).filter((t) => t.active !== false);
    const allTiers = tiers.length ? tiers : (form.ticketTiers ?? []);
    if (allTiers.length) {
      const prices = allTiers.map((t) => Number(t.price) || 0);
      const price = prices.length ? Math.min(...prices) : 0;
      const n = allTiers.length;
      const tierLabel = `${n} paid tier${n === 1 ? "" : "s"}`;
      parts.push(price > 0 ? `${tierLabel} (Rs ${price})` : tierLabel);
    } else if (entry > 0) {
      parts.push(`Entry fee (Rs ${entry})`);
    } else {
      parts.push("Paid");
    }
  }

  if (Number(form.totalSeats) <= 0) {
    parts.push("Unlimited seats");
  } else {
    parts.push(`${Number(form.totalSeats)} seats`);
  }

  if (form.requiresApproval) parts.push("Approval required");

  const q = (form.customFields ?? []).length;
  parts.push(`${q} extra question${q === 1 ? "" : "s"}`);

  return `Registration: ${parts.join(" · ")}`;
}

export const TIMEZONES = [
  "Pakistan Standard Time (PKT, UTC+5)",
  "Pacific Daylight Time (PDT, UTC-7)",
  "Eastern Daylight Time (EDT, UTC-4)",
  "Greenwich Mean Time (GMT, UTC+0)",
  "Central European Time (CET, UTC+1)",
];

export function isHackathonForm(
  form: Pick<EventFormData, "eventFormatId" | "eventType" | "categoryFormatId" | "isHackathon">,
): boolean {
  if (form.isHackathon) return true;
  const id = String(form.eventFormatId || form.categoryFormatId || "").toLowerCase();
  const name = String(form.eventType || "").toLowerCase();
  return (
    id === "hackathon" ||
    name === "hackathon" ||
    id.includes("hackathon") ||
    name.includes("hackathon")
  );
}

export function emptyTrack(partial?: Partial<WizardTrackDraft>): WizardTrackDraft {
  return {
    id: partial?.id || `track-${Date.now()}`,
    name: partial?.name ?? "Main",
    description: partial?.description ?? "",
    imageUrl: partial?.imageUrl ?? "",
    fee: partial?.fee ?? 0,
    discountPercent: partial?.discountPercent ?? 0,
    discountNote: partial?.discountNote ?? "",
    discountExpiresAt: partial?.discountExpiresAt ?? "",
    policies: partial?.policies ?? "",
    instructions: partial?.instructions ?? "",
    minTeamSize: partial?.minTeamSize ?? 1,
    maxTeamSize: partial?.maxTeamSize ?? 4,
    kind: partial?.kind ?? "business",
    rulesText: partial?.rulesText ?? "",
  };
}

export function durationLabel(
  startDate: string,
  endDate: string,
  startTime: string,
  endTime: string,
): string {
  const start = parseLocal(startDate, startTime);
  const end = parseLocal(endDate || startDate, endTime);
  if (!start || !end || end <= start) return "Set start and end to see duration";
  const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours && mins) return `Total duration: ${hours} hour${hours === 1 ? "" : "s"} ${mins} min`;
  if (hours) return `Total duration: ${hours} hour${hours === 1 ? "" : "s"}`;
  return `Total duration: ${mins} min`;
}

function parseLocal(date: string, time: string): Date | null {
  const d = String(date || "").trim();
  const t = to24h(time);
  if (!d || !t) return null;
  const isoDate = d.includes("/") ? dmyToIso(d) : d;
  const parsed = new Date(`${isoDate}T${t}:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function dmyToIso(dmy: string): string {
  const [dd, mm, yyyy] = dmy.split("/");
  if (!yyyy || !mm || !dd) return dmy;
  return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
}

export function to24h(value: string): string {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const match12 = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let hours = Number(match12[1]);
    const mins = match12[2];
    const mer = match12[3].toUpperCase();
    if (mer === "AM" && hours === 12) hours = 0;
    if (mer === "PM" && hours !== 12) hours += 12;
    return `${String(hours).padStart(2, "0")}:${mins}`;
  }
  const match24 = raw.match(/^(\d{1,2}):(\d{2})/);
  if (!match24) return "";
  return `${String(Number(match24[1])).padStart(2, "0")}:${match24[2]}`;
}

export function formatTimeDisplay(value: string, hour12: boolean): string {
  const t = to24h(value);
  if (!t) return "";
  if (!hour12) return t;
  const [hStr, m] = t.split(":");
  let h = Number(hStr);
  const mer = h >= 12 ? "PM" : "AM";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${m} ${mer}`;
}

export function osmEmbedFromMapUrl(url: string): string | null {
  const raw = String(url || "").trim();
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.toLowerCase();
    const q = parsed.searchParams;
    const mlat = q.get("mlat");
    const mlon = q.get("mlon");
    if (mlat && mlon) return bboxEmbed(Number(mlat), Number(mlon));
    const qlat = q.get("lat") || q.get("latitude");
    const qlng = q.get("lng") || q.get("lon") || q.get("longitude");
    if (qlat && qlng) return bboxEmbed(Number(qlat), Number(qlng));
    const bbox = q.get("bbox");
    if (bbox && bbox.split(",").length === 4) {
      return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}`;
    }
    if (
      host.includes("google.") ||
      host.includes("maps.app.goo.gl") ||
      host.includes("openstreetmap.org")
    ) {
      const at = raw.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (at) return bboxEmbed(Number(at[1]), Number(at[2]));
      const qMatch = raw.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (qMatch) return bboxEmbed(Number(qMatch[1]), Number(qMatch[2]));
      const hash = raw.match(/#map=\d+\/(-?\d+\.\d+)\/(-?\d+\.\d+)/);
      if (hash) return bboxEmbed(Number(hash[1]), Number(hash[2]));
    }
  } catch {
    return null;
  }
  return null;
}

function bboxEmbed(lat: number, lng: number): string | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const d = 0.01;
  const bbox = `${lng - d},${lat - d},${lng + d},${lat + d}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik`;
}
