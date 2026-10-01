import { notFound } from "next/navigation";
import { getPublicEvent } from "@/src/features/registration/registration.service";
import { eventIsHackathon } from "@/src/features/hackathon/hackathon.service";
import { EnterCompeteForm } from "@/src/features/hackathon/components/EnterCompeteForm";

export const metadata = { title: "Enter code — Avoeline" };

export default async function EnterCompetePage({ params }: { params: Promise<{ eventId: string }> }) {
    const { eventId } = await params;
    const event = await getPublicEvent(eventId);
    if (!event || !(await eventIsHackathon(event))) notFound();

    return (
        <main className="mx-auto w-full max-w-md px-4 py-16 sm:px-6">
            <h1 className="font-display text-2xl text-ink">Enter your access code</h1>
            <p className="mt-2 text-sm text-ink-soft">
                After the organizer confirms payment and approves the team, they share one team access code.
                Anyone on the team can enter it here, then continue to the participant dashboard.
            </p>
            <p className="mt-3 break-all rounded-lg bg-muted px-3 py-2 font-mono text-xs text-ink">
                /events/{eventId}/enter
            </p>
            <div className="mt-8">
                <EnterCompeteForm eventId={event.id} />
            </div>
        </main>
    );
}
