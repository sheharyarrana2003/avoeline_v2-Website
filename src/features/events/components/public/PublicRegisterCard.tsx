import { Users } from "lucide-react";
import { formatDateMedium } from "@/src/lib/datetime";
import { formatCurrency } from "@/src/lib/money";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { RegistrationForm } from "@/src/features/registration/components/RegistrationForm";
import type { EventFormField } from "@/src/features/registration/forms/formFields.types";
import type { PublicEventDto, RegisterButtonState } from "@/src/features/events/types";

type Props = {
  dto: PublicEventDto;
  preview: boolean;
  inviteToken?: string | null;
  accessCode?: string | null;
  attendee?: { name?: string; email?: string } | null;
};

export function PublicRegisterCard({
  dto,
  preview,
  inviteToken = null,
  accessCode = null,
  attendee = null,
}: Props) {
  const state = dto.registerState;
  const formFields = dtoToFormFields(dto);

  return (
    <div className="rounded-2xl border border-line bg-paper p-6 shadow-sm">
      <p className="text-2xs font-medium uppercase text-ink-soft">
        {dto.isHackathon ? "Ticket" : "Admission"}
      </p>
      <p className="mt-1 font-display text-2xl text-ink">{dto.admissionLabel}</p>

      {dto.pricingTiers.length > 0 && !dto.isHackathon ? (
        <ul className="mt-4 space-y-2 border-t border-line pt-4">
          {dto.pricingTiers.map((t) => (
            <li key={t.id} className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-ink">
                {t.name}
                {t.availableUntil ? (
                  <span className="ml-1 text-2xs text-ink-soft">
                    until {formatDateMedium(t.availableUntil)}
                  </span>
                ) : null}
                {t.seatsLeft != null ? (
                  <span className="ml-1 text-2xs text-ink-soft">{t.seatsLeft} left</span>
                ) : null}
              </span>
              <span className="tabular-nums text-ink-soft">
                {formatCurrency(t.price, dto.currency, "Free")}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-6">
        <RegisterBody
          state={state}
          dto={dto}
          preview={preview}
          formFields={formFields}
          inviteToken={inviteToken}
          accessCode={accessCode}
          attendee={attendee}
        />
      </div>
    </div>
  );
}

function RegisterBody({
  state,
  dto,
  preview,
  formFields,
  inviteToken,
  accessCode,
  attendee,
}: {
  state: RegisterButtonState;
  dto: PublicEventDto;
  preview: boolean;
  formFields: EventFormField[];
  inviteToken: string | null;
  accessCode: string | null;
  attendee: { name?: string; email?: string } | null;
}) {
  if (state === "admin_preview" || (preview && dto.lifecycle === "draft")) {
    return (
      <p className="rounded-lg border border-warning-line bg-warning-soft px-3 py-2 text-sm text-ink">
        Admin preview — registration is not available while this event is a draft.
      </p>
    );
  }

  if (state === "no_registration") {
    return (
      <p className="text-sm text-ink-soft">
        This event does not take registrations. Details are listed on this page.
      </p>
    );
  }

  if (state === "ended") {
    return (
      <p className="rounded-lg border border-line bg-muted px-3 py-2 text-sm text-ink-soft">
        This event has ended. Registration is closed.
      </p>
    );
  }

  if (state === "opens_at") {
    const when = dto.registerOpensAt
      ? formatDateMedium(dto.registerOpensAt)
      : formatDateMedium(dto.registrationOpenDate);
    return (
      <p className="rounded-lg border border-line bg-muted px-3 py-2 text-sm text-ink-soft">
        Registration opens{when ? ` on ${when}` : " soon"}.
      </p>
    );
  }

  if (state === "closed") {
    return (
      <p className="rounded-lg border border-line bg-muted px-3 py-2 text-sm text-ink-soft">
        Registration is closed for this event.
      </p>
    );
  }

  if (state === "sold_out") {
    return (
      <EmptyState
        icon={<Users className="h-5 w-5" />}
        title="Fully booked"
        description="Every seat for this event has been taken. Check back in case someone cancels."
      />
    );
  }

  if (state === "competitions_closed") {
    return (
      <EmptyState
        icon={<Users className="h-5 w-5" />}
        title="Competitions closed"
        description="Every competition on this hackathon has ended or closed registration, so signup is not open."
      />
    );
  }

  if (state === "waitlist" || state === "open") {
    const openCompetitions = dto.competitions.filter((c) => c.registrationOpen);
    const needsConnections =
      !dto.isFree ||
      dto.formFields.some((f) => f.type === "file" || f.key === "payment_screenshot") ||
      openCompetitions.length > 0;
    if (needsConnections && !dto.organizerConnectionsReady) {
      return (
        <p className="rounded-lg border border-warning-line bg-warning-soft px-3 py-2 text-sm text-ink">
          {dto.organizerConnectionsMessage ||
            "Registration uploads and confirmation email are not available until the organiser connects Google Drive and Gmail."}
        </p>
      );
    }
    return (
      <>
        {state === "waitlist" ? (
          <p className="mb-4 rounded-lg border border-line bg-muted px-3 py-2 text-sm text-ink-soft">
            Seats are full — you will join the waitlist.
          </p>
        ) : null}
        <RegistrationForm
          eventId={dto.id}
          isPaid={!dto.isFree}
          priceLabel={dto.admissionLabel}
          inviteToken={inviteToken}
          accessCode={accessCode}
          joinsWaitlist={state === "waitlist"}
          needsApproval={dto.requiresApproval}
          formFields={formFields}
          competitions={openCompetitions.map((c) => ({
            id: c.id,
            name: c.name,
            kind: c.kind,
            description: c.description,
            instructions: "",
            policies: "",
            rulesText: c.rulesText,
            fee: c.fee,
            due: c.due,
            currency: c.currency,
            discountPercent: c.discountPercent,
            discountNote: c.discountNote,
            minTeamSize: c.minTeamSize,
            maxTeamSize: c.maxTeamSize,
            submissionDeadline: c.submissionDeadline,
            prizePool: c.prizePool,
            imageUrl: c.imageUrl,
          }))}
          groupRegistration={dto.groupRegistration}
          groupMinSize={dto.groupMinSize}
          groupMaxSize={dto.groupMaxSize}
          attendee={attendee}
          tierChoices={
            openCompetitions.length
              ? []
              : dto.allowTierSelfSelect
                ? dto.attendeeTiers.filter((t) => !dto.lockedTiers.includes(t))
                : []
          }
        />
      </>
    );
  }

  return null;
}

/** Reconstruct EventFormField-shaped rows for RegistrationForm (ids are synthetic). */
function dtoToFormFields(dto: PublicEventDto): EventFormField[] {
  return dto.formFields.map((f, i) => ({
    id: `${dto.id}-${f.key}`,
    eventId: dto.id,
    key: f.key,
    label: f.label,
    type: f.type,
    required: f.required,
    options: f.options,
    helpText: f.help,
    placeholder: f.placeholder,
    validation: {},
    orderIndex: i,
    scope: f.scope,
    isSystem: ["name", "email", "phone", "payment_screenshot"].includes(f.key),
    archivedAt: null,
    createdAt: "",
    updatedAt: "",
  }));
}
