"use client";

import { AccessTypeSelector } from "@/src/features/access/components/AccessTypeSelector";
import type { EventFormData } from "@/src/services/models/event.model";
import { formatDate, formatTime } from "@/src/lib/datetime";
import { MapPreview } from "../MapPreview";
import { isHackathonForm } from "../wizardUtils";

const previewDate = (d: string) => {
  const f = formatDate(d);
  return f === "—" ? d || "Not set" : f;
};
const previewTime = (t: string) => {
  const f = formatTime(t);
  return f === "—" ? t || "" : f;
};

export function ReviewStep({
  formData,
  updateForm,
  patchForm,
  goToStep,
}: {
  formData: EventFormData;
  updateForm: (field: keyof EventFormData, value: unknown) => void;
  patchForm: (patch: Partial<EventFormData>) => void;
  goToStep: (step: number) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-ink">Review details</h3>
        <ReviewCard title="Basic information" onEdit={() => goToStep(1)}>
          <p>{formData.eventTitle || "Untitled"}</p>
          <p>Category: {formData.category || "—"} · Format: {formData.eventType || "—"}</p>
        </ReviewCard>
        <ReviewCard title="Schedule & location" onEdit={() => goToStep(2)}>
          <p>
            {formData.startDate ? `${previewDate(formData.startDate)} – ${previewDate(formData.endDate || formData.startDate)}` : "Dates not set"}
          </p>
          <p>
            {previewTime(formData.startTime)} – {previewTime(formData.endTime)} · {formData.timezone.split("(")[0]}
          </p>
          <p>
            {formData.locationType === "virtual"
              ? formData.meetingLink || "Meeting link not set"
              : `${formData.venueName || "Venue not set"} ${formData.city || ""}`}
          </p>
          {formData.locationType !== "virtual" && formData.mapUrl ? <MapPreview mapUrl={formData.mapUrl} /> : null}
        </ReviewCard>
        {isHackathonForm(formData) ? (
          <ReviewCard title="Competitions" onEdit={() => goToStep(3)}>
            <p>{formData.wizardTracks.length || 1} track{(formData.wizardTracks.length || 1) === 1 ? "" : "s"}</p>
            {(formData.wizardTracks.length ? formData.wizardTracks : []).map((t) => (
              <p key={t.id}>
                {t.name} · PKR {t.fee}
              </p>
            ))}
          </ReviewCard>
        ) : null}
        <ReviewCard title="Registration" onEdit={() => goToStep(isHackathonForm(formData) ? 4 : 3)}>
          {formData.requiresRegistration === false ? (
            <p>No registration</p>
          ) : (
            <p>
              {formData.ticketType === "free" ? "Free" : `${formData.ticketTiers.length} paid tier(s)`} · {formData.totalSeats} seats ·{" "}
              {formData.customFields.length} extra question{formData.customFields.length === 1 ? "" : "s"}
            </p>
          )}
        </ReviewCard>
      </div>

      <div>
        <h3 className="mb-4 text-lg font-bold text-ink">Publishing</h3>
        <div className="space-y-6 rounded-2xl border border-line bg-paper p-6">
          <AccessTypeSelector
            accessType={formData.accessType || ((formData.visibility as string) === "tiered" ? "vip_tiered" : formData.visibility) || "public"}
            whitelistEmails={formData.whitelistEmails || []}
            accessCode={formData.accessCode || ""}
            eventTiers={formData.eventTiers}
            gatedTiers={formData.gatedTiers}
            onChange={(patch) => {
              patchForm({
                ...patch,
                ...(patch.accessType
                  ? {
                      visibility:
                        patch.accessType === "vip_tiered" || patch.accessType === "hybrid"
                          ? "invite_only"
                          : (patch.accessType as EventFormData["visibility"]),
                    }
                  : {}),
              });
            }}
          />
          <div className="flex items-center justify-between border-t border-line pt-4">
            <div>
              <p className="text-sm font-medium text-ink">Publish immediately</p>
              <p className="text-xs text-ink-soft">Go live as soon as you click publish</p>
            </div>
            <button
              type="button"
              onClick={() => updateForm("publishImmediately", !formData.publishImmediately)}
              className={`relative h-6 w-11 rounded-full transition-colors ${formData.publishImmediately ? "bg-ink" : "bg-muted-strong"}`}
            >
              <span className={`absolute top-1 h-4 w-4 rounded-full bg-paper shadow ${formData.publishImmediately ? "right-1" : "left-1"}`} />
            </button>
          </div>
          <div className="space-y-3 border-t border-line pt-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input type="checkbox" checked={formData.confirmRights} onChange={(e) => updateForm("confirmRights", e.target.checked)} className="mt-0.5" />
              <p className="text-xs text-ink-soft">I confirm that I have the rights to use all uploaded images and content for this event.</p>
            </label>
            <label className="flex cursor-pointer items-start gap-3">
              <input type="checkbox" checked={formData.agreeToTerms} onChange={(e) => updateForm("agreeToTerms", e.target.checked)} className="mt-0.5" />
              <p className="text-xs text-ink-soft">I agree to the Terms of Service and Event Organizer Agreement.</p>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewCard({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-paper p-5 shadow-sm">
      <div className="mb-2 flex items-start justify-between">
        <p className="text-sm font-bold text-ink">{title}</p>
        <button type="button" onClick={onEdit} className="text-xs text-ink-soft underline">
          Edit
        </button>
      </div>
      <div className="space-y-1 text-xs text-ink-soft">{children}</div>
    </div>
  );
}
