"use client";

import type { EventFormData, WizardTrackDraft } from "@/src/services/models/event.model";
import { MediaUpload } from "@/src/features/media/MediaUpload";
import { DateField } from "@/src/shared_components/DateField";
import { emptyTrack } from "../wizardUtils";
import { HACKATHON_KINDS, HACKATHON_KIND_LABELS, type HackathonKind } from "@/src/features/hackathon/kinds";

export function HackathonTracksStep({
  formData,
  updateForm,
}: {
  formData: EventFormData;
  updateForm: (field: keyof EventFormData, value: unknown) => void;
}) {
  const tracks = formData.wizardTracks.length ? formData.wizardTracks : [emptyTrack({ name: "Main" })];

  const setTracks = (next: WizardTrackDraft[]) => updateForm("wizardTracks", next);
  const patch = (id: string, changes: Partial<WizardTrackDraft>) =>
    setTracks(tracks.map((t) => (t.id === id ? { ...t, ...changes } : t)));

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-ink">Competitions</h3>
        <p className="text-sm text-ink-soft">
          One hackathon event can run a single competition or several tracks, each with its own fee, media, and rules.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            updateForm("multiTrack", false);
            setTracks([tracks[0] ? { ...tracks[0], name: tracks[0].name || "Main" } : emptyTrack({ name: "Main" })]);
          }}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
            !formData.multiTrack ? "bg-ink text-ink-invert" : "bg-muted text-ink-soft"
          }`}
        >
          Single competition
        </button>
        <button
          type="button"
          onClick={() => updateForm("multiTrack", true)}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
            formData.multiTrack ? "bg-ink text-ink-invert" : "bg-muted text-ink-soft"
          }`}
        >
          Multiple competitions
        </button>
      </div>

      {tracks.map((track, index) => (
        <div key={track.id} className="space-y-3 rounded-2xl border border-line bg-paper p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-ink">
              {formData.multiTrack ? `Competition ${index + 1}` : "Main competition"}
            </p>
            {formData.multiTrack && tracks.length > 1 ? (
              <button type="button" onClick={() => setTracks(tracks.filter((t) => t.id !== track.id))} className="text-xs text-red-700">
                Remove
              </button>
            ) : null}
          </div>
          <input
            value={track.name}
            onChange={(e) => patch(track.id, { name: e.target.value })}
            placeholder="Track name"
            className="w-full rounded-xl border border-line px-4 py-2 text-sm outline-none"
          />
          <div>
            <label className="mb-1 block text-xs text-ink-soft">Competition type</label>
            <select
              value={track.kind || "ctf"}
              onChange={(e) => patch(track.id, { kind: e.target.value as HackathonKind })}
              className="w-full rounded-xl border border-line px-4 py-2 text-sm outline-none"
            >
              {HACKATHON_KINDS.map((k) => (
                <option key={k} value={k}>
                  {HACKATHON_KIND_LABELS[k]}
                </option>
              ))}
            </select>
          </div>
          <textarea
            value={track.description}
            onChange={(e) => patch(track.id, { description: e.target.value })}
            placeholder="What this competition is about"
            rows={3}
            className="w-full rounded-xl border border-line px-4 py-2 text-sm outline-none"
          />
          <MediaUpload
            folder="tracks"
            accept="image/*"
            value={track.imageUrl}
            label="Track image"
            onUploaded={(url) => patch(track.id, { imageUrl: url })}
          />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <LabeledNumber label="Fee (PKR)" value={track.fee} onChange={(n) => patch(track.id, { fee: n })} />
            <LabeledNumber label="Discount %" value={track.discountPercent} onChange={(n) => patch(track.id, { discountPercent: n })} />
            <LabeledNumber label="Min team" value={track.minTeamSize} onChange={(n) => patch(track.id, { minTeamSize: Math.max(1, n) })} />
            <LabeledNumber label="Max team" value={track.maxTeamSize} onChange={(n) => patch(track.id, { maxTeamSize: Math.max(1, n) })} />
          </div>
          <input
            value={track.discountNote}
            onChange={(e) => patch(track.id, { discountNote: e.target.value })}
            placeholder="Discount note (optional)"
            className="w-full rounded-xl border border-line px-4 py-2 text-sm outline-none"
          />
          <div>
            <label className="mb-1 block text-xs text-ink-soft">Discount expires</label>
            <DateField
              value={track.discountExpiresAt}
              onChange={(e) => patch(track.id, { discountExpiresAt: e.target.value })}
            />
          </div>
          <textarea
            value={track.policies}
            onChange={(e) => patch(track.id, { policies: e.target.value })}
            placeholder="Policies"
            rows={2}
            className="w-full rounded-xl border border-line px-4 py-2 text-sm outline-none"
          />
          <textarea
            value={track.instructions}
            onChange={(e) => patch(track.id, { instructions: e.target.value })}
            placeholder="Instructions for participants"
            rows={2}
            className="w-full rounded-xl border border-line px-4 py-2 text-sm outline-none"
          />
          <textarea
            value={track.rulesText || ""}
            onChange={(e) => patch(track.id, { rulesText: e.target.value })}
            placeholder="Rules (paste text; you can also upload a file after publish)"
            rows={4}
            className="w-full rounded-xl border border-line px-4 py-2 text-sm outline-none"
          />
        </div>
      ))}

      {formData.multiTrack ? (
        <button
          type="button"
          onClick={() => setTracks([...tracks, emptyTrack({ name: `Competition ${tracks.length + 1}` })])}
          className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink"
        >
          Add competition
        </button>
      ) : null}
    </div>
  );
}

function LabeledNumber({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <label className="text-xs text-ink-soft">
      {label}
      <input
        type="number"
        min={0}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm text-ink outline-none"
      />
    </label>
  );
}
