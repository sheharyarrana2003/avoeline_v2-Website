import { notFound } from "next/navigation";
import { LifeBuoy } from "lucide-react";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { Card, CardBody } from "@/src/shared_components/ui/Card";
import { FilterTabs } from "@/src/shared_components/ui/FilterTabs";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { formatDateMedium } from "@/src/lib/datetime";
import { requireAdminArea } from "@/src/features/admin/guard";
import { listSupportTickets } from "@/src/features/admin/admin.service";
import { queueOrder, queueSummary, TICKET_STATUSES } from "@/src/features/admin/types";
import { TicketControls } from "@/src/features/admin/components/SupportForms";
import { updateTicket } from "@/src/features/admin/actions/support.action";

/**
 * Spec 9.7's support queue.
 *
 * Ordered open first and newest within a status, so a ticket nobody has looked
 * at is never buried under a pile of resolved ones — which a plain
 * date sort would do within a week.
 */
export default async function AdminSupportPage({
    searchParams,
}: {
    searchParams: Promise<{ status?: string }>;
}) {
    if (!(await requireAdminArea("support"))) notFound();

    const sp = await searchParams;
    const tab = TICKET_STATUSES.includes(sp.status as never) ? sp.status! : "all";

    const all = await listSupportTickets();
    const tickets = queueOrder(tab === "all" ? all : all.filter((t) => t.status === tab));

    const tabs = [
        { label: "All", value: "all", href: "/admin/support", count: all.length },
        ...TICKET_STATUSES.map((status) => ({
            label: status === "in_progress" ? "In progress" : status === "open" ? "Open" : "Resolved",
            value: status,
            href: `/admin/support?status=${status}`,
            count: all.filter((t) => t.status === status).length,
        })),
    ];

    return (
        <>
            <PageHeader title="Support" description={queueSummary(all)} />

            <FilterTabs tabs={tabs} activeValue={tab} label="Support ticket filters" />

            <div className="mt-6 space-y-4">
                {tickets.length === 0 ? (
                    <EmptyState
                        icon={<LifeBuoy className="h-5 w-5" />}
                        title={tab === "all" ? "No tickets yet" : "Nothing in this state"}
                        description="Organizers, vendors and attendees raise these from /support."
                    />
                ) : (
                    tickets.map((ticket) => (
                        <Card key={ticket.id}>
                            <CardBody>
                                <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h2 className="font-display text-base text-ink">{ticket.subject}</h2>
                                            <StatusBadge status={ticket.status} size="sm" />
                                        </div>
                                        <p className="mt-1 text-2xs uppercase text-ink-faint">
                                            {ticket.fromEmail || "unknown sender"} · {ticket.fromRole}
                                            {ticket.createdAt ? ` · ${formatDateMedium(ticket.createdAt)}` : ""}
                                        </p>
                                        <p className="mt-3 whitespace-pre-line text-sm text-ink-soft">{ticket.body}</p>
                                    </div>
                                    <div className="border-t border-line pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                                        <TicketControls ticket={ticket} action={updateTicket} />
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                    ))
                )}
            </div>
        </>
    );
}
