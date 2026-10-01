"use client";

import type { CustomField, CustomFieldType } from "@/src/services/models/event.model";

const FIELD_TYPES: { value: CustomFieldType; label: string }[] = [
  { value: "text", label: "Short text" },
  { value: "long_text", label: "Long text" },
  { value: "email", label: "Email" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "dropdown", label: "Dropdown" },
  { value: "radio", label: "Multiple choice" },
  { value: "checkboxes", label: "Checkboxes" },
  { value: "file", label: "File" },
  { value: "image", label: "Image" },
];

function usesOptions(type: string): boolean {
  return type === "dropdown" || type === "checkboxes" || type === "radio";
}

function optionsOf(field: CustomField): string[] {
  const opts = field.options ?? [];
  return opts.length ? opts : [""];
}

export function FormBuilder({
  fields,
  onChange,
  showAskOnce = false,
}: {
  fields: CustomField[];
  onChange: (next: CustomField[]) => void;
  showAskOnce?: boolean;
}) {
  const update = (id: string, patch: Partial<CustomField>) =>
    onChange(fields.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  const setOption = (field: CustomField, index: number, value: string) => {
    const next = [...optionsOf(field)];
    next[index] = value;
    update(field.id, { options: next });
  };

  const addOption = (field: CustomField) => {
    update(field.id, { options: [...optionsOf(field), `Option ${optionsOf(field).length + 1}`] });
  };

  const removeOption = (field: CustomField, index: number) => {
    const next = optionsOf(field).filter((_, i) => i !== index);
    update(field.id, { options: next.length ? next : [""] });
  };

  const move = (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= fields.length) return;
    const copy = [...fields];
    const [item] = copy.splice(index, 1);
    copy.splice(next, 0, item);
    onChange(copy);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-ink">Registration questions</h3>
          <p className="text-sm text-ink-soft">
            Google Forms-style questions. Multiple choice uses one radio per line; checkboxes let people pick several.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            onChange([
              ...fields,
              { id: `field-${Date.now()}`, label: "Untitled question", type: "text", required: false, options: [] },
            ])
          }
          className="rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-ink-invert"
        >
          Add question
        </button>
      </div>

      {fields.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line bg-muted px-4 py-6 text-sm text-ink-soft">
          No extra questions yet. Attendees will only enter name and email unless you add fields.
        </p>
      ) : null}

      {fields.map((field, index) => (
        <div key={field.id} className="space-y-3 rounded-2xl border border-line bg-paper p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_12rem]">
            <input
              value={field.label}
              onChange={(e) => update(field.id, { label: e.target.value })}
              aria-label="Question label"
              className="rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-line"
            />
            <select
              value={field.type}
              onChange={(e) => {
                const type = e.target.value as CustomFieldType;
                update(field.id, {
                  type,
                  options: usesOptions(type) ? optionsOf(field).filter(Boolean).length ? optionsOf(field) : ["Option 1"] : [],
                });
              }}
              aria-label="Question type"
              className="rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink outline-none"
            >
              {FIELD_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {usesOptions(field.type) ? (
            <div className="flex flex-col gap-2">
              {optionsOf(field).map((option, optionIndex) => (
                <div key={`${field.id}-opt-${optionIndex}`} className="flex w-full items-center gap-2">
                  <span
                    className={`h-4 w-4 shrink-0 border border-ink ${
                      field.type === "checkboxes" ? "rounded-sm" : "rounded-full"
                    }`}
                    aria-hidden="true"
                  />
                  <input
                    value={option}
                    onChange={(e) => setOption(field, optionIndex, e.target.value)}
                    placeholder={`Option ${optionIndex + 1}`}
                    className="min-w-0 flex-1 border-0 border-b border-line bg-transparent px-1 py-1 text-sm outline-none focus:border-ink"
                  />
                  <button
                    type="button"
                    onClick={() => removeOption(field, optionIndex)}
                    className="text-xs text-ink-soft hover:text-ink"
                    aria-label="Remove option"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => addOption(field)} className="self-start text-xs font-semibold text-ink underline">
                Add option
              </button>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-xs text-ink-soft">
              <input
                type="checkbox"
                checked={field.required}
                onChange={(e) => update(field.id, { required: e.target.checked })}
              />
              Required
            </label>
            {showAskOnce ? (
              <label className="flex items-center gap-2 text-xs text-ink-soft">
                Ask once
                <select
                  value={field.askOnce === "group" ? "group" : "member"}
                  onChange={(e) => update(field.id, { askOnce: e.target.value as "group" | "member" })}
                  className="rounded-lg border border-line px-2 py-1 text-xs"
                >
                  <option value="member">Per member</option>
                  <option value="group">Once for the group</option>
                </select>
              </label>
            ) : null}
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => move(index, -1)} disabled={index === 0} className="text-xs text-ink-soft disabled:opacity-40">
                Up
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                disabled={index === fields.length - 1}
                className="text-xs text-ink-soft disabled:opacity-40"
              >
                Down
              </button>
              <button type="button" onClick={() => onChange(fields.filter((f) => f.id !== field.id))} className="text-xs font-medium text-red-700">
                Delete
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
