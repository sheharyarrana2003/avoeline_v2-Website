"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { FormBuilder } from "@/src/features/events/components/wizard/FormBuilder";
import type { CustomField } from "@/src/services/models/event.model";
import { saveCustomFormAction } from "../actions/customForms.action";
import type { CustomFormKind, CustomFormPublic, CustomFormStatus } from "../types";
import { buttonClass, fieldClass } from "@/src/lib/ui";

export function FormEditorClient({
  ownerId,
  form,
  publicOrigin,
}: {
  ownerId: string;
  form: CustomFormPublic;
  publicOrigin: string;
}) {
  const [pending, start] = useTransition();
  const [title, setTitle] = useState(form.title);
  const [description, setDescription] = useState(form.description);
  const [kind, setKind] = useState<CustomFormKind>(form.kind);
  const [status, setStatus] = useState<CustomFormStatus>(form.status);
  const [fields, setFields] = useState<CustomField[]>(form.fields || []);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const shareUrl = `${publicOrigin}/f/${form.publicToken}`;

  const save = (patch?: { status?: CustomFormStatus }) => {
    start(async () => {
      const r = await saveCustomFormAction({
        ownerId,
        formId: form.id,
        title,
        description,
        kind,
        status: patch?.status ?? status,
        fields,
      });
      if (!r.ok) {
        setError(r.error.message);
        return;
      }
      if (patch?.status) setStatus(patch.status);
      setMessage("Saved.");
      setError(null);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 text-sm">
        <Link
          href={`/organizer/${ownerId}/forms`}
          className="underline text-ink-soft hover:text-ink"
        >
          All forms
        </Link>
        <Link
          href={`/organizer/${ownerId}/forms/${form.id}/responses`}
          className="underline text-ink-soft hover:text-ink"
        >
          Responses
        </Link>
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {message ? <p className="text-sm text-ink-soft">{message}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs text-ink sm:col-span-2">
          Title
          <input
            className={`${fieldClass} mt-1`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="block text-xs text-ink sm:col-span-2">
          Description
          <textarea
            className={`${fieldClass} mt-1 min-h-[4rem]`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label className="block text-xs text-ink">
          Kind
          <select
            className={`${fieldClass} mt-1`}
            value={kind}
            onChange={(e) => setKind(e.target.value as CustomFormKind)}
          >
            <option value="survey">Survey</option>
            <option value="feedback">Feedback</option>
            <option value="checklist">Checklist</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label className="block text-xs text-ink">
          Status
          <select
            className={`${fieldClass} mt-1`}
            value={status}
            onChange={(e) => setStatus(e.target.value as CustomFormStatus)}
          >
            <option value="draft">Draft</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
        </label>
      </div>

      <div className="rounded-xl border border-line bg-canvas/40 px-4 py-3 text-sm">
        <p className="font-medium text-ink">Public link</p>
        <p className="mt-1 break-all text-ink-soft">{shareUrl}</p>
        <p className="mt-1 text-xs text-ink-soft">Set status to Open before sharing.</p>
      </div>

      <div>
        <h2 className="mb-2 font-display text-lg text-ink">Questions</h2>
        <p className="mb-3 text-xs text-ink-soft">
          File and image fields are omitted from the public form for now.
        </p>
        <FormBuilder fields={fields} onChange={setFields} />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={buttonClass("primary", "sm")}
          disabled={pending}
          onClick={() => save()}
        >
          Save
        </button>
        <button
          type="button"
          className={buttonClass("secondary", "sm")}
          disabled={pending}
          onClick={() => save({ status: "open" })}
        >
          Save & open
        </button>
        <button
          type="button"
          className={buttonClass("ghost", "sm")}
          disabled={pending}
          onClick={() => save({ status: "closed" })}
        >
          Close form
        </button>
      </div>
    </div>
  );
}
