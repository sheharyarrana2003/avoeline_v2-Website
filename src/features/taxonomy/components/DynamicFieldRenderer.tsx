"use client";

import React from "react";
import type { CategoryFieldDefinition } from "../categoryEngine.types";
import { fieldClass, labelClass } from "@/src/lib/ui";
import { HelpCircle, CheckSquare, List, Hash, AlignLeft } from "lucide-react";

interface DynamicFieldRendererProps {
  fields: CategoryFieldDefinition[];
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
  disabled?: boolean;
  className?: string;
}

export const DynamicFieldRenderer: React.FC<DynamicFieldRendererProps> = ({
  fields,
  values,
  onChange,
  disabled = false,
  className = "",
}) => {
  if (!fields || fields.length === 0) {
    return null;
  }

  const getIconForType = (type: string) => {
    switch (type) {
      case "number":
        return <Hash className="w-3.5 h-3.5 text-ink-soft" />;
      case "select":
        return <List className="w-3.5 h-3.5 text-ink-soft" />;
      case "checkbox":
        return <CheckSquare className="w-3.5 h-3.5 text-ink-soft" />;
      default:
        return <AlignLeft className="w-3.5 h-3.5 text-ink-soft" />;
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between border-b border-line pb-2 mb-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
          Category Custom Attributes ({fields.length})
        </h4>
        <span className="text-[11px] text-ink-soft">
          Fields defined for this Super Category
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fields.map((field) => {
          const currentVal = values?.[field.key];

          if (field.type === "checkbox") {
            const isChecked = Boolean(currentVal);
            return (
              <div
                key={field.key}
                className="col-span-1 md:col-span-2 flex items-start gap-3 p-3.5 rounded-xl border border-line bg-muted transition-all hover:bg-muted"
              >
                <input
                  type="checkbox"
                  id={`field-${field.key}`}
                  checked={isChecked}
                  disabled={disabled}
                  onChange={(e) => onChange(field.key, e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-line bg-paper text-ink"
                />
                <label
                  htmlFor={`field-${field.key}`}
                  className="cursor-pointer select-none text-sm text-ink"
                >
                  <span className="font-medium">{field.label}</span>
                  {field.required && <span className="text-rose-500 ml-1">*</span>}
                  <span className="block text-xs text-ink-soft mt-0.5">
                    Toggle to confirm or enable this option for your event
                  </span>
                </label>
              </div>
            );
          }

          if (field.type === "select") {
            const options = field.options || [];
            return (
              <div key={field.key} className="space-y-1.5">
                <label htmlFor={`field-${field.key}`} className={labelClass}>
                  <span className="flex items-center gap-1.5">
                    {getIconForType(field.type)}
                    <span>{field.label}</span>
                  </span>
                  {field.required && <span className="text-rose-500">*</span>}
                </label>
                <select
                  id={`field-${field.key}`}
                  value={currentVal !== undefined && currentVal !== null ? String(currentVal) : ""}
                  disabled={disabled}
                  required={field.required}
                  onChange={(e) => onChange(field.key, e.target.value)}
                  className={fieldClass}
                >
                  <option value="">-- Choose an option --</option>
                  {options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            );
          }

          if (field.type === "number") {
            return (
              <div key={field.key} className="space-y-1.5">
                <label htmlFor={`field-${field.key}`} className={labelClass}>
                  <span className="flex items-center gap-1.5">
                    {getIconForType(field.type)}
                    <span>{field.label}</span>
                  </span>
                  {field.required && <span className="text-rose-500">*</span>}
                </label>
                <input
                  type="number"
                  id={`field-${field.key}`}
                  value={currentVal !== undefined && currentVal !== null ? currentVal : ""}
                  disabled={disabled}
                  required={field.required}
                  placeholder={`Enter ${field.label.toLowerCase()}`}
                  onChange={(e) => {
                    const val = e.target.value;
                    onChange(field.key, val === "" ? "" : Number(val));
                  }}
                  className={fieldClass}
                />
              </div>
            );
          }

          // Default: "text"
          return (
            <div key={field.key} className="space-y-1.5">
              <label htmlFor={`field-${field.key}`} className={labelClass}>
                <span className="flex items-center gap-1.5">
                  {getIconForType(field.type)}
                  <span>{field.label}</span>
                </span>
                {field.required && <span className="text-rose-500">*</span>}
              </label>
              <input
                type="text"
                id={`field-${field.key}`}
                value={currentVal !== undefined && currentVal !== null ? String(currentVal) : ""}
                disabled={disabled}
                required={field.required}
                placeholder={`Enter ${field.label.toLowerCase()}`}
                onChange={(e) => onChange(field.key, e.target.value)}
                className={fieldClass}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
