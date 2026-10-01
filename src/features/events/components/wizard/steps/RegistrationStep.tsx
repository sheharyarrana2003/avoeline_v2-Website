"use client";

import { DateField } from "@/src/shared_components/DateField";
import type { EventFormData, TicketTier } from "@/src/services/models/event.model";
import { FormBuilder } from "../FormBuilder";

export function RegistrationStep({
  formData,
  updateForm,
  hideGroupToggle = false,
}: {
  formData: EventFormData;
  updateForm: (field: keyof EventFormData, value: unknown) => void;
  hideGroupToggle?: boolean;
}) {
  const on = formData.requiresRegistration !== false;

  return (
    <div className="space-y-8">
      <label className="flex items-start gap-3 rounded-2xl border border-line bg-paper p-4">
        <input
          type="checkbox"
          checked={!on}
          onChange={(e) => updateForm("requiresRegistration", !e.target.checked)}
          className="mt-1"
        />
        <span>
          <span className="block text-sm font-bold text-ink">This event does not take registrations</span>
          <span className="text-xs text-ink-soft">
            Hide ticket tiers, approval, and the public Register button. People can still view the event page.
          </span>
        </span>
      </label>

      {on ? (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs text-ink-soft">Registration opens</label>
              <DateField value={formData.registrationOpenDate} onChange={(e) => updateForm("registrationOpenDate", e.target.value)} />
            </div>
            <div>
              <label className="mb-2 block text-xs text-ink-soft">Registration closes</label>
              <DateField value={formData.registrationCloseDate} onChange={(e) => updateForm("registrationCloseDate", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <label className="text-xs text-ink-soft">
              Total seats
              <input
                type="number"
                min={0}
                value={formData.totalSeats}
                onChange={(e) => updateForm("totalSeats", Number(e.target.value) || 0)}
                className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs text-ink-soft">
              Max tickets / person
              <input
                type="number"
                min={1}
                value={formData.maxTicketsPerPerson}
                onChange={(e) => updateForm("maxTicketsPerPerson", Number(e.target.value) || 1)}
                className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm"
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-ink-soft">
              <input
                type="checkbox"
                checked={formData.requiresApproval}
                onChange={(e) => updateForm("requiresApproval", e.target.checked)}
              />
              Approval required
            </label>
            <div className="flex items-center gap-2">
              {(["free", "paid"] as const).map((kind) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => updateForm("ticketType", kind)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${
                    formData.ticketType === kind ? "bg-ink text-ink-invert" : "bg-muted text-ink-soft"
                  }`}
                >
                  {kind}
                </button>
              ))}
            </div>
          </div>

          {!hideGroupToggle ? (
            <div className="space-y-3 rounded-2xl border border-line bg-paper p-4">
              <p className="text-sm font-bold text-ink">Registration style</p>
              <div className="flex gap-2">
                {(["single", "group"] as const).map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => updateForm("groupRegistration", kind === "group")}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${
                      (kind === "group") === !!formData.groupRegistration ? "bg-ink text-ink-invert" : "bg-muted text-ink-soft"
                    }`}
                  >
                    {kind}
                  </button>
                ))}
              </div>
              {formData.groupRegistration ? (
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-xs text-ink-soft">
                    Min group size
                    <input
                      type="number"
                      min={2}
                      value={formData.groupMinSize}
                      onChange={(e) => updateForm("groupMinSize", Number(e.target.value) || 2)}
                      className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="text-xs text-ink-soft">
                    Max group size
                    <input
                      type="number"
                      min={formData.groupMinSize || 2}
                      value={formData.groupMaxSize}
                      onChange={(e) => updateForm("groupMaxSize", Number(e.target.value) || 8)}
                      className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm"
                    />
                  </label>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-xs text-ink-soft">Hackathon teams are sized per competition. Group registration here is unused.</p>
          )}

          {formData.ticketType === "paid" ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-ink">Ticket tiers</h3>
                <button
                  type="button"
                  onClick={() =>
                    updateForm("ticketTiers", [
                      ...formData.ticketTiers,
                      {
                        id: `tier-${Date.now()}`,
                        name: "General",
                        price: 0,
                        seatsAvailable: formData.totalSeats || 0,
                        availableUntil: "",
                        description: "",
                      },
                    ])
                  }
                  className="text-xs font-semibold text-ink underline"
                >
                  Add tier
                </button>
              </div>
              {formData.ticketTiers.map((tier) => (
                <div key={tier.id} className="grid grid-cols-1 gap-2 rounded-xl border border-line p-3 md:grid-cols-4">
                  <input
                    value={tier.name}
                    onChange={(e) => patchTier(formData, updateForm, tier.id, { name: e.target.value })}
                    placeholder="Tier name"
                    className="rounded-lg border border-line px-3 py-2 text-sm"
                  />
                  <input
                    type="number"
                    min={0}
                    value={tier.price}
                    onChange={(e) => patchTier(formData, updateForm, tier.id, { price: Number(e.target.value) || 0 })}
                    placeholder="Price"
                    className="rounded-lg border border-line px-3 py-2 text-sm"
                  />
                  <input
                    type="number"
                    min={0}
                    value={tier.seatsAvailable}
                    onChange={(e) =>
                      patchTier(formData, updateForm, tier.id, { seatsAvailable: Number(e.target.value) || 0 })
                    }
                    placeholder="Seats"
                    className="rounded-lg border border-line px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      updateForm(
                        "ticketTiers",
                        formData.ticketTiers.filter((t) => t.id !== tier.id),
                      )
                    }
                    className="text-left text-xs text-red-700 md:text-right"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          <FormBuilder
            fields={formData.customFields}
            onChange={(next) => updateForm("customFields", next)}
            showAskOnce={!hideGroupToggle && !!formData.groupRegistration}
          />
        </>
      ) : (
        <p className="rounded-xl border border-dashed border-line bg-muted px-4 py-6 text-sm text-ink-soft">
          Registration is off. You can turn it back on any time before publish.
        </p>
      )}
    </div>
  );
}

function patchTier(
  formData: EventFormData,
  updateForm: (field: keyof EventFormData, value: unknown) => void,
  id: string,
  patch: Partial<TicketTier>,
) {
  updateForm(
    "ticketTiers",
    formData.ticketTiers.map((t) => (t.id === id ? { ...t, ...patch } : t)),
  );
}
