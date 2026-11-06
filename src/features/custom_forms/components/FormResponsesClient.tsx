"use client";

import Link from "next/link";
import type { CustomFormPublic, CustomFormResponsePublic } from "../types";
import { buttonClass } from "@/src/lib/ui";

export function FormResponsesClient({
  ownerId,
  form,
  responses,
}: {
  ownerId: string;
  form: CustomFormPublic;
  responses: CustomFormResponsePublic[];
}) {
  const downloadCsv = () => {
    const fieldIds = (form.fields || []).map((f) => f.id);
    const headers = ["submitted_at", "name", "email", ...fieldIds];
    const lines = [
      headers.join(","),
      ...responses.map((r) => {
        const cells = [
          r.submittedAt,
          r.respondentName || "",
          r.respondentEmail || "",
          ...fieldIds.map((id) => String(r.answers[id] ?? "")),
        ];
        return cells.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",");
      }),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${form.title.replace(/[^\w\-]+/g, "_").slice(0, 40)}_responses.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/organizer/${ownerId}/forms/${form.id}`}
          className="text-sm underline text-ink-soft hover:text-ink"
        >
          Back to editor
        </Link>
        <button type="button" className={buttonClass("secondary", "sm")} onClick={downloadCsv}>
          Download CSV
        </button>
      </div>
      {!responses.length ? (
        <p className="text-sm text-ink-soft">No responses yet.</p>
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line bg-paper">
          {responses.map((r) => (
            <li key={r.id} className="px-4 py-3 text-sm">
              <p className="font-medium text-ink">
                {r.respondentName || r.respondentEmail || "Anonymous"}
                <span className="ml-2 font-normal text-ink-soft">
                  {new Date(r.submittedAt).toLocaleString()}
                </span>
              </p>
              <dl className="mt-2 grid gap-1 text-xs text-ink-soft sm:grid-cols-2">
                {(form.fields || []).map((f) => (
                  <div key={f.id}>
                    <dt className="font-medium text-ink">{f.label}</dt>
                    <dd>{String(r.answers[f.id] ?? "—")}</dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
