/** Map UI access type (`tiered`) to Postgres `events.visibility` check value. */
export function toDbVisibility(
  accessType: string,
): "public" | "private" | "invite_only" | "hybrid" | "vip_tiered" {
  const v = String(accessType || "")
    .trim()
    .toLowerCase();
  if (v === "tiered" || v === "vip_tiered") return "vip_tiered";
  if (v === "private") return "private";
  if (v === "invite_only") return "invite_only";
  if (v === "hybrid") return "hybrid";
  return "public";
}

/** Map DB visibility to UI `EventAccessType` (`tiered`). */
export function toUiAccessType(
  visibility: string | null | undefined,
): "public" | "private" | "invite_only" | "hybrid" | "tiered" {
  const v = String(visibility || "")
    .trim()
    .toLowerCase();
  if (v === "vip_tiered" || v === "tiered") return "tiered";
  if (v === "private") return "private";
  if (v === "invite_only") return "invite_only";
  if (v === "hybrid") return "hybrid";
  return "public";
}

/** Wizard AccessTypeSelector ids → DB visibility (never remap hybrid/VIP to invite_only). */
export function wizardAccessTypeToVisibility(
  accessType: string,
): "public" | "private" | "invite_only" | "hybrid" | "vip_tiered" {
  return toDbVisibility(accessType);
}
