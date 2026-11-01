import type { PublicStats } from "./publicStats";

export type StatSettingRow = {
  key: string;
  label: string;
  visible: boolean;
  min_threshold: number;
  format?: string | null;
};

export type FilteredStatItem = {
  key: string;
  label: string;
  value: string;
  raw: number;
};

export type SortablePublicPlan = {
  sort_order: number;
  is_recommended?: boolean | null;
};

/** Format a raw aggregate for display (`number` | `compact`). */
export function formatStatValue(raw: number, format?: string | null): string {
  const n = Number.isFinite(raw) ? raw : 0;
  if ((format ?? "number").toLowerCase() === "compact") {
    return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
  }
  return new Intl.NumberFormat("en").format(n);
}

/**
 * Keep only visible stats whose live value meets `min_threshold`.
 * Never invents values — missing keys read as 0 and are filtered out when threshold > 0.
 */
export function filterStatsByThreshold(
  stats: PublicStats | null | undefined,
  settings: StatSettingRow[] | null | undefined,
): FilteredStatItem[] {
  if (!stats || !settings?.length) return [];
  const out: FilteredStatItem[] = [];
  for (const setting of settings) {
    if (!setting.visible) continue;
    const raw = Number((stats as Record<string, number>)[setting.key] ?? 0);
    const threshold = Number(setting.min_threshold ?? 0);
    if (!Number.isFinite(raw) || raw < threshold) continue;
    out.push({
      key: setting.key,
      label: setting.label,
      raw,
      value: formatStatValue(raw, setting.format),
    });
  }
  return out;
}

/** Public plans: `sort_order` ascending; recommended breaks ties. */
export function sortPublicPlans<T extends SortablePublicPlan>(plans: T[]): T[] {
  return [...plans].sort((a, b) => {
    const order = (a.sort_order ?? 0) - (b.sort_order ?? 0);
    if (order !== 0) return order;
    return Number(Boolean(b.is_recommended)) - Number(Boolean(a.is_recommended));
  });
}

/** Sections with no real items should not render. */
export function shouldHideEmptySection(items: unknown[] | null | undefined): boolean {
  return !Array.isArray(items) || items.length === 0;
}
