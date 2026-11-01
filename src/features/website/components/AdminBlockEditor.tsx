"use client";

import { useMemo, useState, useTransition } from "react";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import { BLOCK_REGISTRY } from "../blocks/registry";
import {
  BLOCK_SCHEMAS,
  BLOCK_TYPES,
  isBlockType,
  parseBlockDraft,
  type BlockType,
} from "../blocks/schemas";
import { BlockRenderer } from "./BlockRenderer";

export type AdminBlockDraft = {
  type: BlockType;
  data: Record<string, unknown>;
  visible: boolean;
};

export type AdminBlockEditorProps = {
  initialDraft: AdminBlockDraft;
  onChange: (draft: AdminBlockDraft) => void;
  onSave: () => void | Promise<void>;
};

const DEFAULT_DRAFT: AdminBlockDraft = {
  type: "hero",
  data: {},
  visible: true,
};

function schemaKeys(type: BlockType): string[] {
  const shape = (BLOCK_SCHEMAS[type] as { shape?: Record<string, unknown> }).shape;
  return shape ? Object.keys(shape) : [];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isJsonField(key: string, value: unknown): boolean {
  if (Array.isArray(value) || isPlainObject(value)) return true;
  return (
    key === "items" ||
    key === "tabs" ||
    key === "members" ||
    key === "primaryCta" ||
    key === "secondaryCta" ||
    key.endsWith("Cta")
  );
}

/**
 * Lean W1 shell: type picker, simple fields / JSON for nested keys,
 * visible toggle, live preview. Full page CRUD ships in W3.
 *
 * Props optional so `/admin/website` can mount a preview shell before W3 wiring.
 */
export function AdminBlockEditor({
  initialDraft = DEFAULT_DRAFT,
  onChange,
  onSave,
}: Partial<AdminBlockEditorProps> = {}) {
  const [draft, setDraft] = useState<AdminBlockDraft>(initialDraft);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const keys = useMemo(() => schemaKeys(draft.type), [draft.type]);

  function emit(next: AdminBlockDraft) {
    setDraft(next);
    onChange?.(next);
  }

  function setType(type: string) {
    if (!isBlockType(type)) return;
    const empty = parseBlockDraft(type, {});
    const data = empty.ok ? (empty.data as Record<string, unknown>) : {};
    emit({ type, data, visible: draft.visible });
    setJsonError(null);
  }

  function setVisible(visible: boolean) {
    emit({ ...draft, visible });
  }

  function setStringField(key: string, value: string) {
    emit({ ...draft, data: { ...draft.data, [key]: value } });
  }

  function setJsonField(key: string, raw: string) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      emit({ ...draft, data: { ...draft.data, [key]: parsed } });
      setJsonError(null);
    } catch {
      setJsonError(`Invalid JSON for "${key}"`);
    }
  }

  function handleSave() {
    startTransition(async () => {
      await onSave?.();
    });
  }

  const previewParsed = parseBlockDraft(draft.type, draft.data);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4 rounded-2xl border border-line p-4">
        <div>
          <label className={labelClass} htmlFor="block-type">
            Block type
          </label>
          <select
            id="block-type"
            className={fieldClass}
            value={draft.type}
            onChange={(e) => setType(e.target.value)}
          >
            {BLOCK_TYPES.map((t) => (
              <option key={t} value={t}>
                {BLOCK_REGISTRY[t].label}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={draft.visible}
            onChange={(e) => setVisible(e.target.checked)}
          />
          Visible
        </label>

        {keys.map((key) => {
          const value = draft.data[key];

          if (isJsonField(key, value)) {
            const fallback =
              key === "primaryCta" || key === "secondaryCta" || key.endsWith("Cta") ? {} : [];
            return (
              <div key={key}>
                <label className={labelClass} htmlFor={`block-field-${key}`}>
                  {key} (JSON)
                </label>
                <textarea
                  id={`block-field-${key}`}
                  className={`${fieldClass} min-h-28 font-mono text-xs`}
                  defaultValue={JSON.stringify(value ?? fallback, null, 2)}
                  onBlur={(e) => setJsonField(key, e.target.value)}
                />
              </div>
            );
          }

          if (typeof value === "boolean") {
            return (
              <label key={key} className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) =>
                    emit({ ...draft, data: { ...draft.data, [key]: e.target.checked } })
                  }
                />
                {key}
              </label>
            );
          }

          return (
            <div key={key}>
              <label className={labelClass} htmlFor={`block-field-${key}`}>
                {key}
              </label>
              <input
                id={`block-field-${key}`}
                className={fieldClass}
                value={typeof value === "string" || typeof value === "number" ? String(value) : ""}
                onChange={(e) => setStringField(key, e.target.value)}
              />
            </div>
          );
        })}

        {jsonError ? <p className="text-sm text-red-600">{jsonError}</p> : null}
        {!previewParsed.ok ? (
          <p className="text-sm text-red-600">Schema: {previewParsed.error.issues[0]?.message}</p>
        ) : null}

        <button
          type="button"
          className={buttonClass("primary", "md")}
          disabled={pending || !previewParsed.ok}
          onClick={handleSave}
        >
          {pending ? "Saving…" : "Save draft"}
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-canvas">
        <p className={`${labelClass} border-b border-line px-4 py-2`}>Preview</p>
        <div className="max-h-[70vh] overflow-auto">
          {!draft.visible ? (
            <p className="p-6 text-sm text-ink-soft">Hidden — nothing to show.</p>
          ) : (
            <BlockRenderer type={draft.type} data={draft.data} visible />
          )}
        </div>
      </div>
    </div>
  );
}
