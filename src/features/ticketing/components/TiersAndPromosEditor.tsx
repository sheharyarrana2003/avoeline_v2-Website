"use client";

import type { TicketTier, WizardPromoDraft } from "@/src/services/models/event.model";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";

export type TrackOption = { id: string; name: string };

const SEATS_HELPER = "Leave seats empty for unlimited";

/** Canonical labels — keep UI and tests in sync. */
export const TIER_FIELD_LABELS = [
  "Name",
  "Price",
  "Seats",
  "Available from",
  "Available until",
  "Active",
  "Early bird",
] as const;

export const PROMO_FIELD_LABELS = [
  "Code",
  "Type",
  "Value",
  "Scope",
  "Usage limit",
  "Expiry",
  "Active",
] as const;

export function emptyTierDraft(partial?: Partial<TicketTier>): TicketTier {
  return {
    id: partial?.id || `tier-${Date.now()}`,
    name: partial?.name ?? "General",
    price: partial?.price ?? 0,
    seatsAvailable: partial?.seatsAvailable ?? null,
    availableFrom: partial?.availableFrom ?? "",
    availableUntil: partial?.availableUntil ?? "",
    description: partial?.description ?? "",
    active: partial?.active !== false,
    isEarlyBird: !!partial?.isEarlyBird,
  };
}

export function emptyPromoDraft(partial?: Partial<WizardPromoDraft>): WizardPromoDraft {
  return {
    id: partial?.id || `promo-${Date.now()}`,
    code: partial?.code ?? "",
    discountType: partial?.discountType ?? "percent",
    value: partial?.value ?? 0,
    trackId: partial?.trackId ?? null,
    usageLimit: partial?.usageLimit ?? null,
    expiresAt: partial?.expiresAt ?? "",
    active: partial?.active !== false,
  };
}

function seatsInputValue(seats: number | null | undefined): string {
  if (seats == null || seats <= 0) return "";
  return String(seats);
}

