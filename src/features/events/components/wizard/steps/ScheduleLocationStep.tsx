"use client";

import { useState } from "react";
import { DateField } from "@/src/shared_components/DateField";
import type { EventFormData } from "@/src/services/models/event.model";
import { MapPreview } from "../MapPreview";
import { TimeField } from "../TimeField";
import { TIMEZONES, durationLabel } from "../wizardUtils";

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
            <DateField value={formData.endDate} onChange={(e) => updateForm("endDate", e.target.value)} />
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
        <p className="text-sm font-medium text-ink">
          {durationLabel(formData.startDate, formData.endDate, formData.startTime, formData.endTime)}
        </p>

        <div>
          <label htmlFor="wiz-tz" className="mb-2 block text-xs text-ink-soft">
            Timezone
          </label>
          <select
            id="wiz-tz"
            value={formData.timezone}
            onChange={(e) => updateForm("timezone", e.target.value)}
            className="w-full rounded-xl border border-line bg-paper px-4 py-3 text-sm outline-none"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>
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
                value={formData.postalCode}
                onChange={(e) => updateForm("postalCode", e.target.value)}
                placeholder="Postal code"
                className="rounded-xl border border-line px-4 py-3 text-sm outline-none"
              />
            </div>
            <div>
              <label htmlFor="wiz-map" className="mb-2 block text-xs text-ink-soft">
                Map link (Google Maps or OpenStreetMap)
              </label>
              <input
                id="wiz-map"
                type="url"
                value={formData.mapUrl}
                onChange={(e) => updateForm("mapUrl", e.target.value)}
                placeholder="https://maps.google.com/..."
                className="mb-3 w-full rounded-xl border border-line px-4 py-3 text-sm outline-none"
              />
              <MapPreview mapUrl={formData.mapUrl} />
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
