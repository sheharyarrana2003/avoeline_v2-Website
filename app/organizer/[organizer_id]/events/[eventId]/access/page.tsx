import { notFound } from "next/navigation";
import { Mail, Ticket, UserCheck } from "lucide-react";
import { Card, CardBody } from "@/src/shared_components/ui/Card";
import { DataTable, CellStack, type Column } from "@/src/shared_components/ui/DataTable";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { ConfirmSubmit } from "@/src/shared_components/ui/ConfirmDialog";
import { buttonClass } from "@/src/lib/ui";
import { formatDate, formatDateTime } from "@/src/lib/datetime";
import { absoluteUrl } from "@/src/lib/appUrl";
import { assertOwnedEvent } from "@/src/features/events/ownership";
import { getEventGuestList, accessTypeOf } from "@/src/features/access/access.service";
import { AccessSettingsForm } from "@/src/features/access/components/AccessSettingsForm";
import { GuestListPanel } from "@/src/features/access/components/GuestListPanel";
import { removeGuest } from "@/src/features/access/actions/guestList.action";
import type { EventInvite } from "@/src/features/access/types";

export default async function EventAccessPage({
    params,
}: {
    params: Promise<{ organizer_id: string; eventId: string }>;
}) {
    const { eventId } = await params;

    // The whole page is organizer-only and shows invite tokens, so ownership is
    // checked before anything is read.
    const event = await assertOwnedEvent(eventId);
    if (!event) notFound();

    const guests = await getEventGuestList(eventId);
    const origin = await absoluteUrl(`/events/${eventId}`);

    const columns: Column<EventInvite>[] = [
        {
            key: "who",
            header: "Guest",
            width: "w-[34%] max-w-0",
            cell: (g) => <CellStack primary={g.email} secondary={g.name || undefined} />,
        },
        {
            key: "kind",
            header: "Type",
            cell: (g) => (
                <span className="text-2xs font-medium uppercase text-ink-soft">
                    {g.kind === "invite" ? "Invite" : "Whitelist"}
                </span>
            ),
        },
        { key: "tier", header: "Tier", cell: (g) => g.tier || "—" },
        {
            key: "state",
            header: "State",
            cell: (g) => (
                <StatusBadge
                    status={g.registeredAt ? "confirmed" : g.openedAt ? "in_progress" : "pending"}
                    label={g.registeredAt ? "Registered" : g.openedAt ? "Opened" : "Not opened"}
                    size="sm"
                />
            ),
        },
        {
            key: "limits",
            header: "Limits",
            cell: (g) =>
                [g.expiresAt ? `Expires ${formatDate(g.expiresAt)}` : "", g.singleUse ? "Single use" : ""]
                    .filter(Boolean)
                    .join(" · ") || "—",
        },
        {
            key: "actions",
            header: "",
            align: "right",
            cell: (g) => (
                <div className="flex items-center justify-end gap-2">
                    {g.token ? (
                        // Shown as text, not a link: it is the credential, and the
                        // organizer's job here is to copy it to the right person.
                        <code className="max-w-40 truncate rounded bg-muted px-1.5 py-0.5 text-2xs text-ink-soft">
                            {`${origin}?invite=${g.token}`}
                        </code>
                    ) : null}
                    <form action={removeGuest}>
                        <input type="hidden" name="eventId" value={eventId} />
                        <input type="hidden" name="guestId" value={g.id} />
                        <ConfirmSubmit
                            title={`Remove ${g.email}?`}
                            description={
                                g.kind === "invite"
                                    ? "Their invite link stops working immediately. Anyone who already registered with it keeps their place."
                                    : "They will no longer be able to register, unless the event is open to everyone."
                            }
                            confirmLabel="Remove guest"
                            className={buttonClass("destructive", "sm")}
                        >
                            Remove
                        </ConfirmSubmit>
                    </form>
                </div>
            ),
        },
    ];

    const registered = guests.filter((g) => g.registeredAt).length;
    const opened = guests.filter((g) => g.openedAt).length;

    return (
        <div className="space-y-10">
            <div className="grid gap-10 lg:grid-cols-2">
                <Card title="Access">
                    <CardBody>
                        <AccessSettingsForm
                            eventId={eventId}
                            visibility={accessTypeOf(event)}
                            accessCode={event.accessCode}
                            access={event.access}
                        />
                    </CardBody>
                </Card>

                <Card title="Add guests">
                    <CardBody>
                        <GuestListPanel eventId={eventId} />
                    </CardBody>
                </Card>
            </div>

            <Card
                title="Guest list"
                action={
                    <span className="text-2xs uppercase text-ink-soft tabular-nums">
                        {guests.length} total · {opened} opened · {registered} registered
                    </span>
                }
            >
                <DataTable
                    caption="Whitelist entries and invites"
                    rows={guests}
                    columns={columns}
                    getKey={(g) => g.id}
                    empty={
                        <div className="p-6">
                            <EmptyState
                                icon={<Mail size={28} />}
                                title="No guests yet"
                                description="Whitelist addresses to control who may register, or issue invite links you can track."
                            />
                        </div>
                    }
                />
            </Card>
        </div>
    );
}