function parseSeats(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

/** Shared labeled tier fields — uncontrolled (Access FormData) or controlled (wizard draft). */
export function TierFieldGrid({
  idPrefix = "tier",
  value,
  onChange,
}: {
  idPrefix?: string;
  value?: TicketTier;
  onChange?: (patch: Partial<TicketTier>) => void;
}) {
  const controlled = !!onChange && !!value;
  return (
    <>
      <div className="sm:col-span-2">
        <label className={labelClass} htmlFor={`${idPrefix}-name`}>
          Name
        </label>
        <input
          id={`${idPrefix}-name`}
          name="name"
          required
          className={fieldClass}
          {...(controlled
            ? {
                value: value.name,
                onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                  onChange({ name: e.target.value }),
              }
            : {})}
        />
      </div>
      <div>
        <label className={labelClass} htmlFor={`${idPrefix}-price`}>
          Price
        </label>
        <input
          id={`${idPrefix}-price`}
          name="price"
          type="number"
          step="0.01"
          min={0}
          className={fieldClass}
          {...(controlled
            ? {
                value: value.price,
                onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                  onChange({ price: Number(e.target.value) || 0 }),
              }
            : {})}
        />
      </div>
      <div>
        <label className={labelClass} htmlFor={`${idPrefix}-seats`}>
          Seats
        </label>
        <input
          id={`${idPrefix}-seats`}
          name="seats"
          type="number"
          min={1}
          className={fieldClass}
          placeholder="Unlimited"
          {...(controlled
            ? {
                value: seatsInputValue(value.seatsAvailable),
                onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                  onChange({ seatsAvailable: parseSeats(e.target.value) }),
              }
            : {})}
        />
        <p className="mt-1 text-xs text-ink-soft">{SEATS_HELPER}</p>
      </div>
      <div>
        <label className={labelClass} htmlFor={`${idPrefix}-from`}>
          Available from
        </label>
        <input
          id={`${idPrefix}-from`}
          name="availableFrom"
          type="date"
          className={fieldClass}
          {...(controlled
            ? {
                value: value.availableFrom || "",
                onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                  onChange({ availableFrom: e.target.value }),
              }
            : {})}
        />
      </div>
      <div>
        <label className={labelClass} htmlFor={`${idPrefix}-until`}>
          Available until
        </label>
        <input
          id={`${idPrefix}-until`}
          name="availableUntil"
          type="date"
          className={fieldClass}
          {...(controlled
            ? {
                value: value.availableUntil || "",
                onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                  onChange({ availableUntil: e.target.value }),
              }
            : {})}
        />
      </div>
      <label className="flex items-center gap-2 self-end text-sm text-ink">
        <input
          type="checkbox"
          name="active"
          className="h-4 w-4 accent-current"
          {...(controlled
            ? {
                checked: value.active,
                onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                  onChange({ active: e.target.checked }),
              }
            : { defaultChecked: true })}
        />
        Active
      </label>
      <label className="flex items-center gap-2 self-end text-sm text-ink">
        <input
          type="checkbox"
          name="isEarlyBird"
          className="h-4 w-4 accent-current"
          {...(controlled
            ? {
                checked: value.isEarlyBird,
                onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                  onChange({ isEarlyBird: e.target.checked }),
              }
            : {})}
        />
        Early bird
      </label>
    </>
  );
}

/** Shared labeled promo fields. */
export function PromoFieldGrid({
  idPrefix = "promo",
  value,
  onChange,
  isHackathon = false,
  tracks = [],
}: {
  idPrefix?: string;
  value?: WizardPromoDraft;
  onChange?: (patch: Partial<WizardPromoDraft>) => void;
  isHackathon?: boolean;
  tracks?: TrackOption[];
}) {
  const controlled = !!onChange && !!value;
  return (
    <>
      <div>
        <label className={labelClass} htmlFor={`${idPrefix}-code`}>
          Code
        </label>
        <input
          id={`${idPrefix}-code`}
          name="code"
          required
          className={`${fieldClass} uppercase`}
          {...(controlled
            ? {
                value: value.code,
                onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                  onChange({ code: e.target.value.toUpperCase() }),
              }
            : {})}
        />
      </div>
      <div>
        <label className={labelClass} htmlFor={`${idPrefix}-type`}>
          Type
        </label>
        <select
          id={`${idPrefix}-type`}
          name="discountType"
          className={fieldClass}
          {...(controlled
            ? {
                value: value.discountType,
                onChange: (e: React.ChangeEvent<HTMLSelectElement>) =>
                  onChange({
                    discountType: e.target.value === "flat" ? "flat" : "percent",
                  }),
              }
            : {})}
        >
          <option value="percent">Percent</option>
          <option value="flat">Flat</option>
        </select>
      </div>
      <div>
        <label className={labelClass} htmlFor={`${idPrefix}-value`}>
          Value
        </label>
        <input
          id={`${idPrefix}-value`}
          name="value"
          type="number"
          step="0.01"
          required
          className={fieldClass}
          {...(controlled
            ? {
                value: value.value,
                onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                  onChange({ value: Number(e.target.value) || 0 }),
              }
            : {})}
        />
      </div>
      {isHackathon ? (
        <div>
          <label className={labelClass} htmlFor={`${idPrefix}-scope`}>
            Scope
          </label>
          <select
            id={`${idPrefix}-scope`}
            name="trackId"
            className={fieldClass}
            {...(controlled
              ? {
                  value: value.trackId || "",
                  onChange: (e: React.ChangeEvent<HTMLSelectElement>) =>
                    onChange({ trackId: e.target.value || null }),
                }
              : { defaultValue: "" })}
          >
            <option value="">Whole event</option>
            {tracks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <input type="hidden" name="trackId" value="" />
      )}
      <div>
        <label className={labelClass} htmlFor={`${idPrefix}-usage`}>
          Usage limit
        </label>
        <input
          id={`${idPrefix}-usage`}
          name="usageLimit"
          type="number"
          min={1}
          className={fieldClass}
          placeholder="Unlimited"
          {...(controlled
            ? {
                value: value.usageLimit == null ? "" : String(value.usageLimit),
                onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                  const t = e.target.value.trim();
                  onChange({
                    usageLimit: t ? Math.max(1, Math.floor(Number(t) || 0)) || null : null,
                  });
                },
              }
            : {})}
        />
      </div>
      <div>
        <label className={labelClass} htmlFor={`${idPrefix}-expires`}>
          Expiry
        </label>
        <input
          id={`${idPrefix}-expires`}
          name="expiresAt"
          type="date"
          className={fieldClass}
          {...(controlled
            ? {
                value: value.expiresAt || "",
                onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                  onChange({ expiresAt: e.target.value }),
              }
            : {})}
        />
      </div>
      <label className="flex items-center gap-2 self-end text-sm text-ink">
        <input
          type="checkbox"
          name="active"
          className="h-4 w-4 accent-current"
          {...(controlled
            ? {
                checked: value.active,
                onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
                  onChange({ active: e.target.checked }),
              }
            : { defaultChecked: true })}
        />
        Active
      </label>
    </>
  );
}

type DraftProps = {
  mode: "draft";
  hideTiers?: boolean;
  tiers: TicketTier[];
  promos: WizardPromoDraft[];
  onTiersChange: (tiers: TicketTier[]) => void;
  onPromosChange: (promos: WizardPromoDraft[]) => void;
  isHackathon?: boolean;
  tracks?: TrackOption[];
};

type AccessCreateProps = {
  mode: "access-create";
  hideTiers?: boolean;
  isHackathon?: boolean;
  tracks?: TrackOption[];
  /** Hidden inputs (eventId, organizerId, returnTo). */
  hiddenFields: React.ReactNode;
  createTierAction: (formData: FormData) => void | Promise<void>;
  createPromoAction: (formData: FormData) => void | Promise<void>;
};

export type TiersAndPromosEditorProps = DraftProps | AccessCreateProps;

/**
 * Shared tiers + promos editor for the event wizard (draft) and Access tab (FormData create).
 */
export function TiersAndPromosEditor(props: TiersAndPromosEditorProps) {
  const hideTiers = !!props.hideTiers;
  const isHackathon = !!props.isHackathon;
  const tracks = props.tracks ?? [];

  if (props.mode === "access-create") {
    return (
      <div className="space-y-8">
        {!hideTiers ? (
          <form
            action={props.createTierAction}
            className="grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-2"
          >
            {props.hiddenFields}
            <TierFieldGrid idPrefix="tier" />
            <div className="sm:col-span-2 flex justify-end">
              <button type="submit" className={buttonClass("primary", "sm")}>
                Add tier
              </button>
            </div>
          </form>
        ) : null}

        <form
          action={props.createPromoAction}
          className="grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-2"
        >
          {props.hiddenFields}
          <PromoFieldGrid idPrefix="promo" isHackathon={isHackathon} tracks={tracks} />
          <div className="sm:col-span-2 flex justify-end">
            <button type="submit" className={buttonClass("primary", "sm")}>
              Add code
            </button>
          </div>
        </form>
      </div>
    );
  }

  const { tiers, promos, onTiersChange, onPromosChange } = props;

  function patchTier(id: string, patch: Partial<TicketTier>) {
    onTiersChange(tiers.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  function patchPromo(id: string, patch: Partial<WizardPromoDraft>) {
    onPromosChange(promos.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  return (
    <div className="space-y-8">
      {!hideTiers ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-ink">Ticket tiers</h3>
            <button
              type="button"
              onClick={() => onTiersChange([...tiers, emptyTierDraft()])}
              className="text-xs font-semibold text-ink underline"
            >
              Add tier
            </button>
          </div>
          {tiers.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line bg-muted px-4 py-3 text-sm text-ink-soft">
              Add at least one ticket tier for a paid event.
            </p>
          ) : null}
          {tiers.map((tier) => (
            <div
              key={tier.id}
              className="grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-2"
            >
              <TierFieldGrid
                idPrefix={`tier-${tier.id}`}
                value={tier}
                onChange={(patch) => patchTier(tier.id, patch)}
              />
              <div className="sm:col-span-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => onTiersChange(tiers.filter((t) => t.id !== tier.id))}
                  className="text-xs text-red-700"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-ink">Promo codes</h3>
          <button
            type="button"
            onClick={() => onPromosChange([...promos, emptyPromoDraft()])}
            className="text-xs font-semibold text-ink underline"
          >
            Add code
          </button>
        </div>
        {promos.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line bg-muted px-4 py-3 text-sm text-ink-soft">
            Optional. Codes apply at checkout on the public Register page.
          </p>
        ) : null}
        {promos.map((promo) => (
          <div
            key={promo.id}
            className="grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-2"
          >
            <PromoFieldGrid
              idPrefix={`promo-${promo.id}`}
              value={promo}
              onChange={(patch) => patchPromo(promo.id, patch)}
              isHackathon={isHackathon}
              tracks={tracks}
            />
            <div className="sm:col-span-2 flex justify-end">
              <button
                type="button"
                onClick={() => onPromosChange(promos.filter((p) => p.id !== promo.id))}
                className="text-xs text-red-700"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
