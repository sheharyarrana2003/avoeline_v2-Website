"use client";

import React, { useState } from "react";
import { Save, X, Settings2 } from "lucide-react";
import type { CategoryFieldDefinition, SuperCategoryDoc } from "../categoryEngine.types";
import { saveCategoryFieldSetAction } from "../actions/categoryEngine.action";
import { buttonClass } from "@/src/lib/ui";
import {
  DynamicFieldBuilder,
  type DynamicFieldDefinition,
} from "@/src/shared_components/DynamicFieldBuilder";

interface FieldSetEditorModalProps {
  superCategory: SuperCategoryDoc;
  initialFields: CategoryFieldDefinition[];
  onClose: () => void;
  onSaved: () => void;
}

export const FieldSetEditorModal: React.FC<FieldSetEditorModalProps> = ({
  superCategory,
  initialFields,
  onClose,
  onSaved,
}) => {
  const [fields, setFields] = useState<CategoryFieldDefinition[]>(
    initialFields.length > 0 ? initialFields : [],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFields = (next: DynamicFieldDefinition[]) => {
    setFields(
      next.map((f) => ({
        key: f.key,
        label: f.label,
        type: f.type === "long_text" ? "text" : (f.type as CategoryFieldDefinition["type"]),
        required: f.required,
        options: f.options,
      })),
    );
  };

  const handleSave = async () => {
    setError(null);
    const seenKeys = new Set<string>();
    for (const f of fields) {
      if (!f.label.trim()) {
        setError("All custom fields must have a display label.");
        return;
      }
      if (!f.key.trim()) {
        setError("All custom fields must have a unique identifier key.");
        return;
      }
      const key = f.key.trim().toLowerCase();
      if (seenKeys.has(key)) {
        setError(`Duplicate field key "${f.key}". Each key must be unique.`);
        return;
      }
      seenKeys.add(key);
      if (f.type === "select" && (!f.options || f.options.length === 0)) {
        setError(`Please provide dropdown options for "${f.label}".`);
        return;
      }
    }

    setSaving(true);
    try {
      const res = await saveCategoryFieldSetAction(superCategory.id, fields);
      if (res.success) {
        onSaved();
      } else {
        setError(res.error || "Failed to save category fields.");
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-paper border border-line rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-muted text-ink flex items-center justify-center">
              <Settings2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-ink">
                Custom Fields: {superCategory.name}
              </h3>
              <p className="text-xs text-ink-soft">
                Extra questions shown in Create Event when organizers pick this category.
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
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg text-xs border border-danger-line bg-danger-soft text-danger">
              {error}
            </div>
          )}
          <p className="rounded-lg border border-line bg-muted/50 px-3 py-2 text-xs text-ink-soft">
            Custom fields become additional Create Event form inputs (labels, types, and required
            flags) after the organizer selects this super category. They do not replace the standard
            event fields.
          </p>
          <div className="grid gap-4 lg:grid-cols-2">
            <DynamicFieldBuilder
              fields={fields}
              onChange={handleFields}
              emptyTitle={`No custom fields attached to ${superCategory.name} yet.`}
            />
            <aside className="rounded-xl border border-dashed border-line bg-muted/30 p-4">
              <p className="text-2xs font-semibold uppercase tracking-wider text-ink-soft">
                Organizer preview
              </p>
              <p className="mt-1 text-xs text-ink-soft">Read-only mock of the Create Event step.</p>
              <div className="mt-4 space-y-3">
                {fields.length === 0 ? (
                  <p className="text-sm text-ink-faint">No custom questions yet.</p>
                ) : (
                  fields.map((f) => (
                    <div key={f.key || f.label} className="space-y-1">
                      <label className="block text-xs font-medium text-ink">
                        {f.label || "Untitled field"}
                        {f.required ? <span className="text-danger"> *</span> : null}
                      </label>
                      {f.type === "select" ? (
                        <select
                          disabled
                          className="w-full rounded-md border border-line bg-paper px-2 py-1.5 text-sm text-ink-faint"
                        >
                          <option>{(f.options && f.options[0]) || "Choose…"}</option>
                        </select>
                      ) : f.type === "checkbox" ? (
                        <label className="flex items-center gap-2 text-sm text-ink-soft">
                          <input type="checkbox" disabled /> Yes
                        </label>
                      ) : (
                        <input
                          disabled
                          type={f.type === "number" ? "number" : "text"}
                          placeholder="Answer…"
                          className="w-full rounded-md border border-line bg-paper px-2 py-1.5 text-sm text-ink-faint"
                        />
                      )}
                    </div>
                  ))
                )}
              </div>
            </aside>
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
            {saving ? "Saving..." : "Save Custom Fields"}
          </button>
        </div>
      </div>
    </div>
  );
};
