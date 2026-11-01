import { notFound } from "next/navigation";
import { Mail } from "lucide-react";
import { Card, CardBody } from "@/src/shared_components/ui/Card";
import { DataTable, CellStack, type Column } from "@/src/shared_components/ui/DataTable";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { ConfirmSubmit } from "@/src/shared_components/ui/ConfirmDialog";
import { buttonClass } from "@/src/lib/ui";
import { formatDate } from "@/src/lib/datetime";
import { absoluteUrl } from "@/src/lib/appUrl";
import { assertEventActor } from "@/src/features/events/ownership";
import { getEventGuestList, accessTypeOf } from "@/src/features/access/access.service";
import { AccessSettingsForm } from "@/src/features/access/components/AccessSettingsForm";
import { GuestListPanel } from "@/src/features/access/components/GuestListPanel";
import { HowAccessWorks } from "@/src/features/access/components/HowAccessWorks";
import { removeGuest } from "@/src/features/access/actions/guestList.action";
import type { EventInvite } from "@/src/features/access/types";
import { eventIsHackathon } from "@/src/features/hackathon/hackathon.service";
import { TiersPromosOnAccess } from "@/src/features/ticketing/components/TiersPromosOnAccess";
import { RegistrationQuestionsCard } from "@/src/features/registration/forms/components/RegistrationQuestionsCard";

export default async function EventAccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ organizer_id: string; eventId: string }>;
  searchParams?: Promise<{ e?: string; ok?: string }>;
}) {
  const { eventId, organizer_id } = await params;
  const sp = searchParams ? await searchParams : {};

  // Access page shows invite tokens — require owner/manager or page_access staff.
  const event = await assertEventActor(eventId, "access");
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
    {
      key: "tier",
      header: "Tier",
      cell: (g) => (g.kind === "whitelist" ? g.tier || "—" : "—"),
    },
    {
      key: "state",
      header: "Status",
      cell: (g) =>
        g.kind === "invite" ? (
          <StatusBadge
            status={g.registeredAt ? "confirmed" : g.openedAt ? "in_progress" : "pending"}
            label={g.registeredAt ? "Registered" : g.openedAt ? "Opened" : "Pending"}
            size="sm"
          />
        ) : (
          <StatusBadge
            status={g.registeredAt ? "confirmed" : "pending"}
            label={g.registeredAt ? "Registered" : "Not registered"}
            size="sm"
          />
        ),
    },
    {
      key: "limits",
      header: "Expiry",
      cell: (g) =>
        g.kind === "invite"
          ? [
              g.expiresAt ? `Expires ${formatDate(g.expiresAt)}` : "",
              g.singleUse ? "Single use" : "",
            ]
              .filter(Boolean)
              .join(" · ") || "—"
          : "—",
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
  const opened = guests.filter((g) => g.kind === "invite" && g.openedAt).length;
  const hackathon = await eventIsHackathon(event);
  const showTiersPromos = event.requiresRegistration !== false;

  return (
    <div className="space-y-10">
      <HowAccessWorks />
      <div className="grid gap-10 lg:grid-cols-2">
        <Card title="Access settings">
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

      {showTiersPromos ? (
        <>
          <RegistrationQuestionsCard eventId={eventId} />
          <TiersPromosOnAccess
            eventId={eventId}
            organizerId={organizer_id}
            error={sp.e}
            success={sp.ok}
            isHackathon={hackathon}
          />
        </>
      ) : null}

      <Card
        title="Guest list"
        action={
          <span className="text-2xs uppercase text-ink-soft tabular-nums">
            {guests.length} total · {opened} opened · {registered} registered
          </span>
        }
      >
        <div className="border-b border-line px-5 py-3 text-xs text-ink-soft">
          <p>
            <span className="font-medium text-ink">Whitelist:</span> Not registered → Registered.{" "}
            <span className="font-medium text-ink">Invite link:</span> Pending → Opened →
            Registered.
          </p>
        </div>
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
