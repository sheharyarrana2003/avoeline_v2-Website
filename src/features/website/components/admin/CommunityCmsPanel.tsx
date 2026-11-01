"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { Modal } from "@/src/components/ui/Modal";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { sendCommunityUpdateAction, withdrawConsentByIdAction } from "../../actions/consent.action";

export type CommunityRow = {
  id: string;
  email: string;
  scope: string;
  source: string | null;
  granted_at: string;
  withdrawn_at: string | null;
};

export function CommunityCmsPanel({ rows }: { rows: CommunityRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [scope, setScope] = useState("all");
  const [source, setSource] = useState("all");
  const [showWithdrawn, setShowWithdrawn] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (!showWithdrawn && r.withdrawn_at) return false;
      if (showWithdrawn && !r.withdrawn_at) {
        /* show both when withdrawn filter on — keep all */
      }
      if (scope !== "all" && r.scope !== scope) return false;
      if (source !== "all" && (r.source || "") !== source) return false;
      const query = q.trim().toLowerCase();
      if (query && !r.email.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [rows, q, scope, source, showWithdrawn]);

  const activeOnly = filtered.filter((r) => !r.withdrawn_at);

  function exportCsv() {
    const lines = [
      "email,scope,source,granted_at",
      ...activeOnly.map(
        (r) =>
          `${JSON.stringify(r.email)},${r.scope},${JSON.stringify(r.source || "")},${r.granted_at}`,
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "marketing-consents-active.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-soft">
        Only people who opted in via signup or registration. Registration lists never feed this
        audience.
      </p>
      <div className="flex flex-wrap gap-3">
        <input
          className={fieldClass}
          placeholder="Search email…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className={fieldClass} value={scope} onChange={(e) => setScope(e.target.value)}>
          <option value="all">All scopes</option>
          <option value="community">community</option>
          <option value="product_updates">product_updates</option>
        </select>
        <select className={fieldClass} value={source} onChange={(e) => setSource(e.target.value)}>
          <option value="all">All sources</option>
          <option value="signup">signup</option>
          <option value="google_signup">google_signup</option>
          <option value="event_registration">event_registration</option>
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showWithdrawn}
            onChange={(e) => setShowWithdrawn(e.target.checked)}
          />
          Include withdrawn
        </label>
        <button type="button" className={buttonClass("secondary", "md")} onClick={exportCsv}>
          Export active CSV
        </button>
        <button
          type="button"
          className={buttonClass("primary", "md")}
          onClick={() => setSendOpen(true)}
        >
          Send update
        </button>
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}

      {filtered.length === 0 ? (
        <EmptyState
          title="No consents"
          description="Opt-ins from signup and registration will appear here."
          size="sm"
        />
      ) : (
        <ul className="space-y-2">
          {filtered.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium">{r.email}</p>
                <p className="text-xs text-ink-soft">
                  {r.scope} · {r.source || "—"} · {new Date(r.granted_at).toLocaleString()}
                </p>
              </div>
              <StatusBadge
                status={r.withdrawn_at ? "rejected" : "approved"}
                label={r.withdrawn_at ? "Withdrawn" : "Active"}
                size="sm"
              />
              {!r.withdrawn_at ? (
                <button
                  type="button"
                  className={buttonClass("ghost", "sm")}
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const res = await withdrawConsentByIdAction({ id: r.id });
                      if (!res.ok) setError(res.error.message);
                      else router.refresh();
                    })
                  }
                >
                  Withdraw
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={sendOpen}
        onClose={() => setSendOpen(false)}
        title="Send community update"
        description="Sends via the platform email sender with an unsubscribe link. Capped per run."
        maxWidth="lg"
        footer={
          <button
            type="button"
            className={buttonClass("primary", "md")}
            disabled={pending || !subject.trim() || !body.trim()}
            onClick={() =>
              startTransition(async () => {
                const res = await sendCommunityUpdateAction({
                  subject,
                  body,
                  scope: scope === "all" ? "all" : (scope as "community" | "product_updates"),
                });
                if (!res.ok) setError(res.error.message);
                else {
                  setSendOpen(false);
                  setSubject("");
                  setBody("");
                  setError(null);
                }
              })
            }
          >
            Send
          </button>
        }
      >
        <div className="space-y-3">
          <div>
            <label className={labelClass}>Subject</label>
            <input
              className={fieldClass}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Body</label>
            <textarea
              className={`${fieldClass} min-h-40`}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
