"use client";

import { useEffect, useEffectEvent } from "react";
import { reportActivityPing, reportIntegrityEvent } from "../actions/participantSignals.action";

export function CompeteMonitoring({
  eventId,
  activityOn,
  integrityOn,
  intervalMinutes,
}: {
  eventId: string;
  activityOn: boolean;
  integrityOn: boolean;
  intervalMinutes: number;
}) {
  const ping = useEffectEvent(() => {
    void reportActivityPing({ eventId });
  });
  const integrity = useEffectEvent(
    (eventType: "visibility_hidden" | "visibility_visible" | "tab_blur") => {
      void reportIntegrityEvent({ eventId, eventType });
    },
  );

  useEffect(() => {
    if (!activityOn) return;
    ping();
    const ms = Math.max(1, intervalMinutes) * 60_000;
    const id = window.setInterval(() => ping(), ms);
    return () => window.clearInterval(id);
  }, [activityOn, intervalMinutes, ping]);

  useEffect(() => {
    if (!integrityOn) return;
    const onVis = () => {
      integrity(document.visibilityState === "hidden" ? "visibility_hidden" : "visibility_visible");
    };
    const onBlur = () => integrity("tab_blur");
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
    };
  }, [integrityOn, integrity]);

  if (!activityOn && !integrityOn) return null;

  return (
    <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
      Monitoring is active for this competition
      {activityOn ? " (activity check)" : ""}
      {integrityOn ? " (tab-leave logging)" : ""}. Only event type and server time are recorded —
      this does not lock your browser or OS.
    </p>
  );
}
