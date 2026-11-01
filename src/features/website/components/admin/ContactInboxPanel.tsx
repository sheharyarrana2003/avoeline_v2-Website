"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { updateContactMessageAction } from "../../actions/content.action";

export type ContactRow = {
  id: string;
  name: string;
  email: string;
  topic: string;
  message: string;
  status: string;
  notes: string | null;
  assigned_to: string | null;
  spam_score: number | null;
  created_at: string;
};

function statusBadgeStatus(status: string): string {
  if (status === "done") return "approved";
  if (status === "in_progress") return "pending";
  return "draft";
}

export function ContactInboxPanel({
  messages,
  adminId,
}: {
  messages: ContactRow[];
  adminId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(messages[0]?.id ?? null);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return messages.filter((m) => {
      if (status !== "all" && m.status !== status) return false;
      if (!query) return true;
      return (
        m.name.toLowerCase().includes(query) ||
        m.email.toLowerCase().includes(query) ||
        m.message.toLowerCase().includes(query) ||
        m.topic.toLowerCase().includes(query)
      );
    });
  }, [messages, q, status]);

  const selected = filtered.find((m) => m.id === selectedId) ?? filtered[0] ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <input
          className={fieldClass}
          placeholder="Search…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className={fieldClass} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="new">New</option>
          <option value="in_progress">In progress</option>
          <option value="done">Done</option>
        </select>
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}

      {filtered.length === 0 ? (
        <EmptyState
          title="Inbox empty"
          description="No contact messages match these filters."
          size="sm"
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <ul className="space-y-2">
            {filtered.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  className={`w-full rounded-xl border px-3 py-2 text-left ${
                    selected?.id === m.id ? "border-ink bg-muted" : "border-line"
                  }`}
                  onClick={() => setSelectedId(m.id)}
                >
                  <p className="text-sm font-medium">{m.name}</p>
                  <p className="truncate text-xs text-ink-soft">{m.topic}</p>
                  <StatusBadge status={statusBadgeStatus(m.status)} label={m.status} size="sm" />
                </button>
              </li>
            ))}
          </ul>

          {selected ? (
            <div className="space-y-3 rounded-2xl border border-line p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-ink">{selected.name}</h3>
                  <p className="text-sm text-ink-soft">{selected.email}</p>
                  <p className="text-xs text-ink-soft">
                    {new Date(selected.created_at).toLocaleString()} · spam{" "}
                    {selected.spam_score ?? "—"}
                  </p>
                </div>
                <a
                  className={buttonClass("secondary", "md")}
                  href={`mailto:${encodeURIComponent(selected.email)}?subject=${encodeURIComponent(`Re: ${selected.topic}`)}`}
                >
                  Reply
                </a>
              </div>
              <p className="whitespace-pre-wrap text-sm text-ink">{selected.message}</p>
              <div>
                <label className={labelClass}>Status</label>
                <select
                  className={fieldClass}
                  value={selected.status}
                  disabled={pending}
                  onChange={(e) =>
                    startTransition(async () => {
                      const res = await updateContactMessageAction({
                        id: selected.id,
                        status: e.target.value as "new" | "in_progress" | "done",
                      });
                      if (!res.ok) setError(res.error.message);
                      else router.refresh();
                    })
                  }
                >
                  <option value="new">New</option>
                  <option value="in_progress">In progress</option>
                  <option value="done">Done</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Notes</label>
                <textarea
                  className={`${fieldClass} min-h-24`}
                  defaultValue={selected.notes ?? ""}
                  onBlur={(e) => {
                    const notes = e.target.value;
                    if (notes === (selected.notes ?? "")) return;
                    startTransition(async () => {
                      const res = await updateContactMessageAction({
                        id: selected.id,
                        notes,
                      });
                      if (!res.ok) setError(res.error.message);
                      else router.refresh();
                    });
                  }}
                />
              </div>
              <button
                type="button"
                className={buttonClass("ghost", "sm")}
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const res = await updateContactMessageAction({
                      id: selected.id,
                      assigned_to: adminId,
                      status: selected.status === "new" ? "in_progress" : undefined,
                    });
                    if (!res.ok) setError(res.error.message);
                    else router.refresh();
                  })
                }
              >
                Assign to me
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
