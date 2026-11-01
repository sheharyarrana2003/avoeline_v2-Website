"use client";

import { useState } from "react";
import { DateField } from "@/src/shared_components/DateField";
import type { EventFormData } from "@/src/services/models/event.model";
import { isValidMapsUrl, mapsUrlHint } from "@/src/lib/mapsUrl";
import { MapPreview } from "../MapPreview";
import { TimeField } from "../TimeField";
import { durationLabel, to24h } from "../wizardUtils";

export function ScheduleLocationStep({
  formData,
  updateForm,
}: {
  formData: EventFormData;
  updateForm: (field: keyof EventFormData, value: unknown) => void;
}) {
  const [hour12, setHour12] = useState(true);
  const [sameAsStart, setSameAsStart] = useState(false);
  const physical = formData.locationType !== "virtual";
  const virtual = formData.locationType !== "physical";

  const startDate = String(formData.startDate || "").trim();
  const endDate = String(formData.endDate || formData.startDate || "").trim();
  const endBeforeStart = Boolean(startDate && endDate && endDate < startDate);
  const startT = to24h(formData.startTime);
  const endT = to24h(formData.endTime);
  const sameDayEndBeforeStart = Boolean(
    startDate && endDate && startDate === endDate && startT && endT && endT < startT,
  );

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <div className="space-y-6">
        <h3 className="text-lg font-bold text-ink">Event Schedule</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-2 block text-xs text-ink-soft">Start Date</label>
            <DateField
              value={formData.startDate}
              onChange={(e) => {
                updateForm("startDate", e.target.value);
                if (sameAsStart) updateForm("endDate", e.target.value);
              }}
            />
          </div>
          <div>
            <label className="mb-2 block text-xs text-ink-soft">End Date</label>
            <DateField
              value={formData.endDate}
              onChange={(e) => updateForm("endDate", e.target.value)}
            />
            <label className="mt-2 flex items-center gap-2 text-xs text-ink-soft">
              <input
                type="checkbox"
                checked={sameAsStart}
                onChange={(e) => {
                  const on = e.target.checked;
                  setSameAsStart(on);
                  if (on) updateForm("endDate", formData.startDate);
                }}
              />
              Same as start date
            </label>
            {endBeforeStart ? (
              <p className="mt-2 text-xs text-red-600">
                End date must be on or after the start date.
              </p>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <TimeField
            id="wiz-start-time"
            label="Start time"
            value={formData.startTime}
            hour12={hour12}
            onHour12Change={setHour12}
            onChange={(v) => updateForm("startTime", v)}
          />
          <TimeField
            id="wiz-end-time"
            label="End time"
            value={formData.endTime}
            hour12={hour12}
            onHour12Change={setHour12}
            onChange={(v) => updateForm("endTime", v)}
          />
        </div>
        {sameDayEndBeforeStart ? (
          <p className="text-xs text-red-600">End time must be after start time on the same day.</p>
        ) : null}
        <p className="text-sm font-medium text-ink">
          {durationLabel(
            formData.startDate,
            formData.endDate,
            formData.startTime,
            formData.endTime,
          )}
        </p>
      </div>

      <div className="space-y-6">
        <h3 className="text-lg font-bold text-ink">Location</h3>
        <div className="flex flex-wrap gap-2">
          {(["physical", "virtual", "hybrid"] as const).map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => updateForm("locationType", kind)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${
                formData.locationType === kind ? "bg-ink text-ink-invert" : "bg-muted text-ink-soft"
              }`}
            >
              {kind}
            </button>
          ))}
        </div>

        {physical ? (
          <>
            <input
              value={formData.venueName}
              onChange={(e) => updateForm("venueName", e.target.value)}
              placeholder="Venue name"
              className="w-full rounded-xl border border-line px-4 py-3 text-sm outline-none"
            />
            <input
              value={formData.address}
              onChange={(e) => updateForm("address", e.target.value)}
              placeholder="Street address"
              className="w-full rounded-xl border border-line px-4 py-3 text-sm outline-none"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                value={formData.city}
                onChange={(e) => updateForm("city", e.target.value)}
                placeholder="City"
                className="rounded-xl border border-line px-4 py-3 text-sm outline-none"
              />
              <input
                value={formData.country || ""}
                onChange={(e) => updateForm("country", e.target.value)}
                placeholder="Country"
                className="rounded-xl border border-line px-4 py-3 text-sm outline-none"
              />
            </div>
            <div>
              <label htmlFor="wiz-map" className="mb-2 block text-xs text-ink-soft">
                Google Maps link
              </label>
              <input
                id="wiz-map"
                type="url"
                value={formData.mapsUrl || formData.mapUrl || ""}
                onChange={(e) => updateForm("mapsUrl", e.target.value)}
                placeholder="https://maps.app.goo.gl/… or maps.google.com/…"
                className="mb-1 w-full rounded-xl border border-line px-4 py-3 text-sm outline-none"
              />
              <p className="mb-3 text-2xs text-ink-soft">{mapsUrlHint()}</p>
              {(formData.mapsUrl || formData.mapUrl) &&
              !isValidMapsUrl(formData.mapsUrl || formData.mapUrl) ? (
                <p className="mb-2 text-xs text-red-600">Maps link must be an https:// URL.</p>
              ) : null}
              <MapPreview mapUrl={formData.mapsUrl || formData.mapUrl || ""} />
            </div>
          </>
        ) : null}

        {virtual ? (
          <div>
            <label htmlFor="wiz-meet" className="mb-2 block text-xs text-ink-soft">
              Meeting link
            </label>
            <input
              id="wiz-meet"
              type="url"
              value={formData.meetingLink}
              onChange={(e) => updateForm("meetingLink", e.target.value)}
              placeholder="https://meet.google.com/..."
              className="w-full rounded-xl border border-line px-4 py-3 text-sm outline-none"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
