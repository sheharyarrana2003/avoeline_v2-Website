"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { FilterTabs } from "@/src/shared_components/ui/FilterTabs";
import { buttonClass } from "@/src/lib/ui";
import { adminTenantsHref } from "@/src/features/saas/tenantBoard.filters";
import type { TenantBoardBundle, TenantBoardCard } from "@/src/features/saas/tenantBoard.types";
import { TenantFilters } from "./TenantFilters";
import { TenantCardsGrid } from "./TenantCardsGrid";
import { TenantManageDrawer } from "./TenantManageDrawer";
import { CreateTenantWizard } from "./CreateTenantWizard";
import { ChangePlanModal } from "./ChangePlanModal";
import { GrantDenyModal, type StagedGrantChange } from "./GrantDenyModal";
import { CustomPricingModal } from "./CustomPricingModal";
import { ApprovalsTab } from "./ApprovalsTab";
import { OverridesTab } from "./OverridesTab";
import { PricingTab } from "./PricingTab";
import { ActivityTab } from "./ActivityTab";

function HeaderTooltip() {
  return (
    <PageHeader
      title="Tenant accounts"
      description={
        <span className="inline-flex items-center gap-1.5">
          Logins for departments, organizers, and vendors
          <span className="group relative inline-flex">
            <button
              type="button"
              className="rounded-full p-0.5 text-ink-faint hover:text-ink"
              aria-label="About tenant accounts"
            >
              <Info className="h-3.5 w-3.5" />
            </button>
            <span
              role="tooltip"
              className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-72 -translate-x-1/2 rounded-xl border border-line bg-paper p-3 text-xs font-normal normal-case tracking-normal text-ink-soft opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-within:opacity-100"
            >
              Creates people who can sign in. Departments and clubs as folders live under
              Departments &amp; clubs. Platform staff live under Platform staff. Passwords are never
              emailed.
            </span>
          </span>
        </span>
      }
    />
  );
}

export function AdminTenantsBoard({ bundle }: { bundle: TenantBoardBundle }) {
  const { filters, caps, tabCounts, plans } = bundle;
  const [manage, setManage] = useState<TenantBoardCard | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [changePlanOpen, setChangePlanOpen] = useState(false);
  const [grantOpen, setGrantOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [seedTenant, setSeedTenant] = useState<TenantBoardCard | null>(null);
  const [stagedGrants, setStagedGrants] = useState<StagedGrantChange[]>([]);

  const tabs = [
    {
      label: "Tenants",
      value: "tenants",
      href: adminTenantsHref(filters, { tab: "tenants", page: 1 }),
      count: tabCounts.tenants,
    },
    {
      label: "Approvals",
      value: "approvals",
      href: adminTenantsHref(filters, { tab: "approvals" }),
      count: tabCounts.approvals,
      warnWhenPositive: true,
    },
    {
      label: "Access overrides",
      value: "overrides",
      href: adminTenantsHref(filters, { tab: "overrides", overrideCursor: null }),
      count: tabCounts.overrides,
    },
    {
      label: "Custom pricing",
      value: "pricing",
      href: adminTenantsHref(filters, { tab: "pricing" }),
      count: tabCounts.pricing,
    },
    {
      label: "Activity",
      value: "activity",
      href: adminTenantsHref(filters, { tab: "activity", activityCursor: null }),
      count: tabCounts.activity,
    },
  ];

  return (
    <div className="space-y-8">
      <HeaderTooltip />

      <div className="flex flex-wrap items-center gap-2">
        {caps.create ? (
          <button
            type="button"
            className={buttonClass("primary")}
            onClick={() => setCreateOpen(true)}
          >
            Create
          </button>
        ) : null}
        {caps.changePlan ? (
          <button
            type="button"
            className={buttonClass("secondary", "sm")}
            onClick={() => {
              setSeedTenant(manage);
              setChangePlanOpen(true);
            }}
          >
            Change plan
          </button>
        ) : null}
        {caps.grants ? (
          <button
            type="button"
            className={buttonClass("secondary", "sm")}
            onClick={() => {
              setSeedTenant(manage);
              setGrantOpen(true);
            }}
          >
            Grant / deny
          </button>
        ) : null}
        {caps.pricing ? (
          <button
            type="button"
            className={buttonClass("secondary", "sm")}
            onClick={() => {
              setSeedTenant(manage);
              setPricingOpen(true);
            }}
          >
            Custom pricing
          </button>
        ) : null}
      </div>

      <FilterTabs tabs={tabs} activeValue={filters.tab} label="Tenant account sections" />

      {filters.tab === "tenants" ? (
        <div className="space-y-6">
          <TenantFilters filters={filters} plans={plans} />
          <TenantCardsGrid
            cards={bundle.cards}
            total={bundle.totalCards}
            filters={filters}
            onManage={setManage}
          />
        </div>
      ) : null}

      {filters.tab === "approvals" ? (
        <ApprovalsTab approvals={bundle.approvals} canManage={caps.approvals} />
      ) : null}
      {filters.tab === "overrides" ? (
        <OverridesTab
          rows={bundle.overrides}
          nextCursor={bundle.overridesNextCursor}
          filters={filters}
          canManage={caps.grants}
        />
      ) : null}
      {filters.tab === "pricing" ? (
        <PricingTab rows={bundle.pricing} canManage={caps.pricing} plans={plans} />
      ) : null}
      {filters.tab === "activity" ? (
        <ActivityTab
          rows={bundle.activity}
          nextCursor={bundle.activityNextCursor}
          filters={filters}
        />
      ) : null}

      {manage ? (
        <TenantManageDrawer
          card={manage}
          plans={plans}
          clubs={bundle.clubs}
          caps={caps}
          onClose={() => setManage(null)}
          onChangePlan={() => {
            setSeedTenant(manage);
            setChangePlanOpen(true);
          }}
          onPricing={() => {
            setSeedTenant(manage);
            setPricingOpen(true);
          }}
          onReviewGrants={(staged) => {
            setSeedTenant(manage);
            setStagedGrants(staged);
            setGrantOpen(true);
          }}
        />
      ) : null}

      {createOpen ? (
        <CreateTenantWizard
          plans={plans}
          institutes={bundle.institutes}
          open
          onClose={() => setCreateOpen(false)}
        />
      ) : null}

      {changePlanOpen ? (
        <ChangePlanModal
          open
          onClose={() => setChangePlanOpen(false)}
          plans={plans}
          seed={seedTenant}
          cards={bundle.cards}
        />
      ) : null}

      {grantOpen ? (
        <GrantDenyModal
          open
          onClose={() => {
            setGrantOpen(false);
            setStagedGrants([]);
          }}
          seed={seedTenant}
          cards={bundle.cards}
          clubs={bundle.clubs}
          initialChanges={stagedGrants}
        />
      ) : null}

      {pricingOpen ? (
        <CustomPricingModal
          open
          onClose={() => setPricingOpen(false)}
          seed={seedTenant}
          cards={bundle.cards}
        />
      ) : null}
    </div>
  );
}
