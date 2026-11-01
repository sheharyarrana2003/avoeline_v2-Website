"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import { Modal } from "@/components/ui/Modal";
import type { PendingApprovalTile } from "@/src/features/saas/tenantBoard.types";
import { decideTenantApprovalAction } from "@/src/features/saas/actions/tenants.action";

function Tile({
  title,
  items,
  canManage,
  onDecide,
}: {
  title: string;
  items: PendingApprovalTile[];
  canManage: boolean;
  onDecide: (item: PendingApprovalTile, action: "approve" | "reject") => void;
}) {
  return (
    <section className="rounded-xl border border-line p-4">
      <h3 className="font-medium text-ink">
        {title} <span className="text-ink-soft">({items.length})</span>
      </h3>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-ink-soft">Nothing pending.</p>
      ) : (
        <ul className="mt-3 divide-y divide-line">
          {items.map((item) => (
            <li
              key={`${item.kind}-${item.id}`}
              className="flex flex-wrap items-center justify-between gap-2 py-3"
            >
              <div>
                <p className="text-sm font-medium text-ink">{item.name}</p>
                <p className="text-xs text-ink-soft">
                  {item.subtitle}
                  {item.email ? ` · ${item.email}` : ""}
                </p>
              </div>
              {canManage ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={buttonClass("primary", "sm")}
                    onClick={() => onDecide(item, "approve")}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className={buttonClass("secondary", "sm")}
                    onClick={() => onDecide(item, "reject")}
                  >
                    Reject
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function ApprovalsTab({
  approvals,
  canManage,
}: {
  approvals: {
    orgs: PendingApprovalTile[];
    organizers: PendingApprovalTile[];
    vendors: PendingApprovalTile[];
  };
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [rejectTarget, setRejectTarget] = useState<PendingApprovalTile | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const total = approvals.orgs.length + approvals.organizers.length + approvals.vendors.length;

  const run = (item: PendingApprovalTile, action: "approve" | "reject", rejectReason?: string) => {
    setError(null);
    start(async () => {
      const res = await decideTenantApprovalAction({
        kind: item.kind,
        id: item.id,
        action,
        reason: rejectReason || null,
        sendEmail: true,
      });
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      setRejectTarget(null);
      setReason("");
      router.refresh();
    });
  };

  const onDecide = (item: PendingApprovalTile, action: "approve" | "reject") => {
    if (action === "reject") {
      setRejectTarget(item);
      return;
    }
    run(item, "approve");
  };

  if (total === 0) {
    return (
      <EmptyState
        size="sm"
        title="No pending approvals"
        description="Self-serve organizers, vendors, and unverified orgs will show up here."
      />
    );
  }

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <div className="grid gap-4 lg:grid-cols-3">
        <Tile
          title="Departments & clubs"
          items={approvals.orgs}
          canManage={canManage}
          onDecide={onDecide}
        />
        <Tile
          title="Organizers"
          items={approvals.organizers}
          canManage={canManage}
          onDecide={onDecide}
        />
        <Tile title="Vendors" items={approvals.vendors} canManage={canManage} onDecide={onDecide} />
      </div>

      {rejectTarget ? (
        <Modal
          open
          onClose={() => setRejectTarget(null)}
          title={`Reject ${rejectTarget.name}`}
          footer={
            <>
              <button
                type="button"
                className={buttonClass("ghost", "sm")}
                onClick={() => setRejectTarget(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={buttonClass("primary", "sm")}
                disabled={pending || !reason.trim()}
                onClick={() => run(rejectTarget, "reject", reason)}
              >
                {pending ? "Rejecting…" : "Reject"}
              </button>
            </>
          }
        >
          <label className="block">
            <span className={labelClass}>Reason (required)</span>
            <textarea
              className={fieldClass}
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
        </Modal>
      ) : null}
    </div>
  );
}
