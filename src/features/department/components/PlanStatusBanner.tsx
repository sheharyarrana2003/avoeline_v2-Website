import Link from "next/link";
import type { DepartmentPlan } from "../department.service";
import { MODULE_LABELS } from "@/src/features/permissions/moduleKeys";

export function PlanStatusBanner({
  plan,
  audience,
}: {
  plan: DepartmentPlan | null;
  audience: "department" | "organizer" | "club";
}) {
  if (!plan) return null;
  return (
    <div className="rounded-xl border border-line bg-paper px-4 py-3 sm:flex sm:items-center sm:justify-between sm:gap-4">
      <div>
        <p className="text-sm text-ink">
          You are on the <strong>{plan.name}</strong> plan
          <span className="ml-1.5 text-2xs uppercase text-ink-faint">{plan.key}</span>
        </p>
        <p className="mt-1 text-xs text-ink-soft">
          {plan.modules.length
            ? plan.modules.map((k) => MODULE_LABELS[k]).join(" · ")
            : "No features on this plan yet."}
        </p>
      </div>
      <p className="mt-2 text-xs text-ink-soft sm:mt-0 sm:text-right">
        Want to upgrade?{" "}
        {audience === "department" ? (
          <span>Ask the platform owner to change this department&apos;s plan.</span>
        ) : audience === "club" ? (
          <span>These features are what your department granted this club — not your personal organizer plan.</span>
        ) : (
          <Link href="/support" className="font-medium text-ink hover:underline">
            Contact support
          </Link>
        )}
      </p>
    </div>
  );
}
