"use client";

import { useState, useTransition } from "react";
import type {
  EventFormField,
  FormFieldDraft,
  FormFieldType,
  FormFieldScope,
} from "../formFields.types";
import { FORM_FIELD_TYPES } from "../formFields.types";
import {
  archiveFormFieldAction,
  reorderFormFieldsAction,
  updateGroupRegistrationAction,
  upsertFormFieldAction,
} from "../actions/formFields.action";

const TYPE_LABELS: Record<FormFieldType, string> = {
  text: "Short text",
  textarea: "Long text",
  number: "Number",
  email: "Email",
  phone: "Phone",
  url: "URL",
  date: "Date",
  dropdown: "Dropdown",
  radio: "Multiple choice",
  checkbox: "Checkboxes",
  file: "File",
};

function usesOptions(type: FormFieldType): boolean {
  return type === "dropdown" || type === "radio" || type === "checkbox";
}

function slugKey(label: string): string {
  return (
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 48) || `field_${Date.now()}`
  );
}

type DraftRow = FormFieldDraft & { localId: string; id?: string; locked?: boolean };

function toDraftRows(fields: Array<EventFormField | FormFieldDraft>): DraftRow[] {
  return fields.map((f, i) => ({
    localId: "id" in f && f.id ? f.id : (f as FormFieldDraft).localId || `draft-${i}-${f.key}`,
    id: "id" in f ? f.id : undefined,
    key: f.key,
    label: f.label,
    type: f.type,
    required: f.required,
    options: f.options ?? [],
    helpText: "helpText" in f ? (f.helpText ?? undefined) : undefined,
    placeholder: "placeholder" in f ? (f.placeholder ?? undefined) : undefined,
    scope: f.scope ?? "per_member",
    isSystem: !!f.isSystem,
    locked: f.key === "payment_screenshot" || (!!f.isSystem && f.key === "email"),
  }));
}

