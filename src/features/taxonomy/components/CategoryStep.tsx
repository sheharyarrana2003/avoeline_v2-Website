"use client";

import React, { useState } from "react";
import { Layers, Calendar, CheckSquare, Sparkles } from "lucide-react";
import type { EventFormData } from "@/src/services/models/event.model";
import type {
  SuperCategoryDoc,
  EventFormatDoc,
  CategoryFieldSetDoc,
} from "../categoryEngine.types";
import { DynamicFieldRenderer } from "./DynamicFieldRenderer";
import { RequestCategoryModal } from "./RequestCategoryModal";
import { fieldClass, labelClass } from "@/src/lib/ui";
import type { TaxonomyEntry } from "../types";

export type CategoryStepProps = {
  superCategories?: SuperCategoryDoc[];
  eventFormats?: EventFormatDoc[];
  fieldSets?: CategoryFieldSetDoc[];
  /** Legacy fallback entries if provided */
  entries?: TaxonomyEntry[];
  superCategoryId: string;
  eventFormatId: string;
  categoryFields?: Record<string, any>;
  customFieldValues?: Record<string, any>;
  onChange: (patch: Partial<EventFormData>) => void;
  hideHackathonFormats?: boolean;
};

function isHackathonFormat(f: { id?: string; name?: string }) {
  const id = String(f.id || "").toLowerCase();
  const name = String(f.name || "").toLowerCase();
  return id === "hackathon" || name === "hackathon" || id.includes("hackathon") || name.includes("hackathon");
}

export function CategoryStep({
  superCategories = [],
  eventFormats = [],
  fieldSets = [],
  entries = [],
  superCategoryId,
  eventFormatId,
  categoryFields = {},
  customFieldValues = {},
  onChange,
  hideHackathonFormats = false,
}: CategoryStepProps) {
  // Normalize lists: if new props are empty, fallback to legacy entries
  const availableSuperCategories: Array<{ id: string; name: string; description?: string }> =
    superCategories.length > 0
      ? superCategories.filter((c) => c.active !== false)
      : entries.filter((e) => e.kind === "super" && e.status === "approved" && e.active !== false);

  const availableEventFormats: Array<{ id: string; name: string; description?: string }> = (
    eventFormats.length > 0
      ? eventFormats.filter((f) => f.active !== false)
      : entries.filter((e) => e.kind === "format" && e.status === "approved" && e.active !== false)
  ).filter((f) => !hideHackathonFormats || !isHackathonFormat(f));

  const chosenSuper = availableSuperCategories.find((s) => s.id === superCategoryId);
  const chosenFormat = availableEventFormats.find((f) => f.id === eventFormatId);

  // Find matching fieldSet for the chosen superCategory
  const matchingFieldSet = fieldSets.find(
    (fs) => fs.superCategoryId === superCategoryId || fs.id === superCategoryId
  );

  // Fallback to legacy fields on the entry if no fieldSet doc
  const activeFields =
    matchingFieldSet?.fields ||
    (chosenSuper && "fields" in chosenSuper && Array.isArray((chosenSuper as any).fields)
      ? (chosenSuper as any).fields.map((f: any) => ({
          key: f.fieldId || f.key || "",
          label: f.label || "",
          type: f.type === "dropdown" ? "select" : f.type || "text",
          options: f.options || [],
          required: Boolean(f.required),
        }))
      : []);

  const handleSuperChange = (id: string) => {
    const item = availableSuperCategories.find((s) => s.id === id);
    onChange({
      superCategoryId: id,
      categorySuperId: id,
      category: item?.name || "",
      categoryFields: {},
      customFieldValues: {},
    });
  };

  const handleFormatChange = (id: string) => {
    const item = availableEventFormats.find((f) => f.id === id);
    onChange({
      eventFormatId: id,
      categoryFormatId: id,
      eventType: item?.name || "",
    });
  };

  const handleCustomFieldChange = (key: string, value: any) => {
    const mergedValues = {
      ...(customFieldValues || {}),
      ...(categoryFields || {}),
      [key]: value,
    };
    onChange({
      customFieldValues: mergedValues,
      categoryFields: mergedValues,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header & Organizer Request Category Action */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
        <div>
          <h3 className="text-base font-semibold text-ink">
            Category & Event Format
          </h3>
          <p className="text-xs text-ink-soft">
            Select the primary domain and format for your event.
          </p>
        </div>

        {/* Organizer Flow: Request a new category modal */}
        <RequestCategoryModal />
      </div>

      {/* Two Live Dropdowns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-5 rounded-2xl border border-line bg-muted">
        {/* Dropdown 1: Super Category */}
        <div className="space-y-2">
          <label htmlFor="superCategoryId" className={labelClass}>
            <span className="flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-ink" />
              <span>Super Category *</span>
            </span>
          </label>
          <select
            id="superCategoryId"
            value={superCategoryId}
            onChange={(e) => handleSuperChange(e.target.value)}
            className={fieldClass}
          >
            <option value="">-- Choose Super Category --</option>
            {availableSuperCategories.map((sc) => (
              <option key={sc.id} value={sc.id}>
                {sc.name}
              </option>
            ))}
          </select>
          {chosenSuper?.description ? (
            <p className="text-xs text-ink-soft">
              {chosenSuper.description}
            </p>
          ) : (
            <p className="text-[11px] text-ink-soft">
              Primary topic or industry theme.
            </p>
          )}
        </div>

        {/* Dropdown 2: Event Format */}
        <div className="space-y-2">
          <label htmlFor="eventFormatId" className={labelClass}>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-ink" />
              <span>Event Format *</span>
            </span>
          </label>
          <select
            id="eventFormatId"
            value={eventFormatId}
            onChange={(e) => handleFormatChange(e.target.value)}
            className={fieldClass}
          >
            <option value="">-- Choose Event Format --</option>
            {availableEventFormats.map((ef) => (
              <option key={ef.id} value={ef.id}>
                {ef.name}
              </option>
            ))}
          </select>
          {chosenFormat?.description ? (
            <p className="text-xs text-ink-soft">
              {chosenFormat.description}
            </p>
          ) : (
            <p className="text-[11px] text-ink-soft">
              Delivery mechanism (e.g. Conference, Hackathon, Workshop).
            </p>
          )}
        </div>
      </div>

      {/* Step 2: Dynamic Category Custom Fields */}
      {superCategoryId && activeFields.length > 0 && (
        <div className="p-5 rounded-2xl border border-line bg-paper shadow-sm animate-fadeIn">
          <DynamicFieldRenderer
            fields={activeFields}
            values={{ ...(customFieldValues || {}), ...(categoryFields || {}) }}
            onChange={handleCustomFieldChange}
          />
        </div>
      )}
    </div>
  );
}

export default CategoryStep;
