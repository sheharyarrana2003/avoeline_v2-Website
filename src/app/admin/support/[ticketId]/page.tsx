import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import PageHeader from "@/src/shared_components/ui/PageHeader";
import { Card, CardBody } from "@/src/shared_components/ui/Card";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { formatDateMedium } from "@/src/lib/datetime";
import { requireAdminArea } from "@/src/features/admin/guard";
import { getSupportTicketById } from "@/src/features/admin/admin.service";
import { listTicketMessages } from "@/src/features/admin/supportThread.service";
import { TicketThread } from "@/src/features/admin/components/SupportThread";
import { canManageArea } from "@/src/features/admin/types";

export default async function AdminSupportTicketPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const admin = await requireAdminArea("support");
  if (!admin) redirect("/admin/signin?next=/admin/support");

  const { ticketId } = await params;
  const ticket = await getSupportTicketById(ticketId);
  if (!ticket) notFound();

  const messages = await listTicketMessages(ticketId);

  return (
    <>
      <p className="mb-4 text-sm">
        <Link href="/admin/support" className="text-ink-soft hover:underline">
          ← Support queue
        </Link>
      </p>
      <PageHeader
        title={ticket.subject}
        description={`${ticket.fromEmail || "unknown"} · ${ticket.fromRole}${
          ticket.createdAt ? ` · ${formatDateMedium(ticket.createdAt)}` : ""
        }`}
        actions={<StatusBadge status={ticket.status} size="sm" />}
      />
      <Card>
        <CardBody>
          <TicketThread
            ticket={ticket}
            messages={messages}
            currentUserId={admin.userId}
            canManage={canManageArea(admin, "support")}
          />
        </CardBody>
      </Card>
    </>
  );
}
