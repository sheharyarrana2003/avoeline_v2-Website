"use client";

import { DateField } from "@/src/shared_components/DateField";
import type { CustomField, EventFormData, TicketTier } from "@/src/services/models/event.model";
import { EventFormFieldsEditor } from "@/src/features/registration/forms/components/EventFormFieldsEditor";
import type { FormFieldDraft } from "@/src/features/registration/forms/formFields.types";

function draftsFromCustomFields(fields: CustomField[]): FormFieldDraft[] {
  return (fields ?? []).map((field) => {
    const typeRaw = String(field.type || "text");
    const type =
      typeRaw === "long_text"
        ? "textarea"
        : typeRaw === "checkboxes"
          ? "checkbox"
          : typeRaw === "image"
            ? "file"
            : typeRaw === "select"
              ? "dropdown"
              : (typeRaw as FormFieldDraft["type"]);
    return {
      localId: field.id,
      key: String(field.id || "").replace(/^field-/, "field_") || `field_${Date.now()}`,
      label: field.label,
      type: [
        "text",
        "textarea",
        "number",
        "email",
        "phone",
        "url",
        "date",
        "dropdown",
        "radio",
        "checkbox",
        "file",
      ].includes(type)
        ? type
        : "text",
      required: !!field.required,
      options: (field.options || []).map((o) => String(o).trim()).filter(Boolean),
      scope: field.askOnce === "group" ? "per_group" : "per_member",
      isSystem: false,
    };
  });
}

function customFieldsFromDrafts(drafts: FormFieldDraft[]): CustomField[] {
  return drafts
    .filter((d) => !d.isSystem && !["name", "email", "phone", "payment_screenshot"].includes(d.key))
    .map((d) => ({
      id: d.localId || d.key,
      label: d.label,
      type:
        d.type === "textarea"
          ? "long_text"
          : d.type === "checkbox" && (d.options?.length ?? 0) > 0
            ? "checkboxes"
            : d.type,
      required: d.required,
      options: d.options ?? [],
      askOnce: d.scope === "per_group" ? "group" : "member",
    }));
}

const SYSTEM_DRAFTS: FormFieldDraft[] = [
  {
    key: "name",
    label: "Full name",
    type: "text",
    required: true,
    options: [],
    scope: "per_member",
    isSystem: true,
    localId: "sys-name",
  },
  {
    key: "email",
    label: "Email",
    type: "email",
    required: true,
    options: [],
    scope: "per_member",
    isSystem: true,
    localId: "sys-email",
  },
  {
    key: "phone",
    label: "Phone",
    type: "phone",
    required: true,
    options: [],
    scope: "per_member",
    isSystem: true,
    localId: "sys-phone",
  },
];

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
  const editorFields = [
    ...SYSTEM_DRAFTS,
    ...(formData.ticketType === "paid"
      ? [
          {
            key: "payment_screenshot",
            label: "Payment screenshot",
            type: "file" as const,
            required: true,
            options: [] as string[],
            scope: "per_group" as const,
            isSystem: true,
            localId: "sys-payment",
          },
        ]
      : []),
    ...draftsFromCustomFields(formData.customFields ?? []),
  ];

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
          <span className="block text-sm font-bold text-ink">
            This event does not take registrations
          </span>
          <span className="text-xs text-ink-soft">
            Hide ticket tiers, approval, and the public Register button. People can still view the
            event page.
          </span>
        </span>
      </label>

      {on ? (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs text-ink-soft">Registration opens</label>
              <DateField
                value={formData.registrationOpenDate}
                onChange={(e) => updateForm("registrationOpenDate", e.target.value)}
              />
            </div>
            <div>
              <label className="mb-2 block text-xs text-ink-soft">Registration closes</label>
              <DateField
                value={formData.registrationCloseDate}
                onChange={(e) => updateForm("registrationCloseDate", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div>
              <label className="text-xs text-ink-soft">
                Total seats
                <input
                  type="number"
                  min={0}
                  disabled={formData.totalSeats === 0}
                  value={formData.totalSeats}
                  onChange={(e) => updateForm("totalSeats", Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm disabled:bg-muted disabled:opacity-60"
                />
              </label>
              <label className="mt-2 flex items-center gap-2 text-xs text-ink-soft">
                <input
                  type="checkbox"
                  checked={formData.totalSeats === 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      updateForm("totalSeats", 0);
                    } else {
                      updateForm(
                        "totalSeats",
                        formData.totalSeats === 0 ? 100 : formData.totalSeats,
                      );
                    }
                  }}
                />
                Unlimited seats
              </label>
            </div>
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
                    formData.ticketType === kind
                      ? "bg-ink text-ink-invert"
                      : "bg-muted text-ink-soft"
                  }`}
                >
                  {kind}
                </button>
              ))}
            </div>
          </div>

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
              {formData.ticketTiers.length === 0 ? (
                <p className="rounded-xl border border-dashed border-line bg-muted px-4 py-3 text-sm text-ink-soft">
                  Add at least one ticket tier for a paid event.
                </p>
              ) : null}
              {formData.ticketTiers.map((tier) => (
                <div
                  key={tier.id}
                  className="grid grid-cols-1 gap-2 rounded-xl border border-line p-3 md:grid-cols-4"
                >
                  <input
                    value={tier.name}
                    onChange={(e) =>
                      patchTier(formData, updateForm, tier.id, { name: e.target.value })
                    }
                    placeholder="Tier name"
                    className="rounded-lg border border-line px-3 py-2 text-sm"
                  />
                  <input
                    type="number"
                    min={0}
                    value={tier.price}
                    onChange={(e) =>
                      patchTier(formData, updateForm, tier.id, {
                        price: Number(e.target.value) || 0,
                      })
                    }
                    placeholder="Price"
                    className="rounded-lg border border-line px-3 py-2 text-sm"
                  />
                  <input
                    type="number"
                    min={0}
                    value={tier.seatsAvailable}
                    onChange={(e) =>
                      patchTier(formData, updateForm, tier.id, {
                        seatsAvailable: Number(e.target.value) || 0,
                      })
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

          <EventFormFieldsEditor
            mode="draft"
            initialFields={editorFields}
            groupRegistration={!!formData.groupRegistration}
            groupMinSize={formData.groupMinSize}
            groupMaxSize={formData.groupMaxSize}
            isPaid={formData.ticketType === "paid"}
            hideGroupToggle={hideGroupToggle}
            onDraftChange={(drafts, group) => {
              updateForm("customFields", customFieldsFromDrafts(drafts));
              updateForm("groupRegistration", group.enabled);
              updateForm("groupMinSize", group.min);
              updateForm("groupMaxSize", group.max);
            }}
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
