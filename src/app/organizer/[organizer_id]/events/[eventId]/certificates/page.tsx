import { getCertsOfEventByRegistration } from "@/src/features/certificates/certificates.service";
import { issueCertificatesAction } from "@/src/features/certificates/actions/issueCertificates.action";
import { emailCertificatesLegacy } from "@/src/features/certificates/actions/emailCertificates.action";
import { RegService } from "@/src/services/registeration.service";
import { UserService } from "@/src/services/user.service";
import CertificateIssuanceClient, { type AttendeeCertProp } from "./certificateClient";
import { DriveHealthBanner } from "@/src/features/files/components/DriveHealthBanner";

export default async function CertificateIssuancePage({
  params,
}: {
  params: Promise<{ organizer_id: string; eventId: string }>;
}) {
  const { organizer_id, eventId } = await params;

  const { hasModuleAccess } = await import("@/src/features/permissions/permissions.service");
  if (!(await hasModuleAccess(organizer_id, "certificates"))) {
    const { LockedModulePanel } =
      await import("@/src/features/permissions/components/LockedModulePanel");
    return <LockedModulePanel moduleKey="certificates" />;
  }

  const regs = await RegService.getRegsOfEvent(eventId);

  let attendeesWithData: AttendeeCertProp[] = [];
  if (regs.length) {
    const [usersById, certByRegistration] = await Promise.all([
      UserService.getUsersByIds(regs.map((r) => r.userId).filter(Boolean)),
      getCertsOfEventByRegistration(eventId),
    ]);

    attendeesWithData = regs
      .filter((r) => r.status !== "cancelled" && r.status !== "rejected")
      .map((r) => {
        const user = usersById.get(String(r.userId));
        return {
          registrationId: r.registrationId,
          name: user?.profile?.fullName || r.attendee?.name || "Attendee",
          email: user?.email || r.attendee?.email || "",
          checkedIn: !!r.checkIn?.checkedIn || r.status === "checked_in" || r.status === "attended",
          certStatus: certByRegistration.get(r.registrationId) ?? null,
        };
      });
  }

  async function handleGenerateCertificates(
    selectedAttendeeIds: string[],
    roles: Record<string, string> = {},
    opts?: { archiveToDrive?: boolean },
  ) {
    "use server";
    const result = await issueCertificatesAction({
      eventId,
      registrationIds: selectedAttendeeIds,
      roles,
      archiveToDrive: opts?.archiveToDrive,
    });
    if (!result.ok) {
      return {
        success: false,
        count: 0,
        failedCount: 0,
        message: result.error.message,
        results: [],
      };
    }
    return {
      success: result.data.success,
      count: result.data.count,
      failedCount: result.data.failedCount,
      message: result.data.message,
      results: [...result.data.results],
    };
  }

  async function handleEmailCertificates(
    resend: boolean,
    opts?: {
      includeDriveLink?: boolean;
      acknowledgeDriveShareWarning?: boolean;
      connectionId?: string | null;
    },
  ) {
    "use server";
    return emailCertificatesLegacy(eventId, resend, opts);
  }

  const { listConnections } = await import("@/src/features/connections/server/connections.service");
  const conns = await listConnections({
    ownerType: "user",
    ownerId: organizer_id,
    includeQuota: false,
  });
  const driveConnected = conns.some(
    (c) =>
      c.status === "active" &&
      (c.capabilities || []).some((cap) => cap.capability === "drive.files" && cap.enabled),
  );

  return (
    <div className="space-y-4">
      <DriveHealthBanner
        organizerId={organizer_id}
        eventId={eventId}
        connectionsHref={`/organizer/${organizer_id}/connections`}
      />
      <CertificateIssuanceClient
        attendees={attendeesWithData}
        eventId={eventId}
        organizerId={organizer_id}
        driveConnected={driveConnected}
        onGenerateCertificates={handleGenerateCertificates}
        onEmailCertificates={handleEmailCertificates}
      />
    </div>
  );
}
