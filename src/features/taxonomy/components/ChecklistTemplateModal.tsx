"use client";

import React, { useState } from "react";
import { Plus, Trash2, Save, X, CheckSquare, Calendar } from "lucide-react";
import type {
  ChecklistTemplateItem,
  EventFormatDoc,
  SuperCategoryDoc,
} from "../categoryEngine.types";
import { saveChecklistTemplateAction } from "../actions/categoryEngine.action";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";

interface ChecklistTemplateModalProps {
  superCategory: SuperCategoryDoc;
  eventFormats: EventFormatDoc[];
  existingTemplates: Array<{
    id: string;
    superCategoryId: string;
    eventFormatId: string;
    items: ChecklistTemplateItem[];
  }>;
  onClose: () => void;
  onSaved: () => void;
}

export const ChecklistTemplateModal: React.FC<ChecklistTemplateModalProps> = ({
  superCategory,
  eventFormats,
  existingTemplates,
  onClose,
  onSaved,
}) => {
  const [selectedFormatId, setSelectedFormatId] = useState<string>(
    eventFormats[0]?.id || ""
  );

  // Find template for selected pair
  const currentTemplate = existingTemplates.find(
    (t) =>
      t.superCategoryId === superCategory.id && t.eventFormatId === selectedFormatId
  );

  const [items, setItems] = useState<ChecklistTemplateItem[]>(
    currentTemplate?.items || []
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // When format changes, reload items
  const handleFormatChange = (fmtId: string) => {
    setSelectedFormatId(fmtId);
    const match = existingTemplates.find(
      (t) => t.superCategoryId === superCategory.id && t.eventFormatId === fmtId
    );
    setItems(match?.items || []);
  };

  const addItem = () => {
    setItems((prev) => [...prev, { title: "", dueOffsetDays: 0 }]);
  };

  const updateItem = (index: number, patch: Partial<ChecklistTemplateItem>) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setError(null);
    if (!selectedFormatId) {
      setError("Please select an Event Format.");
      return;
    }

    for (const it of items) {
      if (!it.title.trim()) {
        setError("All checklist tasks must have a title.");
        return;
      }
    }

    setSaving(true);
    try {
      const res = await saveChecklistTemplateAction(
        superCategory.id,
        selectedFormatId,
        items
      );
      if (res.success) {
        onSaved();
      } else {
        setError(res.error || "Failed to save checklist template.");
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  };

  const selectedFormatName =
    eventFormats.find((f) => f.id === selectedFormatId)?.name || "Format";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-paper border border-line rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-success-soft text-success flex items-center justify-center">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-ink">
                Checklist Template: {superCategory.name}
              </h3>
              <p className="text-xs text-ink-soft">
                Auto-populate tasks for events created with this category + format combination.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-soft hover:text-ink hover:text-ink hover:bg-muted transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-lg text-xs border border-danger-line bg-danger-soft text-danger">
              {error}
            </div>
          )}

          <div>
            <label className={labelClass}>Pair with Event Format</label>
            <select
              value={selectedFormatId}
              onChange={(e) => handleFormatChange(e.target.value)}
              className={fieldClass}
            >
              {eventFormats.map((fmt) => (
                <option key={fmt.id} value={fmt.id}>
                  {fmt.name} {!fmt.active ? "(Inactive)" : ""}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-ink-soft mt-1">
              Events created with &quot;{superCategory.name}&quot; and &quot;{selectedFormatName}&quot; will receive these tasks.
            </p>
          </div>

          <div className="border-t border-line pt-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
                Checklist Items ({items.length})
              </span>
              <button
                type="button"
                onClick={addItem}
                className={buttonClass("secondary", "sm")}
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Item
              </button>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-line rounded-xl">
                <p className="text-sm text-ink-soft mb-2">
                  No default checklist configured for this pair.
                </p>
                <button
                  type="button"
                  onClick={addItem}
                  className="text-xs text-ink hover:underline font-medium"
                >
                  + Add task template
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((it, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 rounded-xl border border-line bg-muted"
                  >
                    <div className="flex-1">
                      <input
                        type="text"
                        value={it.title}
                        placeholder="Task title (e.g. Confirm audio/visual equipment)"
                        onChange={(e) => updateItem(idx, { title: e.target.value })}
                        className={fieldClass}
                      />
                    </div>
                    <div className="w-36">
                      <div className="relative">
                        <input
                          type="number"
                          value={it.dueOffsetDays}
                          title="Days relative to event start date (e.g. -7 for 7 days before, 0 for day of)"
                          placeholder="Offset days"
                          onChange={(e) =>
                            updateItem(idx, { dueOffsetDays: Number(e.target.value) })
                          }
                          className={`${fieldClass} pr-12`}
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-ink-soft pointer-events-none">
                          days
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="text-ink-soft hover:text-rose-600 p-2 rounded transition"
                      title="Delete task"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-line bg-muted">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className={buttonClass("ghost", "sm")}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={buttonClass("primary", "sm")}
          >
            <Save className="w-3.5 h-3.5 mr-1" />
            {saving ? "Saving..." : "Save Checklist Template"}
          </button>
        </div>
      </div>
    </div>
  );
};
