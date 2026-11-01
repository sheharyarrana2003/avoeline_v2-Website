"use client";

import { useEffect } from "react";
import { recordSignupConsentsAction } from "../actions/consent.action";

const PENDING_CONSENT_KEY = "avoeline_pending_consent";

/**
 * After Google OAuth, flush sessionStorage consent flags once the user exists.
 * Mount on authenticated shells (dashboard layout / setup pages).
 */
export function ConsentFlushClient({
  email,
  userId,
  role,
}: {
  email: string;
  userId: string;
  role: string;
}) {
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const raw = sessionStorage.getItem(PENDING_CONSENT_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as {
          legalAccepted?: boolean;
          communityOptIn?: boolean;
          role?: string;
          source?: "google_signup" | "signup";
        };
        sessionStorage.removeItem(PENDING_CONSENT_KEY);
        if (!parsed.legalAccepted || cancelled) return;
        await recordSignupConsentsAction({
          email,
          userId,
          role: parsed.role || role,
          legalAccepted: true,
          communityOptIn: Boolean(parsed.communityOptIn),
          source: parsed.source === "signup" ? "signup" : "google_signup",
        });
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [email, userId, role]);

  return null;
}
