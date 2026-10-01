import Link from "next/link";
import { redirect } from "next/navigation";
import { LifeBuoy } from "lucide-react";
import { Card, CardBody } from "@/src/shared_components/ui/Card";
import { BrandMark } from "@/src/shared_components/ui/BrandMark";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { formatDateMedium } from "@/src/lib/datetime";
import { AuthService } from "@/src/features/auth/authService";
import { ticketsForUser } from "@/src/features/admin/admin.service";
import { NewTicketForm } from "@/src/features/admin/components/SupportForms";
import { submitTicket } from "@/src/features/admin/actions/support.action";

export const metadata = { title: "Support — Avoeline" };

/**
 * Spec 9.7's other half: where a ticket comes from.
 *
 * The spec asks for the admin's list, but a list nothing can write to would be
 * permanently empty and therefore a fake. One route for all three roles rather
 * than three, because the form is identical and the role is taken from the
 * session anyway.
 *
 * Sign-in is required, so an attendee who registered without an account cannot
 * file one. An open endpoint would be a spam vector with no way to answer it,
 * and every such attendee holds a ticket page carrying the organizer's own
 * contact details.
 */
export default async function SupportPage() {
    const user = await AuthService.getCurrentUser();
    if (!user?.userId) redirect("/auth/signin?next=/support");

    const tickets = await ticketsForUser(user.userId);

    return (
        <main className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
            <Link href="/" className="mb-8 inline-flex items-center gap-2 rounded-xs focus-visible:outline-2 focus-visible:outline-offset-2">
                <BrandMark className="h-7 w-7" />
                <span className="text-2xs font-medium uppercase tracking-wider text-ink-soft">Avoeline</span>
            </Link>

            <h1 className="flex items-center gap-2 font-display text-2xl text-ink">
                <LifeBuoy className="h-5 w-5" aria-hidden="true" />
                Support
            </h1>
            <p className="mt-1 text-sm text-ink-soft">
                Tell us what is wrong and it goes to the Avoeline team. You can follow it here.
            </p>

            <div className="mt-8">
                <Card title="Raise a request">
                    <CardBody>
                        <NewTicketForm
                            action={submitTicket}
                            email={user.email ?? ""}
                            role={String(user.userType ?? "attendee")}
                        />
                    </CardBody>
                </Card>
            </div>

            {tickets.length ? (
                <div className="mt-8">
                    <Card title="Your requests">
                        <CardBody>
                            <ul className="divide-y divide-line">
                                {tickets.map((ticket) => (
                                    <li key={ticket.id} className="py-4 first:pt-0 last:pb-0">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <span className="text-sm font-medium text-ink">{ticket.subject}</span>
                                            <StatusBadge status={ticket.status} size="sm" />
                                        </div>
                                        <p className="mt-1 whitespace-pre-line text-sm text-ink-soft">{ticket.body}</p>
                                        <p className="mt-1 text-2xs uppercase text-ink-faint">
                                            {ticket.createdAt ? formatDateMedium(ticket.createdAt) : ""}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        </CardBody>
                    </Card>
                </div>
            ) : null}
        </main>
    );
}
