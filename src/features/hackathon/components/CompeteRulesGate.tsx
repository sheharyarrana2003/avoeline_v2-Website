"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { buttonClass } from "@/src/lib/ui";
import { acknowledgeCompetitionRules } from "../actions/participantSignals.action";

export function CompeteRulesGate({ eventId, rules }: { eventId: string; rules: string[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <div className="mx-auto max-w-lg space-y-4 rounded-xl border border-line bg-paper p-6">
      <h2 className="font-display text-xl text-ink">Active rules</h2>
      <p className="text-sm text-ink-soft">
        Confirm you understand the rules enabled for this competition before continuing.
      </p>
      <ul className="list-disc space-y-2 pl-5 text-sm text-ink">
        {rules.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      <button
        type="button"
        disabled={pending}
        className={buttonClass("primary")}
        onClick={() => {
          start(async () => {
            await acknowledgeCompetitionRules({ eventId });
            router.refresh();
          });
        }}
      >
        I understand — continue
      </button>
    </div>
  );
}
