import Link from "next/link";
import type { ConnectionCapability } from "../types";

export function NeedsConnection({
  capability = "email.send",
  ownerId,
  message,
}: {
  capability?: ConnectionCapability;
  ownerId: string;
  message?: string;
}) {
  const href = `/organizer/${ownerId}/settings/connections`;
  const label =
    capability === "email.send"
      ? "Connect Google to send email"
      : capability === "drive.files"
        ? "Connect Google Drive"
        : capability === "calendar" || capability === "meet"
          ? "Connect Google Calendar"
          : "Connect this integration";
  return (
    <p
      role="status"
      className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
    >
      {message || label} —{" "}
      <Link className="font-medium underline" href={href}>
        Open Connections
      </Link>
      .
    </p>
  );
}
