import { notFound } from "next/navigation";
import { assertOwnedEvent } from "@/src/features/events/ownership";
import { ensureTemplateForEvent } from "@/src/features/certificates/certificates.service";
import { CertificateEditorLazy } from "@/src/features/certificates/components/CertificateEditorLazy";

export default async function MakingTemplate({
  params,
}: {
  params: Promise<{ eventId: string; organizer_id: string }>;
}) {
  const { eventId, organizer_id } = await params;

  const event = await assertOwnedEvent(eventId);
  if (!event) notFound();

  const { hasModuleAccess } = await import("@/src/features/permissions/permissions.service");
  if (!(await hasModuleAccess(organizer_id, "certificates"))) {
    const { LockedModulePanel } =
      await import("@/src/features/permissions/components/LockedModulePanel");
    return <LockedModulePanel moduleKey="certificates" />;
  }

  const template = await ensureTemplateForEvent(eventId, event.organizerId);

  return <CertificateEditorLazy eventId={eventId} initial={template} />;
}
