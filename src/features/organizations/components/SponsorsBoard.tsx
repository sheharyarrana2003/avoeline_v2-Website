"use client";

import { useMemo, useState } from "react";
import { Plus, Eye } from "lucide-react";
import { Modal } from "@/src/components/ui/Modal";
import { buttonClass } from "@/src/lib/ui";
import { formatCurrency } from "@/src/lib/money";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";
import { StatusBadge } from "@/src/shared_components/ui/StatusBadge";
import { ConfirmSubmit } from "@/src/shared_components/ui/ConfirmDialog";
import { OrganizationForm } from "./OrganizationForm";
import { PublicShowToggles } from "./PublicShowToggles";
import { PublicSponsorsStrip } from "@/src/features/events/components/public/PublicSponsorsStrip.client";
import { removeOrganization, toggleBenefit } from "../actions/organizations.action";
import {
  ORGANIZATION_TYPE_META,
  benefitProgress,
  sponsorTierTone,
  type EventOrganization,
} from "../types";
import type { PublicOrgCredit } from "@/src/features/events/types";

function toPublicCredit(o: EventOrganization): PublicOrgCredit {
  return {
    id: o.id,
    name: o.name,
    logoUrl: o.logoUrl,
    websiteUrl: o.websiteUrl,
    tier: o.tier,
    type: o.type,
    kindLabel:
      o.type === "partner"
        ? o.partnershipKind || undefined
        : o.type === "collaborator"
          ? o.contributionKind || undefined
          : undefined,
    trackId: o.trackId || undefined,
  };
}

