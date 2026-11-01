import { notFound } from "next/navigation";
import { EventService } from "@/src/services/event.service";
import { eventIsHackathon } from "@/src/features/hackathon/hackathon.service";
import { EnterCompeteForm } from "@/src/features/hackathon/components/EnterCompeteForm";
import { readCompeteCookie } from "@/src/features/hackathon/competeSession";
import { getParticipantAccess } from "@/src/features/hackathon/participantAccess";
import { HackathonCountdown } from "@/src/features/hackathon/components/HackathonCountdown";
import Link from "next/link";
import { buttonClass } from "@/src/lib/ui";

export const metadata = { title: "Enter code — Avoeline" };

export default async function EnterCompetePage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ reason?: string }>;
}) {
  const { eventId } = await params;
  void searchParams;
  const event = await EventService.getEventByID(eventId);
  if (!event || !(await eventIsHackathon(event))) notFound();

  const session = await readCompeteCookie(eventId);
  const access = session
    ? await getParticipantAccess({
        eventId,
        registrationId: session.registrationId,
        teamId: session.teamId,
      })
    : await getParticipantAccess({ eventId });

  return (
    <main className="mx-auto w-full max-w-md space-y-6 px-4 py-16 sm:px-6">
      <div>
        <h1 className="font-display text-2xl text-ink">{access.title}</h1>
        <p className="mt-2 text-sm text-ink-soft">{access.message}</p>
        <p className="mt-2 text-sm font-medium text-ink">{access.nextAction}</p>
      </div>

      {access.reasonCode === "competition_not_open" && access.opensAt ? (
        <HackathonCountdown endsAt={access.opensAt} label="Opens in" />
      ) : null}

      {access.reasonCode === "payment_pending" ? (
        <Link href={`/events/${eventId}`} className={buttonClass("secondary", "sm")}>
          Open event page / ticket
        </Link>
      ) : null}

      {access.allowed && session ? (
        <Link href={`/events/${eventId}/compete`} className={buttonClass("primary")}>
          Continue to workspace
        </Link>
      ) : (
        <div className="mt-4">
          <EnterCompeteForm eventId={event.id} />
        </div>
      )}
    </main>
  );
}
