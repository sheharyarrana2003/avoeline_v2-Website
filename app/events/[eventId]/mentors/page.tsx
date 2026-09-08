import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock, Users } from "lucide-react";
import { Card, CardBody } from "@/src/shared_components/ui/Card";
import { BrandMark } from "@/src/shared_components/ui/BrandMark";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { buttonClass } from "@/src/lib/ui";
import { getEventForVisitor } from "@/src/features/registration/registration.service";
import { isHackathon, listMentors } from "@/src/features/hackathon/hackathon.service";
import { openSlots, sortSlots } from "@/src/features/hackathon/live";
import { MentorSignUpForm } from "@/src/features/hackathon/components/MentorForms";
import { signUpMentor } from "@/src/features/hackathon/actions/live.action";

export const metadata = { title: "Mentors — Avoeline" };

/**
 * Spec 3.4's mentor sign-up.
 *
 * The one write in this module with nobody signed in behind it, so it sits
 * behind module 2's access gate: on a private hackathon the code is required
 * here exactly as it is to register, which is what stops the form being an open
 * door for whoever finds the URL. The action re-decides that itself.
 */
export default async function MentorsPage({
    params,
    searchParams,
}: {
    params: Promise<{ eventId: string }>;
    searchParams: Promise<{ code?: string }>;
}) {
    const { eventId } = await params;
    const { code } = await searchParams;

    const { event, access } = await getEventForVisitor(eventId, { code: code ?? null });
    if (!event || !isHackathon(event)) notFound();

    const eventHref = `/events/${eventId}${code ? `?code=${encodeURIComponent(code)}` : ""}`;

    if (!access.allowed) {
        return (
            <main className="mx-auto w-full max-w-lg px-4 py-16 sm:px-6">
                <Card tone="raised">
                    <CardBody>
                        <div className="flex items-start gap-3">
                            <span aria-hidden="true" className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-ink">
                                <Lock className="h-5 w-5" />
                            </span>
                            <div>
                                <h1 className="font-display text-lg text-ink">This hackathon is private</h1>
                                <p className="mt-1 text-sm text-ink-soft">
                                    Open the event page and enter its access code to offer your time.
                                </p>
                            </div>
                        </div>
                        <p className="mt-6">
                            <Link href={eventHref} className={buttonClass("primary", "sm")}>
                                Go to the event
                            </Link>
                        </p>
                    </CardBody>
                </Card>
            </main>
        );
    }

    const mentors = await listMentors(eventId);

    return (
        <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
            <Link href="/" className="mb-8 inline-flex items-center gap-2 rounded-xs focus-visible:outline-2 focus-visible:outline-offset-2">
                <BrandMark className="h-7 w-7" />
                <span className="text-2xs font-medium uppercase tracking-wider text-ink-soft">Avoeline</span>
            </Link>

            <h1 className="font-display text-2xl text-ink">Mentor at {event.title}</h1>
            <p className="mt-1 text-sm text-ink-soft">
                Offer the hours you are free and teams book a slot with you directly. No account needed.
            </p>

            <div className="mt-8">
                <Card title="Offer your time">
                    <CardBody>
                        <MentorSignUpForm accessCode={code ?? null} action={signUpMentor.bind(null, eventId)} />
                    </CardBody>
                </Card>
            </div>

            {mentors.length ? (
                <div className="mt-10">
                    <Card title={`Mentors so far (${mentors.length})`}>
                        <CardBody>
                            <ul className="divide-y divide-line">
                                {mentors.map((mentor) => {
                                    const free = openSlots(mentor);
                                    return (
                                        <li key={mentor.id} className="py-4 first:pt-0 last:pb-0">
                                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                                                <span className="text-sm font-medium text-ink">{mentor.name}</span>
                                                <StatusBadge
                                                    status={free.length ? "open" : "booked"}
                                                    label={free.length ? `${free.length} free` : "fully booked"}
                                                    size="sm"
                                                />
                                            </div>
                                            {/* Deliberately no email address: this page is
                                                open to anybody with the event's code, and a
                                                mentor gave theirs to be contacted through
                                                the platform, not to be listed publicly. */}
                                            {mentor.expertise.length ? (
                                                <p className="mt-0.5 text-2xs uppercase text-ink-faint">
                                                    {mentor.expertise.join(" · ")}
                                                </p>
                                            ) : null}
                                            {mentor.bio ? (
                                                <p className="mt-1 text-xs text-ink-soft">{mentor.bio}</p>
                                            ) : null}
                                            {mentor.slots.length ? (
                                                <p className="mt-2 text-xs text-ink-soft tabular-nums">
                                                    {sortSlots(mentor.slots)
                                                        .map(
                                                            (s) =>
                                                                `${s.date} ${s.startTime}${s.bookedByTeamId ? " (booked)" : ""}`,
                                                        )
                                                        .join(" · ")}
                                                </p>
                                            ) : null}
                                        </li>
                                    );
                                })}
                            </ul>
                        </CardBody>
                    </Card>
                </div>
            ) : (
                <div className="mt-10">
                    <Card>
                        <CardBody>
                            <p className="text-sm text-ink-soft">
                                <Users className="mr-2 inline h-4 w-4" aria-hidden="true" />
                                Nobody has offered times yet. Be the first.
                            </p>
                        </CardBody>
                    </Card>
                </div>
            )}
        </main>
    );
}
