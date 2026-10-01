import type { ReactNode } from "react";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import { ConfirmSubmit } from "@/src/shared_components/ui/ConfirmDialog";

export function AdminDeleteForm({
  action,
  hidden,
  label,
  title,
  description,
}: {
  action: (formData: FormData) => Promise<void>;
  hidden: Record<string, string>;
  label: string;
  title: string;
  description: string;
}) {
  return (
    <form action={action}>
      {Object.entries(hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <ConfirmSubmit
        tone="danger"
        title={title}
        description={description}
        confirmLabel={label}
        className="text-2xs font-semibold uppercase text-danger hover:underline"
      >
        {label}
      </ConfirmSubmit>
    </form>
  );
}

export function AdminEditNameForm({
  action,
  hidden,
  name,
  nameLabel,
  extra,
}: {
  action: (formData: FormData) => Promise<void>;
  hidden: Record<string, string>;
  name: string;
  nameLabel: string;
  extra?: ReactNode;
}) {
  return (
    <form action={action} className="space-y-3">
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <label className="block text-xs font-medium text-ink">
        {nameLabel}
        <input
          name="name"
          defaultValue={name}
          required
          className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink"
        />
      </label>
      {extra}
      <SubmitButton>Save</SubmitButton>
    </form>
  );
}
