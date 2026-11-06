"use client";

import { useState, useTransition } from "react";
import { CustomFieldsRenderer } from "@/src/features/events/components/CustomFieldsRenderer";
import type { CustomField } from "@/src/services/models/event.model";
import { submitPublicCustomFormAction } from "../actions/customForms.action";
import { buttonClass, fieldClass } from "@/src/lib/ui";

export function PublicFormClient({
  token,
  title,
  description,
  fields,
}: {
  token: string;
  title: string;
  description: string;
  fields: CustomField[];
}) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (done) {
    return (
      <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-6 text-sm text-emerald-950">
        Thanks — your response was recorded.
      </p>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const respondentName = String(fd.get("respondent_name") || "").trim();
        const respondentEmail = String(fd.get("respondent_email") || "").trim();
        const answers: Record<string, string | number | boolean> = {};
        for (const f of fields) {
          const raw = fd.get(`field_${f.id}`);
          if (raw == null || raw === "") continue;
          if (f.type === "number") {
            const n = Number(raw);
            answers[f.id] = Number.isFinite(n) ? n : String(raw);
          } else if (f.type === "checkboxes") {
            answers[f.id] = fd.getAll(`field_${f.id}`).map(String).join(", ");
          } else {
            answers[f.id] = String(raw);
          }
        }
        start(async () => {
          const r = await submitPublicCustomFormAction({
            token,
            respondentName,
            respondentEmail,
            answers,
          });
          if (!r.ok) {
            setError(r.error.message);
            return;
          }
          setDone(true);
        });
      }}
    >
      <div>
        <h1 className="font-display text-2xl text-ink">{title}</h1>
        {description ? <p className="mt-2 text-sm text-ink-soft">{description}</p> : null}
      </div>
      <label className="block text-xs text-ink">
        Your name
        <input name="respondent_name" className={`${fieldClass} mt-1`} />
      </label>
      <label className="block text-xs text-ink">
        Email (optional)
        <input name="respondent_email" type="email" className={`${fieldClass} mt-1`} />
      </label>
      <CustomFieldsRenderer fields={fields} />
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <button type="submit" className={buttonClass("primary")} disabled={pending}>
        {pending ? "Submitting…" : "Submit"}
      </button>
    </form>
  );
}