export function EventFormFieldsEditor({
  mode,
  eventId,
  initialFields,
  groupRegistration = false,
  groupMinSize = 2,
  groupMaxSize = 8,
  isPaid = false,
  hideGroupToggle = false,
  onDraftChange,
}: {
  mode: "live" | "draft";
  eventId?: string;
  initialFields: Array<EventFormField | FormFieldDraft>;
  groupRegistration?: boolean;
  groupMinSize?: number;
  groupMaxSize?: number;
  isPaid?: boolean;
  hideGroupToggle?: boolean;
  /** Wizard: emit non-system custom fields (+ system overrides for label/required). */
  onDraftChange?: (
    fields: FormFieldDraft[],
    group: { enabled: boolean; min: number; max: number },
  ) => void;
}) {
  const [fields, setFields] = useState<DraftRow[]>(() => toDraftRows(initialFields));
  const [groupOn, setGroupOn] = useState(!!groupRegistration);
  const [minSize, setMinSize] = useState(groupMinSize);
  const [maxSize, setMaxSize] = useState(groupMaxSize);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const emit = (next: DraftRow[], gOn = groupOn, gMin = minSize, gMax = maxSize) => {
    setFields(next);
    onDraftChange?.(
      next.map(({ localId: _l, id: _i, locked: _k, ...rest }) => rest),
      { enabled: gOn, min: gMin, max: gMax },
    );
  };

  const patch = (localId: string, patch: Partial<DraftRow>) => {
    const next = fields.map((f) => {
      if (f.localId !== localId) return f;
      const merged = { ...f, ...patch };
      if (merged.key === "email") merged.required = true;
      if (merged.key === "payment_screenshot") {
        merged.type = "file";
        merged.required = true;
        merged.isSystem = true;
      }
      return merged;
    });
    emit(next);
  };

  const move = (index: number, dir: -1 | 1) => {
    const nextIdx = index + dir;
    if (nextIdx < 0 || nextIdx >= fields.length) return;
    const copy = [...fields];
    const [item] = copy.splice(index, 1);
    copy.splice(nextIdx, 0, item);
    emit(copy);
    if (mode === "live" && eventId) {
      startTransition(async () => {
        const ids = copy.map((f) => f.id).filter(Boolean) as string[];
        if (ids.length !== copy.length) return;
        const res = await reorderFormFieldsAction({ eventId, orderedIds: ids });
        if (!res.ok) setError(res.error.message);
      });
    }
  };

  const addQuestion = () => {
    const localId = `draft-${Date.now()}`;
    const row: DraftRow = {
      localId,
      key: `question_${Date.now().toString(36)}`,
      label: "Untitled question",
      type: "text",
      required: false,
      options: [],
      scope: "per_member",
      isSystem: false,
    };
    const next = [...fields, row];
    emit(next);
    if (mode === "live" && eventId) {
      startTransition(async () => {
        const res = await upsertFormFieldAction({
          eventId,
          key: row.key,
          label: row.label,
          type: row.type,
          required: false,
          options: [],
          scope: "per_member",
          orderIndex: next.length - 1,
        });
        if (!res.ok) {
          setError(res.error.message);
          return;
        }
        setFields((prev) =>
          prev.map((f) =>
            f.localId === localId ? { ...f, id: res.data.id, key: res.data.key } : f,
          ),
        );
      });
    }
  };

  const saveField = (row: DraftRow) => {
    if (mode !== "live" || !eventId) return;
    startTransition(async () => {
      setError(null);
      const res = await upsertFormFieldAction({
        eventId,
        id: row.id,
        key: row.key,
        label: row.label,
        type: row.type,
        required: row.required,
        options: row.options,
        helpText: row.helpText ?? null,
        placeholder: row.placeholder ?? null,
        scope: row.scope,
      });
      if (!res.ok) setError(res.error.message);
      else {
        setFields((prev) =>
          prev.map((f) =>
            f.localId === row.localId ? { ...f, id: res.data.id, key: res.data.key } : f,
          ),
        );
      }
    });
  };

  const removeField = (row: DraftRow) => {
    if (row.isSystem && row.key !== "payment_screenshot") return;
    if (mode === "draft") {
      emit(fields.filter((f) => f.localId !== row.localId));
      return;
    }
    if (!eventId || !row.id) return;
    startTransition(async () => {
      const res = await archiveFormFieldAction({ eventId, fieldId: row.id! });
      if (!res.ok) setError(res.error.message);
      else emit(fields.filter((f) => f.localId !== row.localId));
    });
  };

  const saveGroup = (enabled: boolean, min: number, max: number) => {
    setGroupOn(enabled);
    setMinSize(min);
    setMaxSize(max);
    emit(fields, enabled, min, max);
    if (mode === "live" && eventId) {
      startTransition(async () => {
        const res = await updateGroupRegistrationAction({
          eventId,
          allowGroupRegistration: enabled,
          groupMinSize: min,
          groupMaxSize: max,
        });
        if (!res.ok) setError(res.error.message);
      });
    }
  };

  return (
    <div className="space-y-4">
      {!hideGroupToggle ? (
        <div className="space-y-3 rounded-2xl border border-line bg-paper p-4">
          <p className="text-sm font-bold text-ink">Registration style</p>
          <div className="flex gap-2">
            {(["single", "group"] as const).map((kind) => (
              <button
                key={kind}
                type="button"
                disabled={pending}
                onClick={() => saveGroup(kind === "group", minSize, maxSize)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${
                  (kind === "group") === groupOn
                    ? "bg-ink text-ink-invert"
                    : "bg-muted text-ink-soft"
                }`}
              >
                {kind}
              </button>
            ))}
          </div>
          {groupOn ? (
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs text-ink-soft">
                Min group size
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={minSize}
                  onChange={(e) => saveGroup(true, Number(e.target.value) || 2, maxSize)}
                  className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs text-ink-soft">
                Max group size
                <input
                  type="number"
                  min={minSize}
                  max={50}
                  value={maxSize}
                  onChange={(e) => saveGroup(true, minSize, Number(e.target.value) || 8)}
                  className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm"
                />
              </label>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-ink-soft">
          Hackathon teams are sized per competition. Group registration here is unused.
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-ink">Registration questions</h3>
          <p className="text-sm text-ink-soft">
            System fields (name, email, phone) are always present. Email stays required.
            {isPaid ? " Payment screenshot is locked for paid events." : ""}
          </p>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={addQuestion}
          className="rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-ink-invert"
        >
          Add question
        </button>
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      {fields.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line bg-muted px-4 py-6 text-sm text-ink-soft">
          No questions yet.
        </p>
      ) : null}

      {fields.map((field, index) => {
        const paymentLocked = field.key === "payment_screenshot";
        const systemCore = field.isSystem && field.key !== "payment_screenshot";
        return (
          <div
            key={field.localId}
            className="space-y-3 rounded-2xl border border-line bg-paper p-4"
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_12rem]">
              <input
                value={field.label}
                onChange={(e) => {
                  const label = e.target.value;
                  const nextKey =
                    systemCore || paymentLocked || field.id ? field.key : slugKey(label);
                  patch(field.localId, { label, key: nextKey });
                }}
                onBlur={() =>
                  mode === "live" && saveField(fields.find((f) => f.localId === field.localId)!)
                }
                aria-label="Question label"
                className="rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-line"
              />
              <select
                value={field.type}
                disabled={systemCore || paymentLocked}
                onChange={(e) => {
                  patch(field.localId, { type: e.target.value as FormFieldType });
                  if (mode === "live") {
                    const updated = { ...field, type: e.target.value as FormFieldType };
                    saveField(updated);
                  }
                }}
                className="rounded-xl border border-line bg-paper px-3 py-2 text-sm"
              >
                {FORM_FIELD_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-ink-soft">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={field.required}
                  disabled={field.key === "email" || paymentLocked}
                  onChange={(e) => {
                    patch(field.localId, { required: e.target.checked });
                    if (mode === "live") saveField({ ...field, required: e.target.checked });
                  }}
                />
                Required
              </label>
              {groupOn ? (
                <label className="flex items-center gap-2">
                  Ask
                  <select
                    value={field.scope}
                    disabled={paymentLocked}
                    onChange={(e) => {
                      const scope = e.target.value as FormFieldScope;
                      patch(field.localId, { scope });
                      if (mode === "live") saveField({ ...field, scope });
                    }}
                    className="rounded-lg border border-line px-2 py-1"
                  >
                    <option value="per_member">Per member</option>
                    <option value="per_group">Once per group</option>
                  </select>
                </label>
              ) : null}
              {field.isSystem ? (
                <span className="rounded-full bg-muted px-2 py-0.5 text-2xs uppercase">System</span>
              ) : null}
              {paymentLocked ? (
                <span className="rounded-full bg-muted px-2 py-0.5 text-2xs uppercase">
                  Locked (paid)
                </span>
              ) : null}
              <div className="ml-auto flex gap-2">
                <button
                  type="button"
                  className="underline"
                  disabled={index === 0 || pending}
                  onClick={() => move(index, -1)}
                >
                  Up
                </button>
                <button
                  type="button"
                  className="underline"
                  disabled={index === fields.length - 1 || pending}
                  onClick={() => move(index, 1)}
                >
                  Down
                </button>
                {!systemCore && !paymentLocked ? (
                  <button
                    type="button"
                    className="text-red-700 underline"
                    disabled={pending}
                    onClick={() => removeField(field)}
                  >
                    Archive
                  </button>
                ) : null}
              </div>
            </div>

            {usesOptions(field.type) ? (
              <div className="space-y-2">
                {(field.options.length ? field.options : [""]).map((opt, oi) => (
                  <div key={oi} className="flex gap-2">
                    <input
                      value={opt}
                      onChange={(e) => {
                        const options = [...(field.options.length ? field.options : [""])];
                        options[oi] = e.target.value;
                        patch(field.localId, { options });
                      }}
                      onBlur={() =>
                        mode === "live" &&
                        saveField(fields.find((f) => f.localId === field.localId)!)
                      }
                      className="flex-1 rounded-lg border border-line px-3 py-1.5 text-sm"
                      placeholder={`Option ${oi + 1}`}
                    />
                    <button
                      type="button"
                      className="text-xs text-ink-soft"
                      onClick={() => {
                        const options = (field.options.length ? field.options : [""]).filter(
                          (_, i) => i !== oi,
                        );
                        patch(field.localId, { options: options.length ? options : [""] });
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="text-xs font-semibold underline"
                  onClick={() =>
                    patch(field.localId, {
                      options: [
                        ...(field.options.length ? field.options : [""]),
                        `Option ${(field.options.length || 1) + 1}`,
                      ],
                    })
                  }
                >
                  Add option
                </button>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
