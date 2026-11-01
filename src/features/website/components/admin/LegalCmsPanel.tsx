"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import { ConfirmDialog } from "@/src/shared_components/ui/ConfirmDialog";
import { Modal } from "@/src/components/ui/Modal";
import { publishLegalVersionAction } from "../../actions/legal.action";
import { diffLines } from "../../cms.logic";
import { sanitizeLegalMarkdown } from "../../legalMarkdown";

export type LegalDocAdmin = {
  id: string;
  slug: string;
  title: string;
  currentBody: string;
  versions: Array<{
    id: string;
    version: number;
    body_md: string;
    change_summary: string | null;
    effective_date: string | null;
    published_at: string;
  }>;
};

export function LegalCmsPanel({ documents }: { documents: LegalDocAdmin[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [docId, setDocId] = useState(documents[0]?.id ?? "");
  const doc = documents.find((d) => d.id === docId) ?? documents[0];
  const [body, setBody] = useState(doc?.currentBody ?? "");
  const [summary, setSummary] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notify, setNotify] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [diffVersionId, setDiffVersionId] = useState<string | null>(null);

  const preview = useMemo(() => sanitizeLegalMarkdown(body), [body]);
  const diffOps = useMemo(() => {
    if (!doc || !diffVersionId) return [];
    const selected = doc.versions.find((v) => v.id === diffVersionId);
    if (!selected) return [];
    const prev = doc.versions.find((v) => v.version === selected.version - 1);
    return diffLines(prev?.body_md ?? "", selected.body_md);
  }, [doc, diffVersionId]);

  function switchDoc(id: string) {
    const next = documents.find((d) => d.id === id);
    setDocId(id);
    setBody(next?.currentBody ?? "");
    setSummary("");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div>
          <label className={labelClass} htmlFor="legal-doc">
            Document
          </label>
          <select
            id="legal-doc"
            className={fieldClass}
            value={doc?.id}
            onChange={(e) => switchDoc(e.target.value)}
          >
            {documents.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className={buttonClass("secondary", "md")}
          onClick={() => setHistoryOpen(true)}
        >
          Version history
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <label className={labelClass} htmlFor="legal-body">
            Markdown
          </label>
          <textarea
            id="legal-body"
            className={`${fieldClass} min-h-[28rem] font-mono text-sm`}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <div>
            <label className={labelClass}>Change summary</label>
            <input
              className={fieldClass}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="What changed?"
            />
          </div>
          <div>
            <label className={labelClass}>Effective date</label>
            <input
              className={fieldClass}
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
            Notify organizers and vendors (email + in-app, capped)
          </label>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <button
            type="button"
            className={buttonClass("primary", "md")}
            disabled={pending || !summary.trim()}
            onClick={() => setPublishOpen(true)}
          >
            Publish new version
          </button>
        </div>
        <div className="rounded-2xl border border-line p-4">
          <p className={labelClass}>Preview</p>
          <article className="prose prose-sm max-w-none text-ink">
            <ReactMarkdown skipHtml>{preview}</ReactMarkdown>
          </article>
        </div>
      </div>

      <ConfirmDialog
        open={publishOpen}
        title="Publish legal version?"
        description="Creates an immutable version. Previous versions stay in history."
        confirmLabel="Publish"
        busy={pending}
        onCancel={() => setPublishOpen(false)}
        onConfirm={() =>
          startTransition(async () => {
            if (!doc) return;
            const res = await publishLegalVersionAction({
              documentId: doc.id,
              bodyMd: body,
              changeSummary: summary,
              effectiveDate,
              notifyTenants: notify,
            });
            setPublishOpen(false);
            if (!res.ok) setError(res.error.message);
            else {
              setError(null);
              setSummary("");
              router.refresh();
            }
          })
        }
      />

      <Modal
        open={historyOpen}
        onClose={() => {
          setHistoryOpen(false);
          setDiffVersionId(null);
        }}
        title="Legal versions"
        maxWidth="2xl"
      >
        <ul className="mb-4 space-y-2">
          {(doc?.versions ?? []).map((v) => (
            <li
              key={v.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line px-3 py-2"
            >
              <div className="text-sm">
                <p className="font-medium">v{v.version}</p>
                <p className="text-ink-soft">
                  {v.effective_date || "—"} · {v.change_summary || "No summary"}
                </p>
              </div>
              <button
                type="button"
                className={buttonClass("ghost", "sm")}
                onClick={() => setDiffVersionId(v.id)}
              >
                Diff
              </button>
            </li>
          ))}
        </ul>
        {diffVersionId ? (
          <pre className="max-h-80 overflow-auto rounded-xl bg-muted p-3 font-mono text-xs">
            {diffOps.map((op, i) => (
              <div
                key={`${op.type}-${i}`}
                className={
                  op.type === "add"
                    ? "text-success"
                    : op.type === "remove"
                      ? "text-danger"
                      : "text-ink-soft"
                }
              >
                {op.type === "add" ? "+" : op.type === "remove" ? "-" : " "}
                {op.line}
              </div>
            ))}
          </pre>
        ) : null}
      </Modal>
    </div>
  );
}
