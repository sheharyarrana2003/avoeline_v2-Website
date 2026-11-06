"use client";

import { useState, useTransition } from "react";
import {
  cancelBatchAction,
  listBatchesAction,
  rescheduleBatchAction,
} from "../actions/send.action";

type BatchRow = {
  id: string;
  kind: string;
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  cancelled: number;
  status: string;
  not_before: string | null;
  subject: string | null;
  created_at: string;
};

export function EmailBatchesClient({
  ownerId,
  initialRows,
  initialCursor,
}: {
  ownerId: string;
  initialRows: BatchRow[];
  initialCursor: { createdAt: string; id: string } | null;
}) {
  const [rows, setRows] = useState(initialRows);
  const [cursor, setCursor] = useState(initialCursor);
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {message ? <p className="text-sm text-ink-soft">{message}</p> : null}
      {!rows.length ? (
        <p className="text-sm text-ink-soft">No batches yet.</p>
      ) : (
        <ul className="divide-y divide-line rounded-2xl border border-line bg-paper">
          {rows.map((b) => (
            <li key={b.id} className="space-y-2 px-4 py-3 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-ink">{b.subject || b.kind}</p>
                  <p className="text-xs text-ink-soft">
                    {b.status} · {b.sent}/{b.total} sent
                    {b.failed ? ` · ${b.failed} failed` : ""}
                    {b.cancelled ? ` · ${b.cancelled} cancelled` : ""}
                    {b.not_before ? ` · starts ${new Date(b.not_before).toLocaleString()}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {b.status === "scheduled" || b.status === "paused" || b.status === "sending" ? (
                    <>
                      <button
                        type="button"
                        disabled={pending}
                        className="rounded-lg border border-line px-2 py-1 text-xs"
                        onClick={() =>
                          start(async () => {
                            const next = new Date(Date.now() + 60_000).toISOString();
                            const r = await rescheduleBatchAction({
                              ownerId,
                              batchId: b.id,
                              notBefore: next,
                            });
                            setMessage(r.ok ? "Start time updated (+1 min)." : r.error.message);
                          })
                        }
                      >
                        Change start
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        className="rounded-lg border border-line px-2 py-1 text-xs"
                        onClick={() =>
                          start(async () => {
                            const r = await cancelBatchAction({ ownerId, batchId: b.id });
                            setMessage(r.ok ? "Cancelled remaining." : r.error.message);
                          })
                        }
                      >
                        Cancel rest
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {cursor ? (
        <button
          type="button"
          disabled={pending}
          className="rounded-lg border border-line px-3 py-1.5 text-xs"
          onClick={() =>
            start(async () => {
              const r = await listBatchesAction({
                ownerId,
                cursorCreatedAt: cursor.createdAt,
                cursorId: cursor.id,
              });
              if (r.ok) {
                setRows((prev) => [...prev, ...(r.data.rows as BatchRow[])]);
                setCursor(r.data.nextCursor);
              }
            })
          }
        >
          Load more
        </button>
      ) : null}
    </div>
  );
}
