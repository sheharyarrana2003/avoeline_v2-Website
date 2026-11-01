import { redirect } from "next/navigation";
import { AuthService } from "@/src/features/auth/authService";
import {
  getOrganizerEmailConnection,
  googleOAuthConfigured,
} from "@/src/features/email/organizerEmailConnection.service";
import { OrganizerEmailConnectPanel } from "@/src/features/email/components/OrganizerEmailConnectPanel";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import Link from "next/link";

export default async function OrganizerEmailSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ organizer_id: string }>;
  searchParams: Promise<{ e?: string; ok?: string }>;
}) {
  const { organizer_id } = await params;
  const { e, ok } = await searchParams;
  const user = await AuthService.getCurrentUser();
  if (!user) redirect(`/signin?next=/organizer/${organizer_id}/email`);
  if (user.userId !== organizer_id) {
    const admin = await AuthService.requireAdmin("organizers");
    if (!admin?.isOwner) redirect("/access-denied");
  }

  const [connection, googleReady] = await Promise.all([
    getOrganizerEmailConnection(organizer_id),
    Promise.resolve(googleOAuthConfigured()),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader
        title="Email connection"
        description="Required before sending attendee or certificate mail."
      />
      <p className="mb-4 text-sm text-ink-soft">
        <Link href={`/organizer/${organizer_id}/profile`} className="underline hover:text-ink">
          Back to profile
        </Link>
      </p>
      <FormFeedback error={e} success={ok} />
      <OrganizerEmailConnectPanel
        organizerId={organizer_id}
        connection={connection}
        googleReady={googleReady}
      />
    </div>
  );
}
