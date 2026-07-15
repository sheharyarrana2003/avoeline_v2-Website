"use client";

import { Plus, X, Trash2, GripVertical } from "lucide-react";
import { CustomField } from "@/src/services/models/event.model";

interface CustomFieldsBuilderProps {
  fields: CustomField[];
  onChange: (fields: CustomField[]) => void;
}

const FIELD_TYPES: { value: CustomField["type"]; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "dropdown", label: "Dropdown" },
  { value: "checkbox", label: "Checkbox" },
];

// Dropdown and checkbox fields let the organizer define selectable options.
const hasOptions = (type: CustomField["type"]) =>
  type === "dropdown" || type === "checkbox";

export default function CustomFieldsBuilder({ fields, onChange }: CustomFieldsBuilderProps) {
  const addField = () => {
    const newField: CustomField = {
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `field_${fields.length + 1}`,
      label: "",
      type: "text",
      required: false,
      options: [],
    };
    onChange([...fields, newField]);
  };

  const updateField = (id: string, patch: Partial<CustomField>) => {
    onChange(
      fields.map((f) => {
        if (f.id !== id) return f;
        const next = { ...f, ...patch };
        if (patch.type) {
          if (hasOptions(patch.type)) {
            // Seed one empty option when switching to a type that needs options.
            if (!next.options || next.options.length === 0) next.options = [""];
          } else {
            // Text fields carry no options — clear any stale ones.
            next.options = [];
          }
        }
        return next;
      })
    );
  };

  const removeField = (id: string) => onChange(fields.filter((f) => f.id !== id));

  const updateOption = (id: string, index: number, value: string) => {
    onChange(
      fields.map((f) =>
        f.id === id
          ? { ...f, options: (f.options ?? []).map((o, i) => (i === index ? value : o)) }
          : f
      )
    );
  };

  const addOption = (id: string) => {
    onChange(
      fields.map((f) => (f.id === id ? { ...f, options: [...(f.options ?? []), ""] } : f))
    );
  };

  const removeOption = (id: string, index: number) => {
    onChange(
      fields.map((f) =>
        f.id === id ? { ...f, options: (f.options ?? []).filter((_, i) => i !== index) } : f
      )
    );
  };

  return (
    <div className="space-y-3">
      {fields.length === 0 && (
        <p className="text-xs text-gray-400 italic py-2">
          No custom fields yet. Add questions your attendees should answer at registration.
        </p>
      )}

      {fields.map((field, index) => (
        <div key={field.id} className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 space-y-3">
          {/* Row 1: label + type + remove */}
          <div className="flex items-start gap-2">
            <GripVertical size={16} className="mt-2.5 text-gray-300 shrink-0" />
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                Question {index + 1}
              </label>
              <input
                type="text"
                value={field.label}
                onChange={(e) => updateField(field.id, { label: e.target.value })}
                placeholder="e.g. What is your dietary preference?"
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-gray-200"
              />
            </div>
            <div className="w-32 shrink-0">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                Type
              </label>
              <select
                value={field.type}
                onChange={(e) => updateField(field.id, { type: e.target.value as CustomField["type"] })}
                className="w-full bg-white border border-gray-200 rounded-lg px-2 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-gray-200"
              >
                {FIELD_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => removeField(field.id)}
              aria-label="Remove field"
              className="mt-5 p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition shrink-0"
            >
              <Trash2 size={16} />
            </button>
          </div>

          {/* Row 2: options editor for dropdown / checkbox */}
          {hasOptions(field.type) && (
            <div className="pl-6 space-y-2">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Options
              </label>
              {(field.options ?? []).map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => updateOption(field.id, i, e.target.value)}
                    placeholder={`Option ${i + 1}`}
                    className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => removeOption(field.id, i)}
                    aria-label="Remove option"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addOption(field.id)}
                className="text-xs font-medium text-gray-500 hover:text-gray-800 flex items-center gap-1"
              >
                <Plus size={12} /> Add option
              </button>
            </div>
          )}

          {/* Row 3: required toggle */}
          <label className="flex items-center gap-2 pl-6 cursor-pointer w-fit">
            <input
              type="checkbox"
              checked={field.required}
              onChange={(e) => updateField(field.id, { required: e.target.checked })}
              className="rounded border-gray-300"
            />
            <span className="text-xs font-medium text-gray-600">Required</span>
          </label>
        </div>
      ))}

      <button
        type="button"
        onClick={addField}
        className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm font-medium text-gray-500 hover:border-gray-300 transition flex items-center justify-center gap-1"
      >
        <Plus size={14} /> Add Custom Field
      </button>
    </div>
  );
}
