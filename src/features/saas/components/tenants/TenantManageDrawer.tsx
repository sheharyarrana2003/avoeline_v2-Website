"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import {
  ALL_MODULE_KEYS,
  MODULE_LABELS,
  ORGANIZER_MODULE_KEYS,
  VENDOR_MODULE_KEYS,
  type ModuleKey,
} from "@/src/features/permissions/moduleKeys";
import type {
  ClubOption,
  PlanOption,
  TenantBoardCard,
  TenantCapsFlags,
} from "@/src/features/saas/tenantBoard.types";
import { EmailLimitsPanel } from "./EmailLimitsPanel";

type Effect = "plan_default" | "grant" | "deny";

type StagedChange = {
  moduleKey: ModuleKey;
  effect: Effect;
  expiresAt: string;
};

const GROUPS: { title: string; keys: ModuleKey[] }[] = [
  { title: "Organizer core", keys: ORGANIZER_MODULE_KEYS.slice(0, 7) as ModuleKey[] },
  { title: "Organizer paid", keys: ORGANIZER_MODULE_KEYS.slice(7) as ModuleKey[] },
  { title: "Vendor", keys: VENDOR_MODULE_KEYS as ModuleKey[] },
];

export function TenantManageDrawer({
  card,
  plans,
  clubs,
  caps,
  onClose,
  onChangePlan,
  onPricing,
  onReviewGrants,
}: {
  card: TenantBoardCard;
  plans: PlanOption[];
  clubs: ClubOption[];
  caps: TenantCapsFlags;
  onClose: () => void;
  onChangePlan: () => void;
  onPricing: () => void;
  onReviewGrants: (staged: StagedChange[]) => void;
}) {
  const [tab, setTab] = useState<"plan" | "features" | "pricing" | "email" | "history">("features");
  const [scope, setScope] = useState<"whole" | "club">("whole");
  const [clubId, setClubId] = useState("");
  const [staged, setStaged] = useState<Record<string, StagedChange>>({});

  const moduleKeys = useMemo(() => {
    if (card.kind === "vendor") return VENDOR_MODULE_KEYS as ModuleKey[];
    return ALL_MODULE_KEYS.filter((k) => !String(k).startsWith("vendor_")) as ModuleKey[];
  }, [card.kind]);

  const deptClubs = clubs.filter((c) => c.parentId === card.orgId);

  const setEffect = (moduleKey: ModuleKey, effect: Effect) => {
    setStaged((prev) => ({
      ...prev,
      [moduleKey]: {
        moduleKey,
        effect,
        expiresAt: prev[moduleKey]?.expiresAt || "",
      },
    }));
  };

  const stagedList = Object.values(staged).filter((s) => s.effect !== "plan_default");

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close"
        onClick={onClose}
      />
      <aside className="relative flex h-full w-full max-w-lg flex-col border-l border-line bg-paper shadow-xl">
        <header className="flex items-start justify-between border-b border-line px-5 py-4">
          <div>
            <p className="font-display text-lg text-ink">{card.name}</p>
            <p className="text-sm text-ink-soft capitalize">
              {card.kind} · {card.planLabel}
            </p>
          </div>
          <button
            type="button"
            className="rounded-md p-1.5 text-ink-soft hover:bg-muted"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <nav className="flex gap-1 border-b border-line px-3 pt-2">
          {(
            [
              ["plan", "Plan"],
              ["features", "Features"],
              ["pricing", "Pricing"],
              ["email", "Email"],
              ["history", "History"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`border-b-2 px-3 pb-2 text-sm ${
                tab === id
                  ? "border-accent font-semibold text-ink"
                  : "border-transparent text-ink-soft"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {tab === "plan" ? (
            <div className="space-y-3">
              <p className="text-sm text-ink-soft">
                Current plan: <strong className="text-ink">{card.planLabel}</strong>
              </p>
              {caps.changePlan ? (
                <button
                  type="button"
                  className={buttonClass("primary", "sm")}
                  onClick={onChangePlan}
                >
                  Change plan…
                </button>
              ) : null}
              <ul className="space-y-1 text-sm text-ink-soft">
                {plans
                  .filter((p) =>
                    card.kind === "vendor"
                      ? p.audience === "vendor" || p.audience === "both"
                      : !p.audience || p.audience === "organizer" || p.audience === "both",
                  )
                  .map((p) => (
                    <li
                      key={p.key}
                      className={p.key === card.planKey ? "font-medium text-ink" : ""}
                    >
                      {p.name}
                      {p.key === card.planKey ? " (current)" : ""}
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}

          {tab === "features" ? (
            <div className="space-y-4">
              {card.kind === "department" ? (
                <div className="space-y-2">
                  <span className={labelClass}>Scope</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className={buttonClass(scope === "whole" ? "primary" : "secondary", "sm")}
                      onClick={() => setScope("whole")}
                    >
                      Whole department
                    </button>
                    <button
                      type="button"
                      className={buttonClass(scope === "club" ? "primary" : "secondary", "sm")}
                      onClick={() => setScope("club")}
                    >
                      Club
                    </button>
                  </div>
                  {scope === "club" ? (
                    <select
                      className={fieldClass}
                      value={clubId}
                      onChange={(e) => setClubId(e.target.value)}
                    >
                      <option value="">Select club…</option>
                      {deptClubs.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  ) : null}
                </div>
              ) : null}

              {GROUPS.map((group) => {
                const keys = group.keys.filter((k) => moduleKeys.includes(k));
                if (!keys.length) return null;
                return (
                  <section key={group.title} className="space-y-2">
                    <h3 className="text-2xs font-medium uppercase text-ink-soft">{group.title}</h3>
                    <ul className="space-y-2">
                      {keys.map((key) => {
                        const effect = staged[key]?.effect || "plan_default";
                        return (
                          <li key={key} className="rounded-lg border border-line px-3 py-2">
                            <p className="text-sm font-medium text-ink">{MODULE_LABELS[key]}</p>
                            <div className="mt-2 flex flex-wrap gap-1">
                              {(
                                [
                                  ["plan_default", "Plan default"],
                                  ["grant", "Grant"],
                                  ["deny", "Deny"],
                                ] as const
                              ).map(([val, label]) => (
                                <button
                                  key={val}
                                  type="button"
                                  disabled={!caps.grants}
                                  className={`rounded-md border px-2 py-0.5 text-2xs ${
                                    effect === val
                                      ? "border-ink bg-ink text-ink-invert"
                                      : "border-line text-ink-soft"
                                  }`}
                                  onClick={() => setEffect(key, val)}
                                >
                                  {label}
                                </button>
                              ))}
                            </div>
                            {effect === "grant" || effect === "deny" ? (
                              <label className="mt-2 block text-xs text-ink-soft">
                                Expiry (optional)
                                <input
                                  type="datetime-local"
                                  className={`${fieldClass} mt-1`}
                                  value={staged[key]?.expiresAt || ""}
                                  onChange={(e) =>
                                    setStaged((prev) => ({
                                      ...prev,
                                      [key]: {
                                        moduleKey: key,
                                        effect,
                                        expiresAt: e.target.value,
                                      },
                                    }))
                                  }
                                />
                              </label>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                );
              })}
            </div>
          ) : null}

          {tab === "pricing" ? (
            <div className="space-y-3">
              <p className="text-sm text-ink-soft">
                {card.hasCustomPricing
                  ? "This tenant has an active custom pricing agreement."
                  : "No active custom pricing."}
              </p>
              {caps.pricing && card.kind !== "vendor" ? (
                <button type="button" className={buttonClass("primary", "sm")} onClick={onPricing}>
                  Edit custom pricing…
                </button>
              ) : null}
            </div>
          ) : null}

          {tab === "email" && card.kind !== "vendor" ? (
            <EmailLimitsPanel
              ownerId={card.id}
              canManage={Boolean(caps.grants || caps.changePlan)}
            />
          ) : null}

          {tab === "history" ? (
            <p className="text-sm text-ink-soft">
              Plan changes and emails appear under the Activity tab. Open the detail page for full
              moderation history.
            </p>
          ) : null}
        </div>

        {tab === "features" && caps.grants && stagedList.length > 0 ? (
          <footer className="sticky bottom-0 border-t border-line bg-paper px-5 py-3">
            <button
              type="button"
              className={`${buttonClass("primary")} w-full`}
              onClick={() => onReviewGrants(stagedList)}
            >
              Review changes ({stagedList.length})
            </button>
          </footer>
        ) : null}
      </aside>
    </div>
  );
}
