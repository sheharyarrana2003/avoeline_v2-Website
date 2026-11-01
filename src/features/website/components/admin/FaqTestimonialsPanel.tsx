"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import { ConfirmDialog } from "@/src/shared_components/ui/ConfirmDialog";
import { Modal } from "@/src/components/ui/Modal";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import {
  deleteFaqAction,
  deleteTestimonialAction,
  upsertFaqAction,
  upsertTestimonialAction,
} from "../../actions/content.action";

export type FaqRow = {
  id: string;
  scope: string;
  question: string;
  answer_md: string;
  sort: number;
  visible: boolean;
};

export type TestimonialRow = {
  id: string;
  quote: string;
  name: string;
  role: string | null;
  organization: string | null;
  consent_confirmed: boolean;
  visible: boolean;
  sort: number;
};

export function FaqTestimonialsPanel({
  faqs,
  testimonials,
}: {
  faqs: FaqRow[];
  testimonials: TestimonialRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [faqEdit, setFaqEdit] = useState<Partial<FaqRow> | null>(null);
  const [tEdit, setTEdit] = useState<Partial<TestimonialRow> | null>(null);
  const [deleteFaqId, setDeleteFaqId] = useState<string | null>(null);
  const [deleteTId, setDeleteTId] = useState<string | null>(null);

  return (
    <div className="space-y-8">
      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-ink">FAQs</h3>
          <button
            type="button"
            className={buttonClass("secondary", "sm")}
            onClick={() =>
              setFaqEdit({
                scope: "general",
                question: "",
                answer_md: "",
                sort: 0,
                visible: false,
              })
            }
          >
            Add FAQ
          </button>
        </div>
        <ul className="space-y-2">
          {faqs.map((f) => (
            <li
              key={f.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium">{f.question}</p>
                <p className="text-xs text-ink-soft">
                  {f.scope} · sort {f.sort}
                </p>
              </div>
              <StatusBadge
                status={f.visible ? "approved" : "draft"}
                label={f.visible ? "Visible" : "Hidden"}
                size="sm"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  className={buttonClass("ghost", "sm")}
                  onClick={() => setFaqEdit(f)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className={buttonClass("ghost", "sm")}
                  onClick={() => setDeleteFaqId(f.id)}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-ink">Testimonials</h3>
          <button
            type="button"
            className={buttonClass("secondary", "sm")}
            onClick={() =>
              setTEdit({
                quote: "",
                name: "",
                role: "",
                organization: "",
                consent_confirmed: false,
                visible: false,
                sort: 0,
              })
            }
          >
            Add testimonial
          </button>
        </div>
        <ul className="space-y-2">
          {testimonials.map((t) => (
            <li
              key={t.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium">{t.name}</p>
                <p className="line-clamp-2 text-xs text-ink-soft">{t.quote}</p>
              </div>
              <StatusBadge
                status={t.consent_confirmed ? "approved" : "pending"}
                label={t.consent_confirmed ? "Consented" : "No consent"}
                size="sm"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  className={buttonClass("ghost", "sm")}
                  onClick={() => setTEdit(t)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className={buttonClass("ghost", "sm")}
                  onClick={() => setDeleteTId(t.id)}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <Modal
        open={Boolean(faqEdit)}
        onClose={() => setFaqEdit(null)}
        title={faqEdit?.id ? "Edit FAQ" : "Add FAQ"}
        maxWidth="lg"
        footer={
          <button
            type="button"
            className={buttonClass("primary", "md")}
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                if (!faqEdit?.question?.trim()) return;
                const res = await upsertFaqAction({
                  id: faqEdit.id,
                  scope: faqEdit.scope || "general",
                  question: faqEdit.question,
                  answer_md: faqEdit.answer_md || "",
                  sort: faqEdit.sort ?? 0,
                  visible: faqEdit.visible ?? false,
                });
                if (!res.ok) setError(res.error.message);
                else {
                  setFaqEdit(null);
                  router.refresh();
                }
              })
            }
          >
            Save
          </button>
        }
      >
        {faqEdit ? (
          <div className="grid gap-3">
            <div>
              <label className={labelClass}>Question</label>
              <input
                className={fieldClass}
                value={faqEdit.question ?? ""}
                onChange={(e) => setFaqEdit({ ...faqEdit, question: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Answer (markdown)</label>
              <textarea
                className={`${fieldClass} min-h-32`}
                value={faqEdit.answer_md ?? ""}
                onChange={(e) => setFaqEdit({ ...faqEdit, answer_md: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Scope</label>
              <input
                className={fieldClass}
                value={faqEdit.scope ?? "general"}
                onChange={(e) => setFaqEdit({ ...faqEdit, scope: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Sort</label>
              <input
                className={fieldClass}
                type="number"
                value={faqEdit.sort ?? 0}
                onChange={(e) => setFaqEdit({ ...faqEdit, sort: Number(e.target.value) || 0 })}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={faqEdit.visible ?? false}
                onChange={(e) => setFaqEdit({ ...faqEdit, visible: e.target.checked })}
              />
              Visible
            </label>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={Boolean(tEdit)}
        onClose={() => setTEdit(null)}
        title={tEdit?.id ? "Edit testimonial" : "Add testimonial"}
        maxWidth="lg"
        footer={
          <button
            type="button"
            className={buttonClass("primary", "md")}
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                if (!tEdit?.quote?.trim() || !tEdit?.name?.trim()) return;
                const res = await upsertTestimonialAction({
                  id: tEdit.id,
                  quote: tEdit.quote,
                  name: tEdit.name,
                  role: tEdit.role || null,
                  organization: tEdit.organization || null,
                  consent_confirmed: tEdit.consent_confirmed ?? false,
                  visible: tEdit.visible ?? false,
                  sort: tEdit.sort ?? 0,
                });
                if (!res.ok) setError(res.error.message);
                else {
                  setTEdit(null);
                  router.refresh();
                }
              })
            }
          >
            Save
          </button>
        }
      >
        {tEdit ? (
          <div className="grid gap-3">
            <div>
              <label className={labelClass}>Quote</label>
              <textarea
                className={`${fieldClass} min-h-24`}
                value={tEdit.quote ?? ""}
                onChange={(e) => setTEdit({ ...tEdit, quote: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Name</label>
              <input
                className={fieldClass}
                value={tEdit.name ?? ""}
                onChange={(e) => setTEdit({ ...tEdit, name: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Role</label>
              <input
                className={fieldClass}
                value={tEdit.role ?? ""}
                onChange={(e) => setTEdit({ ...tEdit, role: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Organization</label>
              <input
                className={fieldClass}
                value={tEdit.organization ?? ""}
                onChange={(e) => setTEdit({ ...tEdit, organization: e.target.value })}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={tEdit.consent_confirmed ?? false}
                onChange={(e) => setTEdit({ ...tEdit, consent_confirmed: e.target.checked })}
              />
              Consent confirmed
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={tEdit.visible ?? false}
                onChange={(e) => setTEdit({ ...tEdit, visible: e.target.checked })}
              />
              Visible (requires consent)
            </label>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteFaqId)}
        title="Delete FAQ?"
        description="This removes the FAQ from the site after the next publish/revalidation."
        confirmLabel="Delete"
        tone="danger"
        busy={pending}
        onCancel={() => setDeleteFaqId(null)}
        onConfirm={() =>
          startTransition(async () => {
            if (!deleteFaqId) return;
            const res = await deleteFaqAction({ id: deleteFaqId });
            setDeleteFaqId(null);
            if (!res.ok) setError(res.error.message);
            else router.refresh();
          })
        }
      />
      <ConfirmDialog
        open={Boolean(deleteTId)}
        title="Delete testimonial?"
        description="This permanently removes the testimonial."
        confirmLabel="Delete"
        tone="danger"
        busy={pending}
        onCancel={() => setDeleteTId(null)}
        onConfirm={() =>
          startTransition(async () => {
            if (!deleteTId) return;
            const res = await deleteTestimonialAction({ id: deleteTId });
            setDeleteTId(null);
            if (!res.ok) setError(res.error.message);
            else router.refresh();
          })
        }
      />
    </div>
  );
}
