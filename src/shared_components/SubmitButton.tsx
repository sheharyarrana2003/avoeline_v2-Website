"use client";

import { useFormStatus } from "react-dom";
import React from "react";

type SubmitButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Label shown while the enclosing form's action is running. */
  pendingText?: string;
};

/**
 * Submit button for a server-action `<form action={...}>`. It reads the
 * enclosing form's pending state via `useFormStatus` and disables itself while
 * the action runs, preventing duplicate submissions. Must be rendered as a
 * descendant of the form it submits.
 */
export function SubmitButton({
  children,
  pendingText,
  disabled,
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      {...props}
      disabled={pending || disabled}
      aria-busy={pending}
    >
      {pending ? pendingText ?? "Processing…" : children}
    </button>
  );
}

export default SubmitButton;
