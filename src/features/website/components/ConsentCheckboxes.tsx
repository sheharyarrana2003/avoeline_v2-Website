"use client";

import Link from "next/link";
import { DEFAULT_COMMUNITY_OPT_IN } from "../consent.logic";

export type ConsentCheckboxesProps = {
  legalAccepted: boolean;
  communityOptIn: boolean;
  onLegalChange: (value: boolean) => void;
  onCommunityChange: (value: boolean) => void;
  idPrefix?: string;
  disabled?: boolean;
};

/**
 * Required Terms/Privacy accept + optional community opt-in (default unticked).
 * Parents own state so signup and registration can validate before submit.
 */
export function ConsentCheckboxes({
  legalAccepted,
  communityOptIn,
  onLegalChange,
  onCommunityChange,
  idPrefix = "consent",
  disabled = false,
}: ConsentCheckboxesProps) {
  return (
    <div className="space-y-3 rounded-xl border border-line bg-paper p-3 text-sm text-ink">
      <label className="flex items-start gap-2">
        <input
          id={`${idPrefix}-legal`}
          type="checkbox"
          className="mt-1"
          checked={legalAccepted}
          disabled={disabled}
          onChange={(e) => onLegalChange(e.target.checked)}
          required
        />
        <span>
          I agree to the{" "}
          <Link href="/terms" className="underline underline-offset-2" target="_blank">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline underline-offset-2" target="_blank">
            Privacy Policy
          </Link>
          .
        </span>
      </label>
      <label className="flex items-start gap-2">
        <input
          id={`${idPrefix}-community`}
          type="checkbox"
          className="mt-1"
          checked={communityOptIn}
          disabled={disabled}
          onChange={(e) => onCommunityChange(e.target.checked)}
        />
        <span>Send me updates and connect me with the Avoeline community</span>
      </label>
    </div>
  );
}

/** Defaults for parent state initializers — community stays unticked. */
export function defaultConsentState() {
  return {
    legalAccepted: false,
    communityOptIn: DEFAULT_COMMUNITY_OPT_IN,
  };
}
