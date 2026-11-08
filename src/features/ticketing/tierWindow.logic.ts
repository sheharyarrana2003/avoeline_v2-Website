/** Seats remaining when capacity is tracked; otherwise null. */
export function seatsLeftOf(
  seatsAvailable: number | null | undefined,
  seatsSold: number | null | undefined,
): number | null {
  if (seatsAvailable == null) return null;
  return Math.max(0, Number(seatsAvailable) - (Number(seatsSold) || 0));
}

/** True when available_until is in the past (ISO or parseable date). */
export function tierWindowClosed(
  availableUntil: string | null | undefined,
  now = Date.now(),
): boolean {
  if (!availableUntil) return false;
  const t = new Date(availableUntil).getTime();
  return !Number.isNaN(t) && t <= now;
}
