"use client";

import { useEffect, useState, useTransition } from "react";
import {
  commitAttendeeImportAction,
  dryRunAttendeeImportAction,
  getAttendeeImportOptionsAction,
  parseAttendeeImportFileAction,
  parseAttendeeImportSheetAction,
} from "./attendeeImport.action";
import type { ImportColumnKey, ImportFieldOption, ParsedImportTable } from "./attendeeImport.logic";
import { listMyDriveConnectionsAction } from "@/src/features/connections/actions/drive.action";
import { buttonClass, fieldClass } from "@/src/lib/ui";

type Preview =
  { rowIndex: number; ok: true } | { rowIndex: number; ok: false; error: string; email?: string };

export function AttendeeImportPanel({ eventId }: { eventId: string }) {
  const [pending, start] = useTransition();
  const [options, setOptions] = useState<ImportFieldOption[]>([]);
  const [connections, setConnections] = useState<Array<{ id: string; email: string }>>([]);
  const [connectionId, setConnectionId] = useState("");
  const [table, setTable] = useState<ParsedImportTable | null>(null);
  const [columnMap, setColumnMap] = useState<ImportColumnKey[]>([]);
  const [previews, setPreviews] = useState<Preview[] | null>(null);
  const [willCreate, setWillCreate] = useState(0);
  const [paidBlocked, setPaidBlocked] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    start(async () => {
      const [opts, conns] = await Promise.all([
        getAttendeeImportOptionsAction({ eventId }),
        listMyDriveConnectionsAction({}),
      ]);
      if (opts.ok) setOptions(opts.data.options);
      if (conns.ok) {
        setConnections(conns.data.connections);
        setConnectionId(conns.data.connections[0]?.id || "");
      }
    });
  }, [eventId]);

  const applyParsed = (data: {
    headers: string[];
    guessedMap: ImportColumnKey[];
    table: ParsedImportTable;
  }) => {
    setTable(data.table);
    setColumnMap(data.guessedMap);
    setPreviews(null);
    setMessage(`Loaded ${data.table.rows.length} data row(s). Map columns, then preview.`);
    setError(null);
  };

  const onFile = (file: File | null) => {
    if (!file) return;
    start(async () => {
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
      const base64 = btoa(binary);
      const r = await parseAttendeeImportFileAction({
        eventId,
        filename: file.name,
        base64,
      });
      if (!r.ok) {
        setError(r.error.message);
        return;
      }
      applyParsed(r.data);
    });
  };

  const pickSheet = () => {
    if (!connectionId) {
      setError("Connect Google Drive first.");
      return;
    }
    start(async () => {
      try {
        const res = await fetch(
          `/api/connections/google/picker-token?connectionId=${encodeURIComponent(connectionId)}`,
          { method: "GET", credentials: "same-origin" },
        );
        const json = (await res.json()) as {
          ok?: boolean;
          error?: string;
          accessToken?: string;
          apiKey?: string;
          appId?: string;
        };
        if (!res.ok || !json.ok || !json.accessToken || !json.apiKey || !json.appId) {
          setError(json.error || "Could not start Google Picker.");
          return;
        }
        await loadPickerScript();
        await new Promise<void>((resolve, reject) => {
          window.gapi!.load("picker", () => resolve());
          setTimeout(() => reject(new Error("Picker load timeout")), 15000);
        });
        const view = new window.google!.picker.DocsView();
        view.setIncludeFolders(false);
        view.setSelectFolderEnabled(false);
        const picker = new window.google!.picker.PickerBuilder()
          .addView(view)
          .setOAuthToken(json.accessToken)
          .setDeveloperKey(json.apiKey)
          .setAppId(json.appId)
          .setCallback(async (data) => {
            if (data.action === window.google!.picker.Action.CANCEL) return;
            if (data.action !== window.google!.picker.Action.PICKED || !data.docs?.length) return;
            const doc = data.docs[0]!;
            const parsed = await parseAttendeeImportSheetAction({
              eventId,
              connectionId,
              spreadsheetId: doc.id,
            });
            if (!parsed.ok) {
              setError(parsed.error.message);
              return;
            }
            applyParsed(parsed.data);
          })
          .build();
        picker.setVisible(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Picker failed.");
      }
    });
  };

  const runPreview = () => {
    if (!table) return;
    start(async () => {
      const r = await dryRunAttendeeImportAction({ eventId, table, columnMap });
      if (!r.ok) {
        setError(r.error.message);
        return;
      }
      setPaidBlocked(r.data.paidBlocked);
      setWillCreate(r.data.willCreate);
      setPreviews(
        r.data.previews.map((p) =>
          p.ok
            ? { rowIndex: p.rowIndex, ok: true as const }
            : { rowIndex: p.rowIndex, ok: false as const, error: p.error, email: p.email },
        ),
      );
      setMessage(
        r.data.paidBlocked
          ? "Paid events cannot be imported."
          : `${r.data.willCreate} row(s) ready to create.`,
      );
      setError(null);
    });
  };

  const runCommit = () => {
    if (!table || !willCreate) return;
    start(async () => {
      const r = await commitAttendeeImportAction({ eventId, table, columnMap });
      if (!r.ok) {
        setError(r.error.message);
        return;
      }
      setMessage(`Imported ${r.data.created} attendee(s).`);
      setTable(null);
      setPreviews(null);
      setWillCreate(0);
      setError(null);
    });
  };

  return (
    <section className="space-y-4 rounded-xl border border-line bg-paper px-4 py-4">
      <div>
        <h3 className="font-display text-base text-ink">Import attendees</h3>
        <p className="text-sm text-ink-soft">
          Upload Excel/CSV or pick a Google Sheet. Free events only — paid tickets must register
          normally.
        </p>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {message ? <p className="text-sm text-ink-soft">{message}</p> : null}

      <div className="flex flex-wrap items-end gap-3">
        <label className="block text-xs text-ink">
          Excel or CSV
          <input
            type="file"
            accept=".xlsx,.xls,.csv,text/csv"
            className="mt-1 block w-full max-w-xs text-sm"
            disabled={pending}
            onChange={(e) => onFile(e.target.files?.[0] || null)}
          />
        </label>
        <div className="space-y-1">
          <label className="block text-xs text-ink">
            Drive account
            <select
              className={`${fieldClass} mt-1 max-w-xs`}
              value={connectionId}
              onChange={(e) => setConnectionId(e.target.value)}
              disabled={pending || !connections.length}
            >
              {connections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.email}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className={buttonClass("secondary", "sm")}
            disabled={pending || !connectionId}
            onClick={pickSheet}
          >
            Pick Google Sheet
          </button>
        </div>
      </div>

      {table ? (
        <div className="space-y-3">
          <p className="text-xs font-medium text-ink">Column mapping</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {table.headers.map((h, i) => (
              <label key={`${h}-${i}`} className="block text-xs text-ink-soft">
                {h || `(column ${i + 1})`}
                <select
                  className={`${fieldClass} mt-1`}
                  value={columnMap[i] || "skip"}
                  onChange={(e) => {
                    const next = [...columnMap];
                    next[i] = e.target.value as ImportColumnKey;
                    setColumnMap(next);
                    setPreviews(null);
                  }}
                >
                  {options.map((o) => (
                    <option key={o.key} value={o.key}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={buttonClass("secondary", "sm")}
              disabled={pending}
              onClick={runPreview}
            >
              Preview
            </button>
            <button
              type="button"
              className={buttonClass("primary", "sm")}
              disabled={pending || !willCreate || paidBlocked}
              onClick={runCommit}
            >
              Import {willCreate || ""}
            </button>
          </div>
          {previews ? (
            <ul className="max-h-48 overflow-auto text-xs text-ink-soft">
              {previews.slice(0, 40).map((p) => (
                <li key={p.rowIndex}>
                  Row {p.rowIndex}: {p.ok ? "OK" : p.error}
                </li>
              ))}
              {previews.length > 40 ? <li>…and {previews.length - 40} more</li> : null}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function loadPickerScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.gapi?.load) {
      resolve();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>('script[data-google-api="1"]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Picker script failed")));
      return;
    }
    const s = document.createElement("script");
    s.src = "https://apis.google.com/js/api.js";
    s.async = true;
    s.dataset.googleApi = "1";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Picker script failed"));
    document.head.appendChild(s);
  });
}
