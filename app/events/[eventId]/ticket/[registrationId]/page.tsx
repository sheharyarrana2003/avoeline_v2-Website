import { notFound } from "next/navigation";
import { Check, Clock } from "lucide-react";
import { getPublicEvent, getRegistrationById } from "@/src/features/registration/registration.service";
import { AgendaService, sessionsForTier } from "@/src/features/agendas/agenda.service";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { formatDate, formatDateMedium, formatTime } from "@/src/lib/datetime";
import { formatCurrency } from "@/src/lib/money";

export const metadata = {
    title: "Your ticket — Avoeline",
};

/**
 * The attendee's ticket.
 *
 * This is the whole of the attendee-facing product: there is no attendee account
 * or dashboard in this app, so a registration is reachable only by this URL. It
 * is a capability link -- the registration id is an unguessable Firestore id --
 * and it shows nothing the person did not type in themselves.
 *
 * The QR image renders only once one exists, so this page is complete now and
 * gains the code without further change when generation lands.
 */
export default async function TicketPage({
    params,
}: {
    params: Promise<{ eventId: string; registrationId: string }>;
}) {
    const { eventId, registrationId } = await params;

    const [registration, event] = await Promise.all([
        getRegistrationById(registrationId),
        getPublicEvent(eventId),
    ]);

    // Also refuse a real registration reached through the wrong event's URL, so the
    // pairing in the link has to be genuine.
    if (!registration || !event || registration.eventId !== event.id) notFound();

    const awaitingPayment = registration.status === "awaiting_payment";
    const attendeeName = registration.attendee?.name || "Attendee";

    // Spec 2.1: a tiered event's attendees see a different agenda depending on
    // their tier. Filtered on the server, so a restricted session is never sent
    // to a browser that is not entitled to it.
    const sessions = sessionsForTier(await AgendaService.getSessionsByEventId(eventId), registration.tier);

    return (
        <main className="mx-auto w-full max-w-xl px-4 py-10 sm:px-6 sm:py-14">
            <div className="flex flex-col items-center text-center">
                <span
                    className={`mb-6 flex size-14 items-center justify-center rounded-full ${
                        awaitingPayment ? "bg-muted text-ink" : "bg-ink text-ink-invert"
                    }`}
                    aria-hidden="true"
                >
                    {awaitingPayment ? <Clock className="h-7 w-7" /> : <Check className="h-7 w-7" strokeWidth={3} />}
                </span>

                <h1 className="font-display text-2xl text-ink">
                    {awaitingPayment ? "Registration received" : "You're registered"}
                </h1>
                <p className="mt-2 text-sm text-ink-soft">
                    {awaitingPayment
                        ? `Your place at ${event.title} is held until the organiser confirms your payment.`
                        : `Your place at ${event.title} is confirmed.`}
                </p>
            </div>

            <div className="mt-8 overflow-hidden rounded-2xl border border-line bg-paper">
                {registration.qrCode?.imageUrl ? (
                    <div className="flex flex-col items-center border-b border-line px-6 py-8">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={registration.qrCode.imageUrl}
                            alt={`Entry QR code for ${attendeeName}`}
                            className="size-56 rounded-xl bg-white p-3"
                        />
                        <p className="mt-4 text-xs text-ink-soft">Show this at the entrance.</p>
                    </div>
                ) : null}

                <dl className="divide-y divide-line">
                    <Row label="Name" value={attendeeName} />
                    <Row label="Email" value={registration.attendee?.email || "—"} />
                    <Row label="Event" value={event.title} />
                    <Row label="Date" value={formatDateMedium(event.schedule?.startDate)} />
                    <Row label="Starts" value={formatTime(event.schedule?.startTime)} />
                    <Row
                        label="Venue"
                        value={[event.location?.venueName, event.location?.city].filter(Boolean).join(", ") || "—"}
                    />
                    <Row label="Ticket" value={registration.pricingTier} />
                    <Row
                        label="Price"
                        value={formatCurrency(registration.finalPrice, registration.payment?.currency || "PKR", "Free")}
                    />
                    <Row
                        label="Status"
                        value={<StatusBadge status={registration.status} size="sm" />}
                    />
                    {/* Last, and in mono: it is the reference someone reads aloud or
                        quotes to an organizer, not a headline. */}
                    <Row label="Registration ID" value={<span className="font-mono text-xs">{registration.registrationId}</span>} />
                </dl>
            </div>

            {sessions.length ? (
                <section className="mt-8 rounded-2xl border border-line bg-paper p-6">
                    <h2 className="font-display text-base text-ink">
                        Your schedule
                        {registration.tier ? (
                            <span className="ml-2 text-2xs font-medium uppercase text-ink-soft">{registration.tier}</span>
                        ) : null}
                    </h2>
                    <ul className="mt-4 space-y-3">
                        {sessions.map((session) => (
                            <li key={session.id} className="flex gap-4 border-b border-line pb-3 last:border-b-0 last:pb-0">
                                <div className="w-28 shrink-0 text-xs text-ink-soft tabular-nums">
                                    <span className="block text-ink">{formatTime(session.startTime)}</span>
                                    <span>{formatDate(session.date)}</span>
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-ink">{session.title}</p>
                                    <p className="text-xs text-ink-soft">{session.location}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </section>
            ) : null}

            <p className="mt-6 text-center text-xs text-ink-soft">
                Keep this link — it is the only way back to your ticket.
            </p>
        </main>
    );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between gap-4 px-6 py-3.5">
            <dt className="text-2xs font-medium uppercase text-ink-soft">{label}</dt>
            <dd className="min-w-0 truncate text-right text-sm text-ink">{value}</dd>
        </div>
    );
}
