import Link from "next/link";
import { Handshake } from "lucide-react";
import { Card, CardBody } from "@/src/shared_components/ui/Card";
import { BrandMark } from "@/src/shared_components/ui/BrandMark";
import { buttonClass } from "@/src/lib/ui";
import { AuthService } from "@/src/features/auth/authService";
import { EventService } from "@/src/services/event.service";
import { findCollaboratorByToken } from "@/src/features/organizations/organizations.service";
import { AcceptCollaboration } from "@/src/features/organizations/components/AcceptCollaboration";

export const metadata = { title: "Collaboration invitation — Avoeline" };

/**
 * Where a collaborator accepts their invitation (spec 5.2).
 *
 * Unauthenticated by construction — `proxy.ts` matches only the role prefixes —
 * because the invitee may not have an account yet. The page explains what to do
 * in that case rather than bouncing them to a sign-in form with no context; the
 * accept action is what enforces the account requirement.
 *
 * A spent or unknown token is not distinguished from an accepted one: both say
 * the link is no longer usable, so the page cannot be used to probe which tokens
 * exist.
 */
export default async function CollaboratePage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;

    const invite = await findCollaboratorByToken(token);
    const event = invite ? await EventService.getEventByID(invite.eventId) : null;
    const user = await AuthService.getCurrentUser();
    const isOrganizer = String(user?.userType ?? "").trim().toLowerCase() === "organizer";

    return (
        <main className="mx-auto w-full max-w-md px-4 py-16 sm:px-6">
            <Link href="/" className="mb-8 inline-flex items-center gap-2 rounded-xs focus-visible:outline-2 focus-visible:outline-offset-2">
                <BrandMark className="h-7 w-7" />
                <span className="text-2xs font-medium uppercase tracking-wider text-ink-soft">Avoeline</span>
            </Link>

            <Card tone="raised">
                <CardBody>
                    <div className="mb-4 flex items-center gap-2">
                        <Handshake size={18} className="text-ink-faint" aria-hidden="true" />
                        <h1 className="font-display text-lg text-ink">Collaboration invitation</h1>
                    </div>

                    {!invite || !event ? (
                        <p className="text-sm text-ink-soft">
                            This invitation link is no longer usable. Ask the organizer to send a new one.
                        </p>
                    ) : (
                        <>
                            <p className="text-sm text-ink-soft">
                                You have been invited to collaborate on <strong className="text-ink">{event.title}</strong> as{" "}
                                <strong className="text-ink">{invite.name}</strong>
                                {invite.role === "full" ? ", with full access to its dashboard." : ", limited to one track."}
                            </p>

                            {!user ? (
                                <div className="mt-5 flex flex-col gap-3">
                                    <p className="text-sm text-ink">
                                        Sign in with an organizer account to accept, or create one first.
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        <Link href={`/auth/signin?next=/collaborate/${token}`} className={buttonClass("primary")}>
                                            Sign in
                                        </Link>
                                        <Link href="/auth/signup" className={buttonClass("secondary")}>
                                            Create an account
                                        </Link>
                                    </div>
                                </div>
                            ) : !isOrganizer ? (
                                <p className="mt-5 text-sm text-ink">
                                    You are signed in as a {String(user.userType).toLowerCase()}. Collaborator access needs an
                                    organizer account, because the event dashboard is only open to that role.
                                </p>
                            ) : (
                                <div className="mt-5">
                                    <AcceptCollaboration token={token} organizerId={user.userId} />
                                </div>
                            )}
                        </>
                    )}
                </CardBody>
            </Card>
        </main>
    );
}
