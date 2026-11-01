"use client";

import { AuthShell } from "@/src/shared_components/auth/AuthShell";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { useSearchParams } from "next/navigation";

export function ChooseRoleClient({
  action,
  email,
}: {
  action: (formData: FormData) => Promise<void>;
  email: string;
}) {
  const e = useSearchParams().get("e");
  return (
    <AuthShell
      eyebrow="Almost there"
      headline="How will you use Avoeline?"
      copy={`Signed in as ${email}. Pick a role to finish setup.`}
    >
      <FormFeedback error={e} />
      <form action={action} className="mt-6 space-y-3">
        {(
          [
            ["organizer", "Organizer", "Create and run events"],
            ["vendor", "Vendor", "List services and win bookings"],
            ["attendee", "Attendee", "Discover and register for events"],
          ] as const
        ).map(([value, title, desc]) => (
          <button
            key={value}
            type="submit"
            name="role"
            value={value}
            className="flex w-full flex-col items-start rounded-xl border border-line bg-paper px-4 py-3 text-left hover:border-ink"
          >
            <span className="font-medium text-ink">{title}</span>
            <span className="text-sm text-ink-soft">{desc}</span>
          </button>
        ))}
      </form>
    </AuthShell>
  );
}
