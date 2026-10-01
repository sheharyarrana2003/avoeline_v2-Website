import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, Clock, MapPin, Users } from "lucide-react";
import { getEventForVisitor, isPaidEvent, occupyingGroupRegs, occupyingHackathonRegs, ticketFor } from "@/src/features/registration/registration.service";
import { listRegistrationGroups } from "@/src/features/registration_groups/groups.service";
import { AccessGate } from "@/src/features/access/components/AccessGate";
import { checkAccessGate, canAccessEvent } from "@/src/lib/access";
import { markInviteOpenedAction } from "@/src/features/access/actions/inviteLinks.action";
import { SponsorStrip } from "@/src/features/organizations/components/SponsorStrip";
import { getEventOrganizations } from "@/src/features/organizations/organizations.service";
import { RegistrationForm } from "@/src/features/registration/components/RegistrationForm";
import { RegService } from "@/src/services/registeration.service";
import { formatDateMedium, formatTime } from "@/src/lib/datetime";
import { formatCurrency } from "@/src/lib/money";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { ReportEvent } from "@/src/features/admin/components/ReportEvent";
import { reportEvent } from "@/src/features/admin/actions/events.action";
import { buttonClass } from "@/src/lib/ui";
import { eventIsHackathon, listTeamsOfEvent, listTracks } from "@/src/features/hackathon/hackathon.service";
import { trackDueAmount } from "@/src/features/hackathon/types";
import { AuthService } from "@/src/features/auth/authService";
import { ImageLightbox } from "@/src/shared_components/ui/ImageLightbox";
import { VideoPreview } from "@/src/shared_components/ui/VideoPreview";
import { RichDescription } from "@/src/shared_components/ui/RichDescription";
import { isVideoUrl } from "@/src/features/media/media.utils";

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

    // Refused access per access gate rules
    const viewer = await AuthService.getCurrentUser().catch(() => null);
    const gate = await checkAccessGate(event, viewer, { token: invite, code });

    if (!gate.allowed) {
        return (
            <main className="mx-auto w-full max-w-md px-4 py-16 sm:px-6">
                <AccessGate
                    eventId={eventId}
                    inviteToken={invite ?? null}
                    wrongCode={gate.reason === "bad_code"}
                    reason={gate.reason}
                />
            </main>
        );
    }

    // Only once they are through: record that the invite was opened
    if (invite) {
        await markInviteOpenedAction(invite);
    }

    const paid = isPaidEvent(event);
    const { price } = ticketFor(event);
    const priceLabel = formatCurrency(price, event.pricing?.currency || "PKR", "Free");

    // Same live count the capacity guard uses, so what the page promises and what
    // the action enforces cannot disagree.
    // Prefills the form for whoever is signed in. Registering never requires an
    // account, so this is convenience only and every field stays editable.
    const regs = await RegService.getRegsOfEvent(eventId);
    const organizations = await getEventOrganizations(eventId);
    // Only a hackathon has tracks, and only read for one -- every other event
    // would pay a query to learn it has none.
    const hackathon = await eventIsHackathon(event);
    const tracks = hackathon ? await listTracks(eventId) : [];
    const openTracks = tracks.filter((t) => t.status !== "ended");
    const competitions = openTracks.map((t) => ({
        id: t.id,
        name: t.name,
        kind: t.kind,
        description: t.description,
        instructions: t.instructions,
        policies: t.policies,
        rulesText: t.rulesText,
        fee: t.fee,
        due: trackDueAmount(t),
        currency: t.currency || event.pricing?.currency || "PKR",
        discountPercent: t.discountPercent,
        discountNote: t.discountNote,
        minTeamSize: t.minTeamSize,
        maxTeamSize: t.maxTeamSize,
        submissionDeadline: t.submissionDeadline,
        prizePool: t.prizePool,
        imageUrl: t.imageUrl,
    }));
    const fromPrices = competitions.map((c) => c.due).filter((n) => n > 0);
    const hackathonPaid = competitions.length ? fromPrices.length > 0 : paid;
    const asidePrice = competitions.length
        ? fromPrices.length === 0
            ? "Free"
            : fromPrices.length === 1
              ? formatCurrency(fromPrices[0], competitions.find((c) => c.due === fromPrices[0])?.currency || "PKR", "Free")
              : `From ${formatCurrency(Math.min(...fromPrices), competitions[0]?.currency || "PKR")}`
        : paid
          ? priceLabel
          : "Free";
    const trackCount = tracks.length;
    const teamsOnEvent = hackathon ? await listTeamsOfEvent(eventId) : [];
    const groupsOnEvent = !hackathon && event.registration?.groupRegistration ? await listRegistrationGroups(eventId) : [];
    const taken = hackathon
        ? occupyingHackathonRegs(regs, teamsOnEvent).length
        : event.registration?.groupRegistration
          ? occupyingGroupRegs(regs, groupsOnEvent).length
          : regs.filter((r) => r.status !== "cancelled" && r.status !== "rejected").length;
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
                        isVideoUrl(event.bannerImage) ? (
                            <VideoPreview src={event.bannerImage} title={event.title} className="mb-8 w-full">
                                <video src={event.bannerImage} muted className="max-w-full h-auto rounded-2xl bg-muted" />
                            </VideoPreview>
                        ) : (
                            <ImageLightbox src={event.bannerImage} alt={`${event.title} banner`} className="mb-8 w-full">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={event.bannerImage}
                                    alt=""
                                    className="max-w-full h-auto rounded-2xl bg-muted"
                                />
                            </ImageLightbox>
                        )
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
                            <RichDescription html={event.description} className="mt-3" />
                        </div>
                    ) : null}
                </section>

                <aside className="lg:sticky lg:top-10 lg:h-fit">
                    <div className="rounded-2xl border border-line bg-paper p-6 shadow-sm">
                        <p className="text-2xs font-medium uppercase text-ink-soft">
                            {hackathonPaid ? "Ticket" : "Admission"}
                        </p>
                        <p className="mt-1 font-display text-2xl text-ink">{asidePrice}</p>

                        <div className="mt-6">
                            {event.requiresRegistration === false ? (
                                <p className="text-sm text-ink-soft">This event does not take registrations. Details are listed on this page.</p>
                            ) : isFull && !event.access?.waitlistEnabled ? (
                                <EmptyState
                                    icon={<Users className="h-5 w-5" />}
                                    title="Fully booked"
                                    description="Every seat for this event has been taken. Check back in case someone cancels."
                                />
                            ) : tracks.length > 0 && competitions.length === 0 ? (
                                <EmptyState
                                    icon={<Users className="h-5 w-5" />}
                                    title="Competitions closed"
                                    description="Every competition on this hackathon has ended, so registration is not open."
                                />
                            ) : (
                                <RegistrationForm
                                    eventId={event.id}
                                    isPaid={hackathonPaid}
                                    priceLabel={asidePrice}
                                    inviteToken={invite ?? null}
                                    accessCode={code ?? null}
                                    joinsWaitlist={isFull}
                                    needsApproval={!!event.access?.requiresApproval}
                                    customFields={event.registration?.customForm ?? []}
                                    competitions={competitions}
                                    groupRegistration={!hackathon && !!event.registration?.groupRegistration}
                                    groupMinSize={event.registration?.groupMinSize ?? 2}
                                    groupMaxSize={event.registration?.groupMaxSize ?? 8}
                                    attendee={
                                        viewer?.userId
                                            ? { name: viewer.name ?? "", email: viewer.email ?? "" }
                                            : null
                                    }
                                    tierChoices={
                                        competitions.length
                                            ? []
                                            : event.access?.allowTierSelfSelect
                                              ? (event.access.attendeeTiers ?? []).filter((t) => !(access.allowed && access.lockedTiers.includes(t)))
                                              : []
                                    }
                                />
                            )}
                        </div>
                    </div>
                </aside>
            </div>

            {/* Only on a hackathon, and only once the organizer has opened a
                track -- an empty tracks page is worse than no link. */}
            {hackathon && trackCount > 0 ? (
                <section className="mt-12 border-t border-line pt-8">
                    <h2 className="font-display text-lg text-ink">Tracks</h2>
                    <p className="mt-1 text-sm text-ink-soft">
                        This hackathon runs {trackCount} track{trackCount === 1 ? "" : "s"}, each with its own
                        team size, deadline and prizes.
                    </p>
                    <p className="mt-4">
                        <Link
                            href={`/events/${event.id}/tracks${code ? `?code=${encodeURIComponent(code)}` : ""}`}
                            className={buttonClass("secondary", "sm")}
                        >
                            See the tracks
                        </Link>
                    </p>
                </section>
            ) : null}

            <SponsorStrip organizations={organizations} sponsorTiers={event.sponsorTiers} />

            {/* Spec 9.4: the people best placed to notice a fake event are
                strangers browsing it, not the organizer who posted it. */}
            <div className="mt-12 border-t border-line pt-6">
                <ReportEvent action={reportEvent.bind(null, event.id)} />
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
