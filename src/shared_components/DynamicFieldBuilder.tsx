"use client";

import { Plus, Trash2 } from "lucide-react";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";

export type DynamicFieldType = "text" | "number" | "select" | "checkbox" | "long_text";

export type DynamicFieldDefinition = {
  key: string;
  label: string;
  type: DynamicFieldType;
  options?: string[];
  required?: boolean;
};

const TYPES: { value: DynamicFieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "long_text", label: "Long text" },
  { value: "number", label: "Number" },
  { value: "select", label: "Dropdown" },
  { value: "checkbox", label: "Checkbox" },
];

export function DynamicFieldBuilder({
  fields,
  onChange,
  emptyTitle = "No fields yet.",
}: {
  fields: DynamicFieldDefinition[];
  onChange: (fields: DynamicFieldDefinition[]) => void;
  emptyTitle?: string;
}) {
  const addField = () => {
    onChange([
      ...fields,
      {
        key: `field_${Date.now().toString(36)}`,
        label: "",
        type: "text",
        required: false,
        options: [],
      },
    ]);
  };

  const updateField = (index: number, patch: Partial<DynamicFieldDefinition>) => {
    const next = [...fields];
    next[index] = { ...next[index], ...patch };
    if (patch.label && (!next[index].key || next[index].key.startsWith("field_"))) {
      next[index].key = patch.label
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
    }
    onChange(next);
  };

  if (fields.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line py-8 text-center">
        <p className="mb-3 text-sm text-ink-soft">{emptyTitle}</p>
        <button type="button" onClick={addField} className={buttonClass("secondary", "sm")}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add first field
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {fields.map((field, idx) => (
        <div
          key={`${field.key}-${idx}`}
          className="relative space-y-3 rounded-xl border border-line bg-muted p-4"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
              Field #{idx + 1}
            </span>
            <button
              type="button"
              onClick={() => onChange(fields.filter((_, i) => i !== idx))}
              className="rounded p-1 text-ink-soft transition hover:text-rose-600"
              title="Remove field"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor={`dyn-label-${idx}`}>
                Field label
              </label>
              <input
                id={`dyn-label-${idx}`}
                type="text"
                value={field.label}
                onChange={(e) => updateField(idx, { label: e.target.value })}
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor={`dyn-key-${idx}`}>
                Field key
              </label>
              <input
                id={`dyn-key-${idx}`}
                type="text"
                value={field.key}
                onChange={(e) => updateField(idx, { key: e.target.value })}
                className={fieldClass}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor={`dyn-type-${idx}`}>
                Field type
              </label>
              <select
                id={`dyn-type-${idx}`}
                value={field.type}
                onChange={(e) => updateField(idx, { type: e.target.value as DynamicFieldType })}
                className={fieldClass}
              >
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex cursor-pointer items-center gap-2 pt-5 text-sm text-ink">
              <input
                type="checkbox"
                checked={field.required || false}
                onChange={(e) => updateField(idx, { required: e.target.checked })}
                className="rounded border-line bg-paper text-ink"
              />
              <span>Required</span>
            </label>
          </div>
          {field.type === "select" ? (
            <div>
              <label className={labelClass} htmlFor={`dyn-opts-${idx}`}>
                Dropdown options (comma separated)
              </label>
              <input
                id={`dyn-opts-${idx}`}
                type="text"
                value={(field.options || []).join(", ")}
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
            </div>
          ) : null}
        </div>
      ))}
      <button type="button" onClick={addField} className={buttonClass("secondary", "sm")}>
        <Plus className="mr-1 h-3.5 w-3.5" />
        Add another field
      </button>
    </div>
  );
}
