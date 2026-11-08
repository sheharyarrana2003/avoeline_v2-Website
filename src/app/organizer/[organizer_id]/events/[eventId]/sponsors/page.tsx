import { notFound } from "next/navigation";
import { assertOwnedEvent } from "@/src/features/events/ownership";
import { eventIsHackathon, listTracks } from "@/src/features/hackathon/hackathon.service";
import {
  getEventOrganizations,
  listPartnerTypes,
} from "@/src/features/organizations/organizations.service";
import { publicOrder } from "@/src/features/organizations/types";
import { SponsorsBoard } from "@/src/features/organizations/components/SponsorsBoard";
import { InviteCollaborator } from "@/src/features/organizations/components/InviteCollaborator";
import { absoluteUrl } from "@/src/lib/appUrl";
import { Card, CardBody } from "@/src/shared_components/ui/Card";

export default async function EventSponsorsPage({
  params,
}: {
  params: Promise<{ organizer_id: string; eventId: string }>;
}) {
  const { organizer_id, eventId } = await params;
  const event = await assertOwnedEvent(eventId);
  if (!event) notFound();

  const isHackathon = await eventIsHackathon(event);
  const tracks = isHackathon ? await listTracks(eventId) : [];
  const [orgsRaw, partnerTypes] = await Promise.all([
    getEventOrganizations(eventId),
    listPartnerTypes(event.organizerId),
  ]);
  const orgs = publicOrder(orgsRaw, event.sponsorTiers);
  const origin = await absoluteUrl("/collaborate");
  const currency = event.pricing?.currency || "PKR";

  return (
    <div className="space-y-8">
      <SponsorsBoard
        eventId={eventId}
        organizerId={organizer_id}
        orgs={orgs}
        sponsorTiers={event.sponsorTiers}
        tracks={tracks.map((t) => ({ id: t.id, name: t.name }))}
        isHackathon={isHackathon}
        partnerTypes={partnerTypes}
        showSponsors={!!event.showSponsors}
        showCollaborators={!!event.showCollaborators}
        showPartners={!!event.showPartners}
        currency={currency}
      />

      <Card title="Invite a collaborator">
        <CardBody>
          <InviteCollaborator eventId={eventId} inviteBase={origin} />
        </CardBody>
      </Card>
    </div>
  );
}
