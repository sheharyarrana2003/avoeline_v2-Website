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
import { GuestEmailComposer } from "@/src/features/access/components/GuestEmailComposer";
import { removeGuest, revokeInvite } from "@/src/features/access/actions/guestList.action";
import {
  inviteDisplayStatus,
  type EventInvite,
  type InviteDisplayStatus,
} from "@/src/features/access/types";
import { eventIsHackathon } from "@/src/features/hackathon/hackathon.service";
import { TiersPromosOnAccess } from "@/src/features/ticketing/components/TiersPromosOnAccess";
import { requireConnectedSender } from "@/src/features/email/organizerTransport.service";
import Link from "next/link";

function statusBadgeProps(status: InviteDisplayStatus): {
  status: "confirmed" | "in_progress" | "pending" | "cancelled" | "rejected";
  label: string;
} {
  switch (status) {
    case "registered":
      return { status: "confirmed", label: "Registered" };
    case "opened":
      return { status: "in_progress", label: "Opened" };
    case "expired":
      return { status: "cancelled", label: "Expired" };
    case "revoked":
      return { status: "rejected", label: "Revoked" };
    case "not_registered":
      return { status: "pending", label: "Not registered" };
    default:
      return { status: "pending", label: "Pending" };
  }
}

export default async function EventAccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ organizer_id: string; eventId: string }>;
  searchParams?: Promise<{ e?: string; ok?: string }>;
}) {
  const { eventId, organizer_id } = await params;
  const sp = searchParams ? await searchParams : {};

  const event = await assertEventActor(eventId, "access");
  if (!event) notFound();

  const guests = await getEventGuestList(eventId);
  const origin = await absoluteUrl(`/events/${eventId}`);
  const sender = await requireConnectedSender(event.organizerId, { eventId });

  const accessType = accessTypeOf(event);
  const showWhitelistTools =
    accessType === "private" || accessType === "hybrid" || accessType === "tiered";
  const showInviteTools = accessType === "invite_only" || accessType === "tiered";
  const showGuests = showWhitelistTools || showInviteTools;
  const showGatedNote = accessType === "hybrid";
  const guestKinds: Array<"whitelist" | "invite"> = [
    ...(showWhitelistTools ? (["whitelist"] as const) : []),
    ...(showInviteTools ? (["invite"] as const) : []),
  ];

  const whitelist = guests.filter((g) => g.kind === "whitelist");
  const invites = guests.filter((g) => g.kind === "invite");
  const registered = guests.filter((g) => g.registeredAt).length;
  const opened = invites.filter((g) => g.openedAt && !g.registeredAt).length;

  const whitelistColumns: Column<EventInvite>[] = [
    {
      key: "who",
      header: "Guest",
      width: "w-[40%] max-w-0",
      cell: (g) => <CellStack primary={g.email} secondary={g.name || undefined} />,
    },
    {
      key: "tier",
      header: "Tier",
      cell: (g) => g.tier || "—",
    },
    {
      key: "state",
      header: "Status",
      cell: (g) => {
        const props = statusBadgeProps(inviteDisplayStatus(g));
        return <StatusBadge status={props.status} label={props.label} size="sm" />;
      },
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (g) => (
        <form action={removeGuest}>
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="guestId" value={g.id} />
          <ConfirmSubmit
            title={`Remove ${g.email}?`}
            description="They will no longer be able to register, unless the event is open to everyone."
            confirmLabel="Remove guest"
            className={buttonClass("destructive", "sm")}
          >
            Remove
          </ConfirmSubmit>
        </form>
      ),
    },
  ];

  const inviteColumns: Column<EventInvite>[] = [
    {
      key: "who",
      header: "Guest",
      width: "w-[28%] max-w-0",
      cell: (g) => <CellStack primary={g.email} secondary={g.name || undefined} />,
    },
    ...(accessType === "tiered"
      ? [
          {
            key: "tier",
            header: "Tier",
            cell: (g: EventInvite) => g.tier || "—",
          } satisfies Column<EventInvite>,
        ]
      : []),
    {
      key: "state",
      header: "Status",
      cell: (g) => {
        const props = statusBadgeProps(inviteDisplayStatus(g));
        return <StatusBadge status={props.status} label={props.label} size="sm" />;
      },
    },
    {
      key: "limits",
      header: "Expiry",
      cell: (g) =>
        [g.expiresAt ? `Expires ${formatDate(g.expiresAt)}` : "", g.singleUse ? "Single use" : ""]
          .filter(Boolean)
          .join(" · ") || "—",
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (g) => {
        const display = inviteDisplayStatus(g);
        const link = g.token ? `${origin}?invite=${g.token}` : null;
        return (
          <div className="flex flex-wrap items-center justify-end gap-2">
            {link && display !== "revoked" ? (
              <code className="max-w-40 truncate rounded bg-muted px-1.5 py-0.5 text-2xs text-ink-soft">
                {link}
              </code>
            ) : null}
            {display !== "revoked" && display !== "registered" ? (
              <form action={revokeInvite}>
                <input type="hidden" name="eventId" value={eventId} />
                <input type="hidden" name="guestId" value={g.id} />
                <ConfirmSubmit
                  title={`Revoke invite for ${g.email}?`}
                  description="Their invite link stops working immediately. Anyone who already registered keeps their place."
                  confirmLabel="Revoke invite"
                  className={buttonClass("secondary", "sm")}
                >
                  Revoke
                </ConfirmSubmit>
              </form>
            ) : null}
            <form action={removeGuest}>
              <input type="hidden" name="eventId" value={eventId} />
              <input type="hidden" name="guestId" value={g.id} />
              <ConfirmSubmit
                title={`Delete ${g.email}?`}
                description="Removes the row from the list entirely."
                confirmLabel="Delete"
                className={buttonClass("destructive", "sm")}
              >
                Delete
              </ConfirmSubmit>
            </form>
          </div>
        );
      },
    },
  ];

  const hackathon = await eventIsHackathon(event);
  const showTiersPromos = event.requiresRegistration !== false;
  let step = 1;

  return (
    <div className="space-y-10">
      <HowAccessWorks />

      <Card title={`Step ${step++} — Access settings`}>
        <CardBody>
          <AccessSettingsForm
            eventId={eventId}
            visibility={accessType}
            accessCode={event.accessCode}
            access={event.access}
          />
          {showGatedNote ? (
            <p className="mt-3 text-xs text-ink-soft">
              Hybrid: pick gated tiers in the form above. Guests unlock those tiers via whitelist or
              access code; a validated invite link also unlocks them.
            </p>
          ) : null}
          <p className="mt-4 text-xs text-ink-soft">
            Custom registration questions live on the{" "}
            <Link
              href={`/organizer/${organizer_id}/events/${eventId}/attendees`}
              className="underline underline-offset-2"
            >
              Attendees
            </Link>{" "}
            tab (Registration form).
          </p>
        </CardBody>
      </Card>

      {showGuests ? (
        <Card
          title={`Step ${step++} — ${
            showInviteTools && !showWhitelistTools
              ? "Invites"
              : showWhitelistTools && !showInviteTools
                ? "Whitelist"
                : "Guests"
          }`}
        >
          <CardBody>
            <GuestListPanel eventId={eventId} kinds={guestKinds} />
          </CardBody>
        </Card>
      ) : null}

      {showGuests ? (
        <Card title={`Step ${step++} — Email guests`}>
          <CardBody>
            <GuestEmailComposer
              eventId={eventId}
              organizerId={event.organizerId}
              eventUrl={origin}
              guests={guests.map((g) => ({
                id: g.id,
                email: g.email,
                name: g.name,
                kind: g.kind,
                token: g.token,
                openedAt: g.openedAt,
                registeredAt: g.registeredAt,
                revokedAt: g.revokedAt,
                expiresAt: g.expiresAt,
                singleUse: g.singleUse,
              }))}
              senderConnected={!!sender.connected}
            />
          </CardBody>
        </Card>
      ) : null}

      {showTiersPromos ? (
        <TiersPromosOnAccess
          eventId={eventId}
          organizerId={organizer_id}
          error={sp.e}
          success={sp.ok}
          isHackathon={hackathon}
          title={`Step ${step++} — Tiers & promos`}
        />
      ) : null}

      {showWhitelistTools ? (
        <Card
          title="Whitelist"
          action={
            <span className="text-2xs uppercase text-ink-soft tabular-nums">
              {whitelist.length} total · {whitelist.filter((g) => g.registeredAt).length} registered
            </span>
          }
        >
          <DataTable
            caption="Whitelist entries"
            rows={whitelist}
            columns={whitelistColumns}
            getKey={(g) => g.id}
            empty={
              <div className="p-6">
                <EmptyState
                  icon={<Mail size={28} />}
                  title="No whitelist yet"
                  description="Add addresses that may register for this event."
                />
              </div>
            }
          />
        </Card>
      ) : null}

      {showInviteTools ? (
        <Card
          title="Invite links"
          action={
            <span className="text-2xs uppercase text-ink-soft tabular-nums">
              {invites.length} total · {opened} opened · {registered} registered
            </span>
          }
        >
          <div className="border-b border-line px-5 py-3 text-xs text-ink-soft">
            Pending → Opened → Registered. Expired and revoked are derived at read.
          </div>
          <DataTable
            caption="Invite links"
            rows={invites}
            columns={inviteColumns}
            getKey={(g) => g.id}
            empty={
              <div className="p-6">
                <EmptyState
                  icon={<Mail size={28} />}
                  title="No invites yet"
                  description="Create personal invite links you can track and revoke."
                />
              </div>
            }
          />
        </Card>
      ) : null}
    </div>
  );
}
