"use client";

/**
 * @deprecated Prefer CreateTenantWizard on AdminTenantsBoard.
 * Kept so any leftover imports resolve during the redesign.
 */
export { CreateTenantWizard as CreateTenantModal } from "./tenants/CreateTenantWizard";
export type { PlanOption as CreateTenantPlanOption } from "@/src/features/saas/tenantBoard.types";
