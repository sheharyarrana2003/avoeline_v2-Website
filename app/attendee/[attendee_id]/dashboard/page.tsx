import Link from "next/link";
import { notFound } from "next/navigation";
import { Award, Ticket } from "lucide-react";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { Card } from "@/src/shared_components/ui/Card";
import { DataTable, CellStack, type Column } from "@/src/shared_components/ui/DataTable";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { buttonClass } from "@/src/lib/ui";
import { formatDate } from "@/src/lib/datetime";
import { AuthService } from "@/src/features/auth/authService";
import { RegService } from "@/src/services/registeration.service";
import { CertificateService } from "@/src/services/certificate.service";
import { EventService } from "@/src/services/event.service";
import type { Registration } from "@/src/services/models/reg.type";
import type { CertificateDocument } from "@/src/services/models/certificate.model";
import { DownloadCertificate } from "@/src/features/certificates/components/DownloadCertificate";

type TicketRow = { reg: Registration; eventTitle: string };

export default async function AttendeeDashboard({
    params,
}: {
    params: Promise<{ attendee_id: string }>;
}) {
    const { attendee_id } = await params;
    const user = await AuthService.getCurrentUser();

    // The id is in the path, so it is caller-chosen. Reading someone else's
    // tickets must not be a matter of editing the URL.
    if (!user?.userId || user.userId !== attendee_id) notFound();

    const [regs, certificates] = await Promise.all([
        RegService.getRegsOfUser(attendee_id),
        CertificateService.certsForUser(attendee_id),
    ]);

    // Titles come from the events the registrations point at; a registration
    // stores an eventId, not a name.
    const titles = new Map<string, string>();
    await Promise.all(
        Array.from(new Set(regs.map((r) => r.eventId).filter(Boolean))).map(async (id) => {
            const event = await EventService.getEventByID(id).catch(() => null);
            if (event) titles.set(id, event.title);
        }),
    );

    const tickets: TicketRow[] = regs.map((reg) => ({
        reg,
        eventTitle: titles.get(reg.eventId) || "Event",
    }));

    const ticketColumns: Column<TicketRow>[] = [
        {
            key: "event",
            header: "Event",
            width: "w-[46%] max-w-0",
            cell: (t) => <CellStack primary={t.eventTitle} secondary={t.reg.pricingTier || undefined} />,
        },
        { key: "status", header: "Status", cell: (t) => <StatusBadge status={t.reg.status} size="sm" /> },
        { key: "registered", header: "Registered", align: "right", cell: (t) => formatDate(t.reg.createdAt) },
        {
            key: "actions",
            header: "",
            align: "right",
            cell: (t) => (
                <Link href={`/events/${t.reg.eventId}/ticket/${t.reg.registrationId}`} className={buttonClass("ghost", "sm")}>
                    View ticket
                </Link>
            ),
        },
    ];

    const certColumns: Column<CertificateDocument>[] = [
        {
            key: "title",
            header: "Certificate",
            width: "w-[46%] max-w-0",
            cell: (c) => <CellStack primary={c.content.eventTitle || c.title || "Certificate"} secondary={c.certificateId} />,
        },
        { key: "status", header: "Status", cell: (c) => <StatusBadge status={c.status} size="sm" /> },
        { key: "role", header: "Role", cell: (c) => c.content.role || "Attendee" },
        { key: "issued", header: "Issued", align: "right", cell: (c) => formatDate(c.issuedAt || c.createdAt) },
        {
            key: "download",
            header: "",
            align: "right",
            cell: (c) =>
                c.digital?.pdfPath ? (
                    <DownloadCertificate certificateId={c.certificateId} />
                ) : (
                    <span className="text-2xs uppercase text-ink-faint">No PDF</span>
                ),
        },
    ];

    return (
        <>
            <PageHeader
                title="My events"
                description="Everything you have registered for, and the certificates you have earned."
            />

            <div className="space-y-8">
                <Card title="Tickets">
                    <DataTable
                        caption="Your registrations"
                        rows={tickets}
                        columns={ticketColumns}
                        getKey={(t) => t.reg.registrationId}
                        empty={
                            <div className="p-6">
                                <EmptyState
                                    icon={<Ticket size={28} />}
                                    title="No registrations yet"
                                    description="Events you register for will appear here with their ticket."
                                />
                            </div>
                        }
                    />
                </Card>

                <Card title="Certificates">
                    <DataTable
                        caption="Your certificates"
                        rows={certificates}
                        columns={certColumns}
                        getKey={(c) => c.certificateId}
                        empty={
                            <div className="p-6">
                                <EmptyState
                                    icon={<Award size={28} />}
                                    title="No certificates yet"
                                    description="Once an organizer issues a certificate for an event you attended, it appears here."
                                />
                            </div>
                        }
                    />
                </Card>
            </div>
        </>
    );
}
