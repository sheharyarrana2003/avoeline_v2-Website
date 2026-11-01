"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import { updateStatsSettingAction, upsertSiteSettingAction } from "../../actions/settings.action";

export type StatsSettingRow = {
  key: string;
  label: string;
  visible: boolean;
  min_threshold: number;
  format: string;
  rawValue: number;
  displayedValue: string;
};

export function StatsCmsPanel({
  rows,
  refreshSeconds,
}: {
  rows: StatsSettingRow[];
  refreshSeconds: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [local, setLocal] = useState(rows);
  const [refresh, setRefresh] = useState(refreshSeconds);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-line p-4">
        <div>
          <label className={labelClass} htmlFor="stats-refresh">
            Refresh rate (seconds)
          </label>
          <input
            id="stats-refresh"
            className={fieldClass}
            type="number"
            min={60}
            max={86_400}
            value={refresh}
            onChange={(e) => setRefresh(Number(e.target.value) || 300)}
          />
        </div>
        <button
          type="button"
          className={buttonClass("secondary", "md")}
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await upsertSiteSettingAction({
                key: "stats",
                value: { refreshSeconds: refresh },
              });
              if (!res.ok) setError(res.error.message);
              else {
                setError(null);
                router.refresh();
              }
            })
          }
        >
          Save refresh
        </button>
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      {local.map((row) => (
        <div key={row.key} className="space-y-3 rounded-2xl border border-line p-4">
          <div className="flex flex-wrap gap-4 text-sm">
            <span>
              <span className="text-ink-soft">Raw:</span>{" "}
              <strong className="tabular-nums">{row.rawValue}</strong>
            </span>
            <span>
              <span className="text-ink-soft">Displayed:</span>{" "}
              <strong>{row.displayedValue}</strong>
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className={labelClass}>Label</label>
              <input
                className={fieldClass}
                value={row.label}
                onChange={(e) =>
                  setLocal((prev) =>
                    prev.map((r) => (r.key === row.key ? { ...r, label: e.target.value } : r)),
                  )
                }
              />
            </div>
            <div>
              <label className={labelClass}>Min threshold</label>
              <input
                className={fieldClass}
                type="number"
                value={row.min_threshold}
                onChange={(e) =>
                  setLocal((prev) =>
                    prev.map((r) =>
                      r.key === row.key ? { ...r, min_threshold: Number(e.target.value) || 0 } : r,
                    ),
                  )
                }
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={row.visible}
                onChange={(e) =>
                  setLocal((prev) =>
                    prev.map((r) => (r.key === row.key ? { ...r, visible: e.target.checked } : r)),
                  )
                }
              />
              Visible
            </label>
            <div>
              <label className={labelClass}>Format</label>
              <select
                className={fieldClass}
                value={row.format}
                onChange={(e) =>
                  setLocal((prev) =>
                    prev.map((r) => (r.key === row.key ? { ...r, format: e.target.value } : r)),
                  )
                }
              >
                <option value="number">number</option>
                <option value="compact">compact</option>
              </select>
            </div>
          </div>
          <button
            type="button"
            className={buttonClass("primary", "md")}
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await updateStatsSettingAction({
                  key: row.key,
                  label: row.label,
                  visible: row.visible,
                  min_threshold: row.min_threshold,
                  format: row.format === "compact" ? "compact" : "number",
                });
                if (!res.ok) setError(res.error.message);
                else {
                  setError(null);
                  router.refresh();
                }
              })
            }
          >
            Save {row.key}
          </button>
        </div>
      ))}
    </div>
  );
}
