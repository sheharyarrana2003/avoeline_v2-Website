"use client";

import { useState, useTransition } from "react";
import { FileText, Plus, Star, Trash2 } from "lucide-react";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import {
  deleteQuotationTemplateAction,
  saveQuotationTemplateAction,
  setDefaultQuotationTemplateAction,
} from "../actions/quotationTemplates.action";
import { QUOTATION_TEMPLATE_PLACEHOLDERS, type QuotationTemplate } from "../types";

type Props = {
  vendorId: string;
  initialTemplates: QuotationTemplate[];
};

const PLACEHOLDER_HELP = QUOTATION_TEMPLATE_PLACEHOLDERS.map((k) => `{{${k}}}`).join(", ");

export function QuotationTemplatesBoard({ vendorId, initialTemplates }: Props) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setBodyHtml("");
    setIsDefault(false);
    setError(null);
  };

  const startEdit = (t: QuotationTemplate) => {
    setEditingId(t.id);
    setName(t.name);
    setBodyHtml(t.bodyHtml);
    setIsDefault(t.isDefault);
    setError(null);
  };

  const startCreate = () => {
    resetForm();
    setName("New template");
    setBodyHtml(
      "Dear organizer,\n\nPlease find our quote for {{event_name}}.\n\nTotal: {{quote_total}} {{currency}}\nValid until: {{validity}}\n\n— {{business_name}}",
    );
  };

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      const res = await saveQuotationTemplateAction({
        vendorId,
        id: editingId ?? undefined,
        name,
        bodyHtml,
        isDefault,
      });
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      setTemplates((prev) => {
        const others = prev.filter((t) => t.id !== res.data.id);
        const next = res.data.isDefault ? others.map((t) => ({ ...t, isDefault: false })) : others;
        return [res.data, ...next];
      });
      resetForm();
    });
  };

  const handleDelete = (templateId: string) => {
    if (!confirm("Delete this template?")) return;
    startTransition(async () => {
      const res = await deleteQuotationTemplateAction({ vendorId, templateId });
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      setTemplates((prev) => prev.filter((t) => t.id !== templateId));
      if (editingId === templateId) resetForm();
    });
  };

  const handleSetDefault = (templateId: string) => {
    startTransition(async () => {
      const res = await setDefaultQuotationTemplateAction({ vendorId, templateId });
      if (!res.ok) {
        setError(res.error.message);
        return;
      }
      setTemplates((prev) =>
        prev.map((t) => ({
          ...t,
          isDefault: t.id === templateId,
        })),
      );
    });
  };

  const formOpen = name !== "" || bodyHtml !== "" || editingId != null;

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <PageHeader
          title="Quote templates"
          description="Reusable quote messages. Placeholders are replaced when you prepare a quote."
          actions={
            !formOpen ? (
              <button type="button" onClick={startCreate} className={buttonClass("primary")}>
                <Plus size={16} aria-hidden="true" />
                New template
              </button>
            ) : undefined
          }
        />

        {error && (
          <p role="alert" className="mb-4 text-sm font-medium text-ink">
            {error}
          </p>
        )}

        {formOpen && (
          <section className="mb-10 space-y-4 border-b border-line pb-10">
            <h2 className="font-display text-xl text-ink">
              {editingId ? "Edit template" : "New template"}
            </h2>
            <div>
              <label htmlFor="tpl-name" className={labelClass}>
                Name
              </label>
              <input
                id="tpl-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`${fieldClass} mt-2`}
                maxLength={120}
              />
            </div>
            <div>
              <label htmlFor="tpl-body" className={labelClass}>
                Body
              </label>
              <textarea
                id="tpl-body"
                value={bodyHtml}
                onChange={(e) => setBodyHtml(e.target.value)}
                rows={10}
                className={`${fieldClass} mt-2 font-mono text-sm`}
                placeholder="Use {{placeholders}} for dynamic values"
              />
              <p className="mt-2 text-2xs text-ink-soft">Placeholders: {PLACEHOLDER_HELP}</p>
            </div>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
              />
              Set as default (applied when preparing a quote)
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={isPending || !name.trim()}
                className={buttonClass("primary")}
              >
                {isPending ? "Saving…" : "Save template"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                disabled={isPending}
                className={buttonClass("secondary")}
              >
                Cancel
              </button>
            </div>
          </section>
        )}

        {templates.length === 0 && !formOpen ? (
          <EmptyState
            icon={<FileText size={26} />}
            title="No templates yet"
            description="Create a default message with placeholders like {{event_name}} and {{quote_total}}."
            action={
              <button type="button" onClick={startCreate} className={buttonClass("primary")}>
                <Plus size={16} aria-hidden="true" />
                New template
              </button>
            }
          />
        ) : (
          <ul className="divide-y divide-line">
            {templates.map((t) => (
              <li
                key={t.id}
                className="flex flex-col gap-3 py-5 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-medium text-ink">{t.name}</h3>
                    {t.isDefault && (
                      <span className="text-2xs font-medium uppercase text-ink-soft">Default</span>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-ink-soft">
                    {t.bodyHtml || "(empty)"}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {!t.isDefault && (
                    <button
                      type="button"
                      onClick={() => handleSetDefault(t.id)}
                      disabled={isPending}
                      className={buttonClass("secondary", "sm")}
                      title="Set as default"
                    >
                      <Star size={14} aria-hidden="true" />
                      Default
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => startEdit(t)}
                    disabled={isPending}
                    className={buttonClass("secondary", "sm")}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(t.id)}
                    disabled={isPending}
                    className={buttonClass("ghost", "sm")}
                    aria-label={`Delete ${t.name}`}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
