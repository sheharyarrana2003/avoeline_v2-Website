"use client";

import { useState, useTransition } from "react";
import { linkPickedFileAction } from "../actions/drive.action";
import type { LinkedFileEntityType } from "../types";

type PickerDoc = { id: string };
type PickerCallbackData = { action: string; docs?: PickerDoc[] };
type DocsViewInstance = {
  setIncludeFolders: (v: boolean) => DocsViewInstance;
  setSelectFolderEnabled: (v: boolean) => DocsViewInstance;
};
type PickerBuilder = {
  addView: (v: DocsViewInstance) => PickerBuilder;
  setOAuthToken: (t: string) => PickerBuilder;
  setDeveloperKey: (k: string) => PickerBuilder;
  setAppId: (id: string) => PickerBuilder;
  setCallback: (cb: (data: PickerCallbackData) => void) => PickerBuilder;
  build: () => { setVisible: (v: boolean) => void };
};

declare global {
  interface Window {
    gapi?: {
      load: (name: string, cb: () => void) => void;
    };
    google?: {
      picker: {
        DocsView: new () => DocsViewInstance;
        PickerBuilder: new () => PickerBuilder;
        Action: { PICKED: string; CANCEL: string };
      };
    };
  }
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

export function FilePickerButton({
  connectionId,
  entityType,
  entityId,
  onLinked,
}: {
  connectionId: string;
  entityType: LinkedFileEntityType;
  entityId: string;
  onLinked?: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function openPicker() {
    setError(null);
    start(async () => {
      try {
        const res = await fetch(
          `/api/connections/google/picker-token?connectionId=${connectionId}`,
          {
            method: "GET",
            credentials: "same-origin",
          },
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
        view.setIncludeFolders(true);
        view.setSelectFolderEnabled(false);
        const picker = new window.google!.picker.PickerBuilder()
          .addView(view)
          .setOAuthToken(json.accessToken)
          .setDeveloperKey(json.apiKey)
          .setAppId(json.appId)
          .setCallback(async (data) => {
            if (data.action === window.google!.picker.Action.CANCEL) return;
            if (data.action !== window.google!.picker.Action.PICKED || !data.docs?.length) return;
            for (const doc of data.docs) {
              const r = await linkPickedFileAction({
                connectionId,
                entityType,
                entityId,
                providerFileId: doc.id,
              });
              if (!r.ok) {
                setError(r.error.message);
                return;
              }
            }
            onLinked?.();
          })
          .build();
        picker.setVisible(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Picker failed.");
      }
    });
  }

  return (
    <div className="inline-flex flex-col gap-1">
      <button
        type="button"
        disabled={pending || !connectionId}
        onClick={openPicker}
        className="rounded-lg border border-line bg-paper px-3 py-1.5 text-xs font-medium text-ink disabled:opacity-50"
      >
        {pending ? "Opening…" : "Add from Drive"}
      </button>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
