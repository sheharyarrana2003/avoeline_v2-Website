"use client";

import { useState, useTransition } from "react";
import { updatePublicShowToggles } from "@/src/features/events/actions/updatePublicShowToggles.action";

type Props = {
  eventId: string;
  showSponsors: boolean;
  showCollaborators: boolean;
  showPartners: boolean;
};

/**
 * Sponsors-tab switches: which organization types appear on the public page.
 * Defaults are off until the organizer opts in.
 */
export function PublicShowToggles({
  eventId,
  showSponsors: initialSponsors,
  showCollaborators: initialCollaborators,
  showPartners: initialPartners,
}: Props) {
  const [showSponsors, setShowSponsors] = useState(initialSponsors);
  const [showCollaborators, setShowCollaborators] = useState(initialCollaborators);
  const [showPartners, setShowPartners] = useState(initialPartners);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save(next: {
    showSponsors: boolean;
    showCollaborators: boolean;
    showPartners: boolean;
  }) {
    setShowSponsors(next.showSponsors);
    setShowCollaborators(next.showCollaborators);
    setShowPartners(next.showPartners);
    setError(null);
    startTransition(async () => {
      const result = await updatePublicShowToggles({
        eventId,
        ...next,
      });
      if (!result.ok) {
        setError(result.error.message);
        setShowSponsors(initialSponsors);
        setShowCollaborators(initialCollaborators);
        setShowPartners(initialPartners);
      }
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-soft">
        Choose which groups appear on the public event page. Nothing is shown until you turn a
        switch on.
      </p>
      <ul className="space-y-3">
        <ToggleRow
          id="show-sponsors"
          label="Sponsors"
          checked={showSponsors}
          disabled={pending}
          onChange={(v) => save({ showSponsors: v, showCollaborators, showPartners })}
        />
        <ToggleRow
          id="show-collaborators"
          label="Collaborators"
          checked={showCollaborators}
          disabled={pending}
          onChange={(v) => save({ showSponsors, showCollaborators: v, showPartners })}
        />
        <ToggleRow
          id="show-partners"
          label="Partners"
          checked={showPartners}
          disabled={pending}
          onChange={(v) => save({ showSponsors, showCollaborators, showPartners: v })}
        />
      </ul>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {pending ? <p className="text-2xs uppercase text-ink-soft">Saving…</p> : null}
    </div>
  );
}

function ToggleRow({
  id,
  label,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-line bg-paper px-4 py-3"
    >
      <span className="text-sm font-medium text-ink">{label}</span>
      <input
        id={id}
        type="checkbox"
        role="switch"
        className="h-4 w-8 accent-current"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}
