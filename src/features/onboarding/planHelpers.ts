import type { PlanRow } from "@/src/features/saas/saas.service";

/** Pure helper — safe for unit tests (no server-only import). */
export function planIsFree(plan: PlanRow): boolean {
  const monthly = Number(plan.price_monthly ?? 0);
  return (
    !Number.isFinite(monthly) || monthly <= 0 || plan.key === "free" || plan.key === "vendor_free"
  );
}
