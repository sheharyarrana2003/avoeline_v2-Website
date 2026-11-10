"use client";

import Link from "next/link";
import { AccessTypeSelector } from "@/src/features/access/components/AccessTypeSelector";
import type { EventFormData } from "@/src/services/models/event.model";
import { formatDate, formatTime } from "@/src/lib/datetime";
import { MapPreview } from "../MapPreview";
import { formatRegistrationSummary, isHackathonForm } from "../wizardUtils";

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
  const locationLine =
    formData.locationType === "virtual"
      ? formData.meetingLink || "Meeting link not set"
      : `${formData.venueName || "Venue not set"}${formData.city ? ` · ${formData.city}` : ""}`;

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-ink">Public page preview</h3>
        <div className="overflow-hidden rounded-2xl border border-line bg-paper shadow-sm">
          <div className="relative aspect-video w-full bg-muted">
            {formData.bannerImage ? (
              // eslint-disable-next-line @next/next/no-img-element -- wizard draft URL may be blob/data/storage
              <img src={formData.bannerImage} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-ink-soft">
                No banner yet
              </div>
            )}
          </div>
          <div className="space-y-2 p-5">
            <p className="text-lg font-bold text-ink">{formData.eventTitle || "Untitled"}</p>
            <p className="text-xs text-ink-soft">
              {formData.category || "—"} · {formData.eventType || "—"}
            </p>
            <p className="text-sm text-ink">
              {formData.startDate
                ? `${previewDate(formData.startDate)} – ${previewDate(formData.endDate || formData.startDate)}`
                : "Dates not set"}
            </p>
            <p className="text-sm text-ink-soft">
              {previewTime(formData.startTime)} – {previewTime(formData.endTime)}
            </p>
            <p className="text-sm text-ink-soft">{locationLine}</p>
            <p className="text-sm text-ink">{formatRegistrationSummary(formData)}</p>
          </div>
        </div>

        <ReviewCard title="Basic information" onEdit={() => goToStep(1)}>
          <p>{formData.eventTitle || "Untitled"}</p>
          <p>
            Category: {formData.category || "—"} · Format: {formData.eventType || "—"}
          </p>
        </ReviewCard>
        <ReviewCard title="Schedule & location" onEdit={() => goToStep(2)}>
          <p>
            {formData.startDate
              ? `${previewDate(formData.startDate)} – ${previewDate(formData.endDate || formData.startDate)}`
              : "Dates not set"}
          </p>
          <p>
            {previewTime(formData.startTime)} – {previewTime(formData.endTime)}
          </p>
          <p>{locationLine}</p>
          {formData.locationType !== "virtual" && (formData.mapsUrl || formData.mapUrl) ? (
            <MapPreview mapUrl={formData.mapsUrl || formData.mapUrl || ""} />
          ) : null}
        </ReviewCard>
        {isHackathonForm(formData) ? (
          <ReviewCard title="Competitions" onEdit={() => goToStep(3)}>
            <p>
              {formData.wizardTracks.length || 1} track
              {(formData.wizardTracks.length || 1) === 1 ? "" : "s"}
            </p>
            {(formData.wizardTracks.length ? formData.wizardTracks : []).map((t) => (
              <p key={t.id}>
                {t.name} · PKR {t.fee}
              </p>
            ))}
          </ReviewCard>
        ) : null}
        <ReviewCard title="Registration" onEdit={() => goToStep(isHackathonForm(formData) ? 4 : 3)}>
          <p>{formatRegistrationSummary(formData)}</p>
        </ReviewCard>
      </div>

      <div>
        <h3 className="mb-4 text-lg font-bold text-ink">Publishing</h3>
        <div className="space-y-6 rounded-2xl border border-line bg-paper p-6">
          <AccessTypeSelector
            accessType={
              formData.accessType ||
              ((formData.visibility as string) === "tiered" ? "vip_tiered" : formData.visibility) ||
              "public"
            }
            whitelistEmails={formData.whitelistEmails || []}
            inviteEmails={formData.inviteEmails || []}
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
              <span
                className={`absolute top-1 h-4 w-4 rounded-full bg-paper shadow ${formData.publishImmediately ? "right-1" : "left-1"}`}
              />
            </button>
          </div>
          <div className="space-y-3 border-t border-line pt-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={formData.confirmRights}
                onChange={(e) => updateForm("confirmRights", e.target.checked)}
                className="mt-0.5"
              />
              <p className="text-xs text-ink-soft">
                I confirm I have the rights to use all uploaded images and content for this event.{" "}
                <Link
                  href="/content-rights"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2"
                >
                  Content Rights
                </Link>
                .
              </p>
            </label>
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={formData.agreeToTerms}
                onChange={(e) => updateForm("agreeToTerms", e.target.checked)}
                className="mt-0.5"
              />
              <p className="text-xs text-ink-soft">
                I agree to the{" "}
                <Link
                  href="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2"
                >
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link
                  href="/organizer-agreement"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2"
                >
                  Event Organizer Agreement
                </Link>
                .
              </p>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewCard({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
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
