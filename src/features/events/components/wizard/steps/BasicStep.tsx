"use client";

import { useState } from "react";
import { CategoryStep } from "@/src/features/taxonomy/components/CategoryStep";
import type { TaxonomyEntry } from "@/src/features/taxonomy/types";
import type { SuperCategoryDoc, EventFormatDoc, CategoryFieldSetDoc } from "@/src/features/taxonomy/categoryEngine.types";
import type { EventFormData } from "@/src/services/models/event.model";
import { MediaUpload } from "@/src/features/media/MediaUpload";
import { isVideoUrl, IMAGE_AND_VIDEO_ACCEPT } from "@/src/features/media/media.utils";
import { DescriptionEditor } from "@/src/features/events/components/wizard/DescriptionEditor";

export function BasicStep({
  formData,
  updateForm,
  patchForm,
  entries,
  superCategories,
  eventFormats,
  fieldSets,
  hideHackathonFormats = true,
  skipCategory = false,
  canHackathon = false,
}: {
  formData: EventFormData;
  updateForm: (field: keyof EventFormData, value: unknown) => void;
  patchForm: (patch: Partial<EventFormData>) => void;
  entries: TaxonomyEntry[];
  superCategories: SuperCategoryDoc[];
  eventFormats: EventFormatDoc[];
  fieldSets: CategoryFieldSetDoc[];
  hideHackathonFormats?: boolean;
  skipCategory?: boolean;
  canHackathon?: boolean;
}) {
  const [tagInput, setTagInput] = useState("");

  return (
    <div className="space-y-8">
      <label className="flex items-start gap-3 rounded-2xl border border-line bg-paper p-4">
        <input
          type="checkbox"
          checked={formData.isHackathon}
          disabled={!canHackathon && !formData.isHackathon}
          onChange={(e) => {
            const on = e.target.checked;
            if (on && !canHackathon) return;
            patchForm(
              on
                ? {
                    isHackathon: true,
                    eventType: "Hackathon",
                    eventFormatId: "hackathon",
                    categoryFormatId: "hackathon",
                    groupRegistration: false,
                  }
                : { isHackathon: false },
            );
          }}
          className="mt-1"
        />
        <span>
          <span className="block text-sm font-bold text-ink">Is this a hackathon?</span>
          <span className="text-xs text-ink-soft">
            {canHackathon
              ? "Yes skips category, forces the hackathon format, and adds a Competitions step."
              : "Hackathon operations are locked on this plan. Upgrade to publish a hackathon."}
          </span>
        </span>
      </label>
      {skipCategory ? (
        <p className="rounded-2xl border border-line bg-muted px-4 py-3 text-sm text-ink-soft">
          This publish flow always creates a hackathon. Competitions (CTF, Business, Web Dev, and others) are chosen in the next steps.
        </p>
      ) : (
      <CategoryStep
        superCategories={superCategories}
        eventFormats={eventFormats}
        fieldSets={fieldSets}
        entries={entries}
        superCategoryId={formData.superCategoryId || formData.categorySuperId || ""}
        eventFormatId={formData.eventFormatId || formData.categoryFormatId || ""}
        categoryFields={formData.categoryFields}
        customFieldValues={formData.customFieldValues}
        onChange={patchForm}
        hideHackathonFormats={hideHackathonFormats}
      />
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <div>
            <h3 className="mb-1 text-lg font-bold text-ink">General Info</h3>
            <p className="mb-4 text-sm text-ink-soft">The essential details displayed on the event page.</p>
          </div>
          <div>
            <label htmlFor="wiz-title" className="mb-2 block text-2xs font-bold uppercase tracking-wider text-ink-soft">
              Event Title <span className="float-right font-normal text-ink-soft">{formData.eventTitle.length}/100</span>
            </label>
            <input
              id="wiz-title"
              type="text"
              maxLength={100}
              value={formData.eventTitle}
              onChange={(e) => updateForm("eventTitle", e.target.value)}
              placeholder="Global AI Innovation Summit 2024"
              className="w-full rounded-xl border border-line bg-paper px-4 py-3 text-sm text-ink outline-none placeholder-gray-400 focus:ring-2 focus:ring-line"
            />
          </div>
          <div>
            <label htmlFor="wiz-description" className="mb-2 block text-2xs font-bold uppercase tracking-wider text-ink-soft">
              Description
            </label>
            <DescriptionEditor
              id="wiz-description"
              value={formData.description}
              onChange={(html) => updateForm("description", html)}
            />
          </div>
          <div>
            <label htmlFor="wiz-short" className="mb-2 block text-2xs font-bold uppercase tracking-wider text-ink-soft">
              Short Description
            </label>
            <input
              id="wiz-short"
              type="text"
              value={formData.shortDescription}
              onChange={(e) => updateForm("shortDescription", e.target.value)}
              placeholder="A catchphrase for social sharing"
              className="w-full rounded-xl border border-line bg-paper px-4 py-3 text-sm text-ink outline-none"
            />
          </div>
          <div>
            <label className="mb-2 block text-2xs font-bold uppercase tracking-wider text-ink-soft">Tags</label>
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-paper px-3 py-2">
              {formData.tags.map((tag) => (
                <span key={tag} className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-ink">
                  {tag}
                  <button type="button" onClick={() => updateForm("tags", formData.tags.filter((t) => t !== tag))} className="text-ink-soft">
                    ×
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  const next = tagInput.trim();
                  if (next && !formData.tags.includes(next)) {
                    updateForm("tags", [...formData.tags, next]);
                    setTagInput("");
                  }
                }}
                aria-label="Add a tag"
                placeholder="Add tag..."
                className="min-w-[80px] flex-1 py-1 text-sm outline-none"
              />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="mb-1 text-lg font-bold text-ink">Media Assets</h3>
            <p className="mb-4 text-sm text-ink-soft">High-quality visuals increase engagement.</p>
          </div>
          <MediaUpload
            folder="banners"
            accept="image/*"
            value={formData.bannerImage ?? ""}
            label="Upload Event Banner"
            onUploaded={(url) => updateForm("bannerImage", url)}
            buttonClassName="relative mx-auto flex aspect-square w-full max-w-xs flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border-2 border-dashed border-line-loud bg-muted text-ink-soft transition hover:border-line-loud disabled:opacity-60"
          />
          <p className="text-xs text-ink-soft">1080 × 1080px square recommended (JPG, PNG)</p>
          <div>
            <label className="mb-2 block text-2xs font-bold uppercase tracking-wider text-ink-soft">Gallery</label>
            <div className="flex flex-wrap items-center gap-3">
              <MediaUpload
                folder="gallery"
                accept={IMAGE_AND_VIDEO_ACCEPT}
                multiple
                label="+"
                className="shrink-0"
                buttonClassName="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-dashed border-line-loud bg-muted text-lg text-ink-soft"
                onUploaded={(url) => updateForm("galleryImages", [...(formData.galleryImages ?? []), url])}
              />
              {(formData.galleryImages ?? []).map((img, i) => (
                <div key={img + i} className="group relative h-16 w-16 overflow-hidden rounded-xl">
                  {isVideoUrl(img) ? (
                    <video src={img} muted className="h-full w-full object-cover" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt={`gallery ${i + 1}`} className="h-full w-full object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => updateForm("galleryImages", (formData.galleryImages ?? []).filter((_, idx) => idx !== i))}
                    className="absolute right-0.5 top-0.5 h-4 w-4 rounded-full bg-black/70 text-2xs text-ink-invert opacity-0 group-hover:opacity-100"
                    aria-label="Remove image"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="wiz-video" className="mb-2 block text-2xs font-bold uppercase tracking-wider text-ink-soft">
              Video Promo URL
            </label>
            <input
              id="wiz-video"
              type="url"
              value={formData.videoUrl}
              onChange={(e) => updateForm("videoUrl", e.target.value)}
              placeholder="https://youtube.com/..."
              className="w-full rounded-xl border border-line bg-paper px-4 py-3 text-sm outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
