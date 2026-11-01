"use client";

import { useEffect, useState, useTransition } from "react";
import {
  getOrganizerPartnerStatusAction,
  setOrganizerPartnerOptInAction,
} from "../actions/partnerOptIn.action";

export function OrganizerPartnerOptIn({ organizerId }: { organizerId: string }) {
  const [pending, startTransition] = useTransition();
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await getOrganizerPartnerStatusAction({ organizerId });
      if (cancelled) return;
      if (res.ok) {
        setStatus(res.data.status);
        setEnabled(res.data.status === "pending" || res.data.status === "granted");
      }
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [organizerId]);

  if (!loaded) return null;

  return (
    <div className="rounded-2xl border border-line p-4">
      <h3 className="font-semibold text-ink">Avoeline partners page</h3>
      <p className="mt-1 text-sm text-ink-soft">
        Show my organization on the Avoeline partners page. Opt-in creates a pending entry for
        platform approval. Revoking removes the logo immediately.
      </p>
      {status ? (
        <p className="mt-2 text-xs text-ink-soft">Current consent status: {status}</p>
      ) : null}
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
      <label className="mt-3 flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          checked={enabled}
          disabled={pending}
          onChange={(e) => {
            const next = e.target.checked;
            setEnabled(next);
            startTransition(async () => {
              const res = await setOrganizerPartnerOptInAction({
                organizerId,
                enabled: next,
              });
              if (!res.ok) {
                setError(res.error.message);
                setEnabled(!next);
                return;
              }
              setError(null);
              setStatus(next ? "pending" : "revoked");
            });
          }}
        />
        Show my organization on the Avoeline partners page
      </label>
      {pending ? <p className="mt-2 text-xs text-ink-soft">Saving…</p> : null}
    </div>
  );
}
