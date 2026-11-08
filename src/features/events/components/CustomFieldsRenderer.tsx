"use client";

import { useState, useTransition } from "react";
import type { CustomField } from "@/src/services/models/event.model";
import type {
  EventFormField,
  FormFieldDraft,
} from "@/src/features/registration/forms/formFields.types";
import { fieldClass, labelClass } from "@/src/lib/ui";

export type RenderableField = {
  id: string;
  key?: string;
  label: string;
  type: string;
  required?: boolean;
  options?: string[];
  helpText?: string | null;
  placeholder?: string | null;
};

function normalizeField(
  field: CustomField | EventFormField | FormFieldDraft | RenderableField,
): RenderableField {
  const raw = field as Record<string, unknown>;
  if (typeof raw.fieldId === "string") {
    return {
      id: raw.fieldId,
      key: raw.fieldId,
      label: String(raw.label ?? ""),
      type: String(raw.type ?? "text"),
      required: !!raw.required,
      options: Array.isArray(raw.options) ? (raw.options as string[]) : [],
    };
  }
  if (typeof raw.key === "string" && raw.key) {
    const id = typeof raw.id === "string" ? raw.id : raw.key;
    return {
      id,
      key: raw.key,
      label: String(raw.label ?? ""),
      type: String(raw.type ?? "text"),
      required: !!raw.required,
      options: Array.isArray(raw.options) ? (raw.options as string[]) : [],
      helpText: typeof raw.helpText === "string" ? raw.helpText : null,
      placeholder: typeof raw.placeholder === "string" ? raw.placeholder : null,
    };
  }
  const f = field as CustomField;
  return {
    id: f.id,
    key: f.id,
    label: f.label,
    type: f.type,
    required: f.required,
    options: f.options,
  };
}

function RegistrationFileInput({
  eventId,
  name,
  id,
  required,
  accept,
  label,
}: {
  eventId: string;
  name: string;
  id: string;
  required?: boolean;
  accept?: string;
  label: string;
}) {
  const [path, setPath] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={labelClass}>
        {label}
        {required ? " *" : ""}
      </label>
      <input
        id={id}
        type="file"
        accept={accept || "image/*,application/pdf"}
        required={required && !path}
        disabled={pending}
        className="w-full rounded-lg border border-line-loud bg-paper px-3 py-2 text-sm"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) {
            setPath("");
            return;
          }
          setError(null);
          startTransition(async () => {
            try {
              const form = new FormData();
              form.set("eventId", eventId);
              form.set("file", file, file.name);
              const res = await fetch("/api/uploads/proof", {
                method: "POST",
                body: form,
              });
              const json = (await res.json()) as {
                ok?: boolean;
                fileId?: string;
                error?: string;
              };
              if (!res.ok || !json.ok || !json.fileId) {
                setError(json.error || "Upload failed.");
                setPath("");
                return;
              }
              setPath(`file:${json.fileId}`);
            } catch {
              setError("Upload failed.");
              setPath("");
            }
          });
        }}
      />
      {path ? (
        <input type="hidden" name={name} value={JSON.stringify({ path, bucket: "filestore" })} />
      ) : null}
      {pending ? <p className="text-xs text-ink-soft">Uploading…</p> : null}
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
    </div>
  );
}

/**
 * Shared public renderer for FormBuilder CustomField[] and EventFormField[].
 * Extends phone / url / file. Pass `eventId` to enable signed registration uploads.
 */
export function CustomFieldsRenderer({
  fields,
  namePrefix = "field_",
  eventId,
  useKeyAsName = false,
}: {
  fields: Array<CustomField | EventFormField | FormFieldDraft | RenderableField>;
  namePrefix?: string;
  eventId?: string;
  /** When true, input name is exactly field.key (registration form). */
  useKeyAsName?: boolean;
}) {
  return (
    <div className="space-y-4">
      {fields.map((raw) => {
        const field = normalizeField(raw);
        const key = field.key || field.id;
        const name = useKeyAsName ? key : `${namePrefix}${key}`;
        const id = `${namePrefix}${key}`;
        const type = String(field.type || "text");

        if (type === "file" || type === "image") {
          if (eventId) {
            return (
              <RegistrationFileInput
                key={id}
                eventId={eventId}
                name={name}
                id={id}
                required={field.required}
                accept={type === "image" ? "image/*" : "image/*,application/pdf"}
                label={field.label}
              />
            );
          }
          return (
            <div key={id}>
              <label className={labelClass} htmlFor={id}>
                {field.label}
                {field.required ? " *" : ""}
              </label>
              <input
                id={id}
                name={name}
                type="file"
                required={field.required}
                className={fieldClass}
              />
            </div>
          );
        }

        if (type === "long_text" || type === "textarea") {
          return (
            <div key={id}>
              <label className={labelClass} htmlFor={id}>
                {field.label}
                {field.required ? " *" : ""}
              </label>
              <textarea
                id={id}
                name={name}
                required={field.required}
                rows={4}
                placeholder={field.placeholder || undefined}
                className={fieldClass}
              />
              {field.helpText ? (
                <p className="mt-1 text-xs text-ink-soft">{field.helpText}</p>
              ) : null}
            </div>
          );
        }
        if (type === "dropdown" || type === "select") {
          return (
            <div key={id}>
              <label className={labelClass} htmlFor={id}>
                {field.label}
                {field.required ? " *" : ""}
              </label>
              <select
                id={id}
                name={name}
                required={field.required}
                className={fieldClass}
                defaultValue=""
              >
                <option value="" disabled>
                  Choose…
                </option>
                {(field.options ?? []).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          );
        }
        if (type === "radio") {
          return (
            <fieldset key={id} className="space-y-2">
              <legend className={labelClass}>
                {field.label}
                {field.required ? " *" : ""}
              </legend>
              {(field.options ?? []).map((opt) => (
                <label key={opt} className="flex items-center gap-2 text-sm">
                  <input type="radio" name={name} value={opt} required={field.required} />
                  {opt}
                </label>
              ))}
            </fieldset>
          );
        }
        if (type === "checkboxes" || type === "checkbox") {
          return (
            <fieldset key={id} className="space-y-2">
              <legend className={labelClass}>
                {field.label}
                {field.required ? " *" : ""}
              </legend>
              {(field.options ?? []).length ? (
                (field.options ?? []).map((opt) => (
                  <label key={opt} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name={`${name}[]`} value={opt} />
                    {opt}
                  </label>
                ))
              ) : (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name={name} value="yes" />
                  {field.label}
                </label>
              )}
            </fieldset>
          );
        }
        const inputType =
          type === "number"
            ? "number"
            : type === "email"
              ? "email"
              : type === "date"
                ? "date"
                : type === "phone"
                  ? "tel"
                  : type === "url"
                    ? "url"
                    : "text";
        return (
          <div key={id}>
            <label className={labelClass} htmlFor={id}>
              {field.label}
              {field.required ? " *" : ""}
            </label>
            <input
              id={id}
              name={name}
              type={inputType}
              required={field.required}
              placeholder={field.placeholder || undefined}
              className={fieldClass}
              autoComplete={
                key === "name"
                  ? "name"
                  : key === "email"
                    ? "email"
                    : key === "phone"
                      ? "tel"
                      : undefined
              }
            />
            {field.helpText ? <p className="mt-1 text-xs text-ink-soft">{field.helpText}</p> : null}
          </div>
        );
      })}
    </div>
  );
}
