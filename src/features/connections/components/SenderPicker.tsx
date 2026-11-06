"use client";

import { useEffect, useState, useTransition } from "react";
import { listSendableConnectionsAction } from "../actions/sender.action";

export type SendableOption = {
  connectionId: string;
  label: string;
  source: "personal" | "org" | "event";
};

export function SenderPicker({
  eventId,
  orgContext,
  value,
  onChange,
}: {
  eventId?: string;
  orgContext?: string;
  value?: string | null;
  onChange: (connectionId: string | null) => void;
}) {
  const [options, setOptions] = useState<SendableOption[]>([]);
  const [pending, start] = useTransition();

  useEffect(() => {
    start(async () => {
      const r = await listSendableConnectionsAction({ eventId, orgContext });
      if (r.ok) {
        setOptions(r.data.options as SendableOption[]);
        if (!value && r.data.options[0]) {
          onChange(r.data.options[0].connectionId);
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, orgContext]);

  if (!options.length && !pending) {
    return (
      <p className="text-xs text-amber-800">
        Sending as — no connection available. Connect Google under Settings → Connections.
      </p>
    );
  }

  return (
    <label className="block text-xs text-ink-soft">
      Sending as
      <select
        className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink"
        value={value || ""}
        disabled={pending || !options.length}
        onChange={(e) => onChange(e.target.value || null)}
      >
        {options.map((o) => (
          <option key={o.connectionId} value={o.connectionId}>
            {o.label}
            {o.source === "org"
              ? " (organization)"
              : o.source === "event"
                ? " (event default)"
                : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
