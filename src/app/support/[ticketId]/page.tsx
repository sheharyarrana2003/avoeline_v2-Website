import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Card, CardBody } from "@/src/shared_components/ui/Card";
import { BrandMark } from "@/src/shared_components/ui/BrandMark";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { AuthService } from "@/src/features/auth/authService";
import { getSupportTicketById } from "@/src/features/admin/admin.service";
import { listTicketMessages } from "@/src/features/admin/supportThread.service";
import { TicketThread } from "@/src/features/admin/components/SupportThread";

export const metadata = { title: "Support ticket — Avoeline" };

export default async function SupportTicketPage({
  params,
}: {
  params: Promise<{ ticketId: string }>;
}) {
  const user = await AuthService.getCurrentUser();
  if (!user?.userId) redirect("/auth/signin?next=/support");

  const { ticketId } = await params;
  const ticket = await getSupportTicketById(ticketId);
  if (!ticket || ticket.fromUserId !== user.userId) notFound();

  const messages = await listTicketMessages(ticketId);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
      <Link
        href="/support"
        className="mb-8 inline-flex items-center gap-2 rounded-xs focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <BrandMark className="h-7 w-7" />
        <span className="text-2xs font-medium uppercase tracking-wider text-ink-soft">
          Back to support
        </span>
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-2xl text-ink">{ticket.subject}</h1>
        <StatusBadge status={ticket.status} size="sm" />
      </div>

      <div className="mt-8">
        <Card>
          <CardBody>
            <TicketThread
              ticket={ticket}
              messages={messages}
              currentUserId={user.userId}
              canManage={false}
            />
          </CardBody>
        </Card>
      </div>
    </main>
  );
}
