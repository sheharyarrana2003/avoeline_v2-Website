import Link from "next/link";
import { getOrganizerDriveHealth, driveHealthBannerCopy } from "../driveHealth";

/**
 * Server banner for Files / Attendees / Certificates / Submissions when Drive is degraded.
 */
export async function DriveHealthBanner({
  organizerId,
  eventId,
  connectionsHref,
}: {
  organizerId: string;
  eventId?: string;
  connectionsHref?: string;
}) {
  const health = await getOrganizerDriveHealth(organizerId, eventId);
  const copy = driveHealthBannerCopy(health);
  if (!copy) return null;

  const href = connectionsHref || `/organizer/${organizerId}/connections`;
  const tone =
    health.status === "active"
      ? "border-amber-200 bg-amber-50 text-amber-950"
      : health.status === "needs_reconnect" || health.status === "full"
        ? "border-amber-300 bg-amber-50 text-amber-950"
        : "border-red-200 bg-red-50 text-red-950";

  return (
    <div className={`mb-4 rounded-lg border px-3 py-2 text-sm ${tone}`} role="status">
      <p>{copy}</p>
      {health.status !== "active" ? (
        <p className="mt-1">
          <Link href={href} className="underline underline-offset-2">
            Open Connections
          </Link>
        </p>
      ) : null}
    </div>
  );
}
