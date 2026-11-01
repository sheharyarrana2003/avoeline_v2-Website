"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import { ConfirmDialog } from "@/src/shared_components/ui/ConfirmDialog";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { Modal } from "@/src/components/ui/Modal";
import {
  deletePartnerAction,
  setPartnerConsentAction,
  upsertPartnerAction,
} from "../../actions/partners.action";

export type PartnerAdminRow = {
  id: string;
  name: string;
  url: string | null;
  category: string | null;
  description: string | null;
  consent_status: string;
  visible: boolean;
  featured: boolean;
  sort: number;
  organizer_id: string | null;
};

export function PartnersCmsPanel({ partners }: { partners: PartnerAdminRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [edit, setEdit] = useState<Partial<PartnerAdminRow> | null>(null);
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-between gap-3">
        <p className="text-sm text-ink-soft">
          Organizer opt-ins arrive as pending. Approve to show; revoke hides immediately.
        </p>
        <button
          type="button"
          className={buttonClass("primary", "md")}
          onClick={() =>
            setEdit({
              name: "",
              url: "",
              category: "",
              description: "",
              consent_status: "pending",
              visible: false,
              featured: false,
              sort: 0,
            })
          }
        >
          Add partner
        </button>
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {partners.length === 0 ? (
        <EmptyState
          title="No partners"
          description="Add a logo partner or wait for organizer opt-ins."
          size="sm"
        />
      ) : (
        <ul className="space-y-3">
          {partners.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line p-4"
            >
              <div>
                <p className="font-medium text-ink">{p.name}</p>
                <p className="text-xs text-ink-soft">
                  {p.category || "uncategorized"}
                  {p.organizer_id ? " · organizer opt-in" : ""}
                </p>
              </div>
              <StatusBadge
                status={
                  p.consent_status === "granted"
                    ? "approved"
                    : p.consent_status === "revoked"
                      ? "rejected"
                      : "pending"
                }
                label={p.consent_status}
                size="sm"
              />
              <div className="flex flex-wrap gap-2">
                {p.consent_status !== "granted" ? (
                  <button
                    type="button"
                    className={buttonClass("secondary", "sm")}
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        const res = await setPartnerConsentAction({
                          id: p.id,
                          status: "granted",
                          visible: true,
                        });
                        if (!res.ok) setError(res.error.message);
                        else router.refresh();
                      })
                    }
                  >
                    Approve
                  </button>
                ) : null}
                <button
                  type="button"
                  className={buttonClass("ghost", "sm")}
                  onClick={() => setEdit(p)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className={buttonClass("ghost", "sm")}
                  onClick={() => setRevokeId(p.id)}
                >
                  Revoke
                </button>
                <button
                  type="button"
                  className={buttonClass("ghost", "sm")}
                  onClick={() => setDeleteId(p.id)}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={Boolean(edit)}
        onClose={() => setEdit(null)}
        title={edit?.id ? "Edit partner" : "Add partner"}
        maxWidth="lg"
        footer={
          <button
            type="button"
            className={buttonClass("primary", "md")}
            disabled={pending || !edit?.name?.trim()}
            onClick={() =>
              startTransition(async () => {
                if (!edit?.name?.trim()) return;
                const res = await upsertPartnerAction({
                  id: edit.id,
                  name: edit.name,
                  url: edit.url || null,
                  category: edit.category || null,
                  description: edit.description || null,
                  featured: edit.featured ?? false,
                  visible: edit.visible ?? false,
                  sort: edit.sort ?? 0,
                  consent_status:
                    (edit.consent_status as "pending" | "granted" | "revoked") || "pending",
                });
                if (!res.ok) setError(res.error.message);
                else {
                  setEdit(null);
                  router.refresh();
                }
              })
            }
          >
            Save
          </button>
        }
      >
        {edit ? (
          <div className="grid gap-3">
            <div>
              <label className={labelClass}>Name</label>
              <input
                className={fieldClass}
                value={edit.name ?? ""}
                onChange={(e) => setEdit({ ...edit, name: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>URL</label>
              <input
                className={fieldClass}
                value={edit.url ?? ""}
                onChange={(e) => setEdit({ ...edit, url: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Category</label>
              <input
                className={fieldClass}
                value={edit.category ?? ""}
                onChange={(e) => setEdit({ ...edit, category: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Description</label>
              <textarea
                className={fieldClass}
                value={edit.description ?? ""}
                onChange={(e) => setEdit({ ...edit, description: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Sort</label>
              <input
                className={fieldClass}
                type="number"
                value={edit.sort ?? 0}
                onChange={(e) => setEdit({ ...edit, sort: Number(e.target.value) || 0 })}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={edit.visible ?? false}
                onChange={(e) => setEdit({ ...edit, visible: e.target.checked })}
              />
              Visible
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={edit.featured ?? false}
                onChange={(e) => setEdit({ ...edit, featured: e.target.checked })}
              />
              Featured
            </label>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(revokeId)}
        title="Revoke partner consent?"
        description="The logo will hide from the public partners page immediately."
        confirmLabel="Revoke"
        tone="danger"
        busy={pending}
        onCancel={() => setRevokeId(null)}
        onConfirm={() =>
          startTransition(async () => {
            if (!revokeId) return;
            const res = await setPartnerConsentAction({ id: revokeId, status: "revoked" });
            setRevokeId(null);
            if (!res.ok) setError(res.error.message);
            else router.refresh();
          })
        }
      />

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete partner?"
        description="This permanently removes the partner row."
        confirmLabel="Delete"
        tone="danger"
        busy={pending}
        onCancel={() => setDeleteId(null)}
        onConfirm={() =>
          startTransition(async () => {
            if (!deleteId) return;
            const res = await deletePartnerAction({ id: deleteId });
            setDeleteId(null);
            if (!res.ok) setError(res.error.message);
            else router.refresh();
          })
        }
      />
    </div>
  );
}
