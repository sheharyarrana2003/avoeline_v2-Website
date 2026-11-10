import { z } from "zod";
import type { EventFormField, FormFieldDraft, FormFieldType } from "./formFields.types";

export type SchemaField = Pick<
  EventFormField,
  "key" | "label" | "type" | "required" | "options" | "validation" | "scope"
>;

type BuildOpts = {
  /** Honeypot: must be empty / absent when present. */
  honeypotWebsite?: boolean;
};

function asDraft(field: SchemaField | FormFieldDraft): SchemaField {
  return {
    key: field.key,
    label: field.label,
    type: field.type,
    required: field.required,
    options: field.options ?? [],
    validation: "validation" in field && field.validation ? field.validation : {},
    scope: field.scope ?? "per_member",
  };
}

const FILE_UPLOAD_MSG = "We couldn't upload this file. Use an image or PDF under 5 MB.";

function isFileAnswer(v: unknown): v is { path: string; bucket?: string } {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const path = (v as { path?: unknown }).path;
  return typeof path === "string" && path.trim().length > 0;
}

function fileAnswerSchema(required: boolean, label: string) {
  const missing = required ? `Please upload ${label}. ${FILE_UPLOAD_MSG}` : FILE_UPLOAD_MSG;
  const requiredSchema = z.custom<{ path: string; bucket?: string }>(isFileAnswer, {
    message: missing,
  });
  if (!required) {
    return z.union([requiredSchema, z.null(), z.undefined()]);
  }
  return requiredSchema;
}

function fieldZod(field: SchemaField): z.ZodTypeAny {
  const label = field.label || field.key;
  switch (field.type as FormFieldType) {
    case "email": {
      const base = z.string().trim().email(`${label} must be a valid email`);
      return field.required
        ? base.min(1, `${label} is required`)
        : base.optional().or(z.literal(""));
    }
    case "phone": {
      const base = z
        .string()
        .trim()
        .refine(
          (v) => !v || /^[+\d][\d\s().-]{6,24}$/.test(v),
          `${label} does not look like a phone number`,
        );
      return field.required
        ? base.min(1, `${label} is required`)
        : base.optional().or(z.literal(""));
    }
    case "url": {
      const base = z
        .string()
        .trim()
        .refine((v) => !v || /^https?:\/\//i.test(v), `${label} must be an http(s) URL`);
      return field.required
        ? base.min(1, `${label} is required`)
        : base.optional().or(z.literal(""));
    }
    case "number": {
      const base = z.preprocess(
        (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
        z.number({ error: `${label} must be a number` }),
      );
      return field.required ? base : base.optional().nullable();
    }
    case "checkbox": {
      // Single yes/no or multi-option stored as string[] / boolean / string.
      if ((field.options ?? []).length) {
        const arr = z.array(z.string());
        return field.required ? arr.min(1, `Choose at least one for ${label}`) : arr.optional();
      }
      return field.required ? z.boolean() : z.boolean().optional();
    }
    case "dropdown":
    case "radio": {
      const opts = (field.options ?? []).filter(Boolean);
      const base =
        opts.length > 0
          ? z.string().refine((v) => !v || opts.includes(v), `Pick a valid option for ${label}`)
          : z.string();
      return field.required
        ? base.min(1, `${label} is required`)
        : base.optional().or(z.literal(""));
    }
    case "file":
      return fileAnswerSchema(field.required, label);
    case "textarea":
    case "text":
    case "date":
    default: {
      const max =
        Number((field.validation as { maxLength?: number } | undefined)?.maxLength) || 2000;
      const base = z.string().trim().max(max);
      return field.required
        ? base.min(1, `${label} is required`)
        : base.optional().or(z.literal(""));
    }
  }
}

/**
 * Zod object from active field definitions.
 * Keys are field.key. Optional honeypot `website` must be empty.
 */
export function buildRegistrationSchema(
  fields: Array<SchemaField | FormFieldDraft>,
  opts: BuildOpts = {},
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const raw of fields) {
    const field = asDraft(raw);
    if (!field.key) continue;
    shape[field.key] = fieldZod(field);
  }
  if (opts.honeypotWebsite !== false) {
    shape.website = z
      .string()
      .optional()
      .refine((v) => !v, "Spam detected");
  }
  return z.object(shape);
}

/** Member answers under `member_${i}_*` — schema for one extra member (per_member fields only). */
export function buildMemberRegistrationSchema(
  fields: Array<SchemaField | FormFieldDraft>,
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const perMember = fields.filter((f) => (f.scope ?? "per_member") === "per_member");
  return buildRegistrationSchema(perMember, { honeypotWebsite: false });
}