export function SponsorsBoard({
  eventId,
  organizerId,
  orgs,
  sponsorTiers,
  tracks,
  isHackathon,
  partnerTypes,
  showSponsors,
  showCollaborators,
  showPartners,
  currency,
}: {
  eventId: string;
  organizerId: string;
  orgs: EventOrganization[];
  sponsorTiers: string[];
  tracks: { id: string; name: string }[];
  isHackathon: boolean;
  partnerTypes: { label: string; description: string }[];
  showSponsors: boolean;
  showCollaborators: boolean;
  showPartners: boolean;
  currency: string;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [step, setStep] = useState<"form" | "preview">("form");
  const [editing, setEditing] = useState<EventOrganization | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftType, setDraftType] = useState("sponsor");
  const [draftLogo, setDraftLogo] = useState("");

  const openAdd = () => {
    setEditing(null);
    setStep("form");
    setFormOpen(true);
  };
  const openEdit = (o: EventOrganization) => {
    setEditing(o);
    setStep("form");
    setFormOpen(true);
  };

  const previewCredits = useMemo(() => {
    const sponsors = showSponsors
      ? orgs.filter((o) => o.type === "sponsor").map(toPublicCredit)
      : [];
    const collaborators = showCollaborators
      ? orgs.filter((o) => o.type === "collaborator").map(toPublicCredit)
      : [];
    const partners = showPartners
      ? orgs.filter((o) => o.type === "partner").map(toPublicCredit)
      : [];
    return { sponsors, collaborators, partners };
  }, [orgs, showSponsors, showCollaborators, showPartners]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <button type="button" className={buttonClass("primary", "sm")} onClick={openAdd}>
            <Plus size={14} aria-hidden />
            Add
          </button>
          <button
            type="button"
            className={buttonClass("secondary", "sm")}
            onClick={() => setPreviewOpen(true)}
          >
            <Eye size={14} aria-hidden />
            Preview public section
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-line bg-paper p-4">
        <PublicShowToggles
          eventId={eventId}
          showSponsors={showSponsors}
          showCollaborators={showCollaborators}
          showPartners={showPartners}
        />
      </div>

      {!orgs.length ? (
        <EmptyState
          title="No sponsors yet"
          description="Add a sponsor, collaborator or partner. Nothing appears publicly until you turn on the switches above."
        />
      ) : (
        <ul className="divide-y divide-line rounded-2xl border border-line bg-paper">
          {orgs.map((o) => {
            const progress = o.type === "sponsor" ? benefitProgress(o.benefits) : null;
            return (
              <li key={o.id} className="flex flex-wrap items-center gap-4 px-4 py-4">
                {o.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={o.logoUrl} alt="" className="h-12 w-12 rounded-lg object-contain" />
                ) : (
                  <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-xs text-ink-soft">
                    Logo
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink">{o.name}</p>
                  <p className="text-xs text-ink-soft">
                    {ORGANIZATION_TYPE_META[o.type].label}
                    {o.tier ? ` · ${o.tier}` : ""}
                    {o.type === "sponsor"
                      ? ` · ${formatCurrency(o.contractValue, currency, "—")}`
                      : ""}
                  </p>
                  {o.type === "sponsor" ? (
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <StatusBadge
                        status={
                          o.paymentStatus === "received"
                            ? "confirmed"
                            : o.paymentStatus === "partial"
                              ? "in_progress"
                              : "pending"
                        }
                        label={o.paymentStatus}
                        size="sm"
                      />
                      {o.amountReceived > 0 ? (
                        <span className="text-2xs text-ink-soft">
                          Received {formatCurrency(o.amountReceived, currency)}
                        </span>
                      ) : null}
                      {progress && progress.total ? (
                        <span className="text-2xs text-ink-soft">{progress.label}</span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                {o.type === "sponsor" && o.tier ? (
                  <StatusBadge
                    status={sponsorTierTone(o.tier, sponsorTiers) as "fee_paid"}
                    label={o.tier}
                    size="sm"
                  />
                ) : null}
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={buttonClass("secondary", "sm")}
                    onClick={() => openEdit(o)}
                  >
                    Edit
                  </button>
                  <form action={removeOrganization}>
                    <input type="hidden" name="eventId" value={eventId} />
                    <input type="hidden" name="id" value={o.id} />
                    <ConfirmSubmit
                      title={`Remove ${o.name}?`}
                      description="They disappear from this event’s sponsors list."
                      confirmLabel="Remove"
                      className={buttonClass("destructive", "sm")}
                    >
                      Remove
                    </ConfirmSubmit>
                  </form>
                </div>
                {o.type === "sponsor" && o.benefits.length ? (
                  <ul className="w-full space-y-1 border-t border-line pt-3 text-xs">
                    {o.benefits.map((b, index) => (
                      <li key={b.label} className="flex items-center justify-between gap-2">
                        <span className={b.delivered ? "text-ink-soft line-through" : "text-ink"}>
                          {b.label}
                        </span>
                        <form action={toggleBenefit}>
                          <input type="hidden" name="eventId" value={eventId} />
                          <input type="hidden" name="id" value={o.id} />
                          <input type="hidden" name="index" value={String(index)} />
                          <button type="submit" className={buttonClass("ghost", "sm")}>
                            {b.delivered ? "Undo" : "Delivered"}
                          </button>
                        </form>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? `Edit ${editing.name}` : "Add organization"}
        maxWidth="2xl"
        footer={
          step === "form" ? (
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className={buttonClass("secondary")}
                onClick={() => setFormOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={buttonClass("primary")}
                onClick={() => setStep("preview")}
              >
                Preview card
              </button>
            </div>
          ) : (
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className={buttonClass("secondary")}
                onClick={() => setStep("form")}
              >
                Back
              </button>
              <button
                type="submit"
                form="org-form"
                className={buttonClass("primary")}
                onClick={() => {
                  /* submit via form attribute */
                }}
              >
                Save
              </button>
            </div>
          )
        }
      >
        {step === "form" ? (
          <div
            onChange={(e) => {
              const t = e.target as HTMLInputElement | HTMLSelectElement;
              if (t.name === "name") setDraftName(t.value);
              if (t.name === "type") setDraftType(t.value);
              if (t.name === "logoUrl") setDraftLogo(t.value);
            }}
          >
            <OrganizationForm
              key={editing?.id ?? "new"}
              eventId={eventId}
              sponsorTiers={sponsorTiers}
              editing={editing ?? undefined}
              tracks={tracks}
              isHackathon={isHackathon}
              partnerTypes={partnerTypes}
              formId="org-form"
              hideSubmit
              onSuccess={() => setFormOpen(false)}
            />
          </div>
        ) : (
          <div className="rounded-2xl border border-line p-6 text-center">
            <p className="text-2xs uppercase text-ink-soft">Public card preview</p>
            {draftLogo || editing?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={draftLogo || editing?.logoUrl || ""}
                alt=""
                className="mx-auto mt-3 h-16 object-contain"
              />
            ) : (
              <div className="mx-auto mt-3 flex h-16 w-16 items-center justify-center rounded-lg bg-muted text-xs text-ink-soft">
                Logo
              </div>
            )}
            <p className="mt-3 font-display text-lg text-ink">
              {draftName || editing?.name || "Organization name"}
            </p>
            <p className="text-sm text-ink-soft">
              {(ORGANIZATION_TYPE_META as Record<string, { label: string }>)[draftType]?.label ||
                draftType}
            </p>
          </div>
        )}
      </Modal>

      <Modal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Public section preview"
        maxWidth="2xl"
      >
        <PublicShowToggles
          eventId={eventId}
          showSponsors={showSponsors}
          showCollaborators={showCollaborators}
          showPartners={showPartners}
        />
        <div className="mt-6">
          <PublicSponsorsStrip
            sponsors={previewCredits.sponsors}
            collaborators={previewCredits.collaborators}
            partners={previewCredits.partners}
            sponsorTiers={sponsorTiers}
          />
          {!previewCredits.sponsors.length &&
          !previewCredits.collaborators.length &&
          !previewCredits.partners.length ? (
            <p className="text-sm text-ink-soft">
              Nothing will show publicly with the current switches and list.
            </p>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}
