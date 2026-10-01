"use client";

import React, { useState } from "react";
import { Plus, Trash2, Save, X, Settings2 } from "lucide-react";
import type { CategoryFieldDefinition, CategoryFieldType, SuperCategoryDoc } from "../categoryEngine.types";
import { saveCategoryFieldSetAction } from "../actions/categoryEngine.action";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";

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
    initialFields.length > 0 ? initialFields : []
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addField = () => {
    setFields((prev) => [
      ...prev,
      {
        key: `field_${Date.now().toString(36)}`,
        label: "",
        type: "text",
        required: false,
        options: [],
      },
    ]);
  };

  const updateField = (index: number, patch: Partial<CategoryFieldDefinition>) => {
    setFields((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      // Auto-generate key from label if key was auto-generated
      if (patch.label && (!next[index].key || next[index].key.startsWith("field_"))) {
        next[index].key = patch.label
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, "_")
          .replace(/^_+|_+$/g, "");
      }
      return next;
    });
  };

  const removeField = (index: number) => {
    setFields((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setError(null);
    for (const f of fields) {
      if (!f.label.trim()) {
        setError("All custom fields must have a display label.");
        return;
      }
      if (!f.key.trim()) {
        setError("All custom fields must have a unique identifier key.");
        return;
      }
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
                Configure attributes collected when organizers select this super category.
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

          {fields.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed border-line rounded-xl">
              <p className="text-sm text-ink-soft mb-3">
                No custom fields attached to {superCategory.name} yet.
              </p>
              <button
                type="button"
                onClick={addField}
                className={buttonClass("secondary", "sm")}
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add First Field
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {fields.map((field, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-line bg-muted space-y-3 relative group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-ink-soft uppercase tracking-wider">
                      Field #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeField(idx)}
                      className="text-ink-soft hover:text-rose-600 p-1 rounded transition"
                      title="Remove field"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Field Label</label>
                      <input
                        type="text"
                        value={field.label}
                        placeholder="e.g. Cuisine Type, Team Size"
                        onChange={(e) => updateField(idx, { label: e.target.value })}
                        className={fieldClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Field Key (Storage ID)</label>
                      <input
                        type="text"
                        value={field.key}
                        placeholder="e.g. cuisine_type"
                        onChange={(e) => updateField(idx, { key: e.target.value })}
                        className={fieldClass}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                    <div>
                      <label className={labelClass}>Field Type</label>
                      <select
                        value={field.type}
                        onChange={(e) =>
                          updateField(idx, { type: e.target.value as CategoryFieldType })
                        }
                        className={fieldClass}
                      >
                        <option value="text">Text Input</option>
                        <option value="number">Number Input</option>
                        <option value="select">Dropdown Select</option>
                        <option value="checkbox">Checkbox (Toggle)</option>
                      </select>
                    </div>
                    <div className="pt-5">
                      <label className="flex items-center gap-2 cursor-pointer text-sm text-ink">
                        <input
                          type="checkbox"
                          checked={field.required || false}
                          onChange={(e) => updateField(idx, { required: e.target.checked })}
                          className="rounded border-line bg-paper text-ink"
                        />
                        <span>Required field in creation form</span>
                      </label>
                    </div>
                  </div>

                  {field.type === "select" && (
                    <div>
                      <label className={labelClass}>
                        Dropdown Options (comma separated)
                      </label>
                      <input
                        type="text"
                        value={(field.options || []).join(", ")}
                        placeholder="e.g. Italian, Mexican, Asian, Continental"
                        onChange={(e) =>
                          updateField(idx, {
                            options: e.target.value
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean),
                          })
                        }
                        className={fieldClass}
                      />
                      <p className="text-[11px] text-ink-soft mt-1">
                        Separate multiple options with commas.
                      </p>
                    </div>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={addField}
                className={buttonClass("secondary", "sm")}
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Another Field
              </button>
            </div>
          )}
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
