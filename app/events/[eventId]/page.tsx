import { notFound } from "next/navigation";
import { Calendar, Clock, MapPin, Users } from "lucide-react";
import { getEventForVisitor, isPaidEvent, ticketFor } from "@/src/features/registration/registration.service";
import { AccessGate } from "@/src/features/access/components/AccessGate";
import { RegistrationForm } from "@/src/features/registration/components/RegistrationForm";
import { RegService } from "@/src/services/registeration.service";
import { formatDateMedium, formatTime } from "@/src/lib/datetime";
import { formatCurrency } from "@/src/lib/money";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";

export const metadata = {
    title: "Register — Avoeline",
};

/**
 * The public registration page. No account, no session, no auth.
 *
 * `proxy.ts` only matches `/organizer/*` and `/vendor/*`, so this tree is
 * unauthenticated by construction -- nothing had to be opened up for it. It is
 * also the page the publish success screen has been handing organizers a link to
 * all along, which until now resolved to a 404.
 */
export default async function PublicEventPage({
    params,
    searchParams,
}: {
    params: Promise<{ eventId: string }>;
    searchParams: Promise<{ invite?: string; code?: string }>;
}) {
    const { eventId } = await params;
    const { invite, code } = await searchParams;

    // The visitor's credentials come off the URL: `?invite=` is the per-person
    // link, `?code=` is what the code form re-submits.
    const { event, access } = await getEventForVisitor(eventId, { token: invite, code });

    // A draft, cancelled or finished event is indistinguishable from a wrong link
    // on purpose: a stranger holding a URL should not learn that it exists.
    if (!event || (!access.allowed && access.reason !== "needs_code" && access.reason !== "bad_code")) {
        notFound();
    }

    // Refused only for want of a code: show the code form and nothing else about
    // the event, so the gate does not leak the thing it is protecting.
    if (!access.allowed) {
        return (
            <main className="mx-auto w-full max-w-md px-4 py-16 sm:px-6">
                <AccessGate eventId={eventId} inviteToken={invite ?? null} wrongCode={access.reason === "bad_code"} />
            </main>
        );
    }

    const paid = isPaidEvent(event);
    const { price } = ticketFor(event);
    const priceLabel = formatCurrency(price, event.pricing?.currency || "PKR", "Free");

    // Same live count the capacity guard uses, so what the page promises and what
    // the action enforces cannot disagree.
    const regs = await RegService.getRegsOfEvent(eventId);
    const taken = regs.filter((r) => r.status !== "cancelled").length;
    const totalSeats = Number(event.capacity?.totalSeats) || 0;
    const seatsLeft = totalSeats > 0 ? Math.max(0, totalSeats - taken) : null;
    const isFull = seatsLeft === 0;

    const startDate = formatDateMedium(event.schedule?.startDate);
    const startTime = formatTime(event.schedule?.startTime);
    const venue = [event.location?.venueName, event.location?.city].filter(Boolean).join(", ");

    return (
        <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
            <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:gap-14">
                <section className="min-w-0">
                    {event.bannerImage ? (
                        // Plain <img>, matching the organizer event page: banner URLs are
                        // not guaranteed to come from a host listed in next.config, and
                        // next/image throws at runtime on one that is not.
                        // Height is left to the image rather than forced into an aspect
                        // box, because these banners carry the schedule and venue as
                        // artwork -- cropping them is how that text becomes unreadable.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={event.bannerImage}
                            alt=""
                            className="mb-8 w-full rounded-2xl bg-muted object-contain"
                        />
                    ) : null}

                    <h1 className="font-display text-3xl text-ink sm:text-4xl">{event.title}</h1>

                    {event.shortDescription ? (
                        <p className="mt-3 text-base leading-relaxed text-ink-soft">{event.shortDescription}</p>
                    ) : null}

                    <dl className="mt-8 grid grid-cols-1 gap-5 border-y border-line py-8 sm:grid-cols-2">
                        <Fact icon={<Calendar className="h-4 w-4" />} label="Date" value={startDate} />
                        <Fact icon={<Clock className="h-4 w-4" />} label="Starts" value={startTime} />
                        <Fact icon={<MapPin className="h-4 w-4" />} label="Venue" value={venue || "—"} />
                        <Fact
                            icon={<Users className="h-4 w-4" />}
                            label="Seats left"
                            value={seatsLeft === null ? "Unlimited" : `${seatsLeft}`}
                        />
                    </dl>

                    {event.description ? (
                        <div className="mt-8">
                            <h2 className="font-display text-lg text-ink">About this event</h2>
                            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-soft">
                                {event.description}
                            </p>
                        </div>
                    ) : null}
                </section>

                <aside className="lg:sticky lg:top-10 lg:h-fit">
                    <div className="rounded-2xl border border-line bg-paper p-6 shadow-sm">
                        <p className="text-2xs font-medium uppercase text-ink-soft">
                            {paid ? "Ticket" : "Admission"}
                        </p>
                        <p className="mt-1 font-display text-2xl text-ink">{paid ? priceLabel : "Free"}</p>

                        <div className="mt-6">
                            {isFull && !event.access?.waitlistEnabled ? (
                                <EmptyState
                                    icon={<Users className="h-5 w-5" />}
                                    title="Fully booked"
                                    description="Every seat for this event has been taken. Check back in case someone cancels."
                                />
                            ) : (
                                <RegistrationForm
                                    eventId={event.id}
                                    isPaid={paid}
                                    priceLabel={priceLabel}
                                    inviteToken={invite ?? null}
                                    accessCode={code ?? null}
                                    tierChoices={
                                        event.access?.allowTierSelfSelect
                                            ? (event.access.attendeeTiers ?? []).filter((t) => !access.lockedTiers.includes(t))
                                            : []
                                    }
                                />
                            )}
                        </div>
                    </div>
                </aside>
            </div>
        </main>
    );
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="flex items-start gap-3">
            <span className="mt-0.5 text-ink-soft" aria-hidden="true">
                {icon}
            </span>
            <div className="min-w-0">
                <dt className="text-2xs font-medium uppercase text-ink-soft">{label}</dt>
                <dd className="mt-0.5 truncate text-sm text-ink">{value}</dd>
            </div>
        </div>
    );
}
