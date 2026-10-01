import { SubmitButton } from "@/src/shared_components/SubmitButton";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import { saveHackathonConfigRow } from "../actions/tasks.action";
import { HACKATHON_CONFIG_KEYS, type HackathonConfigKey } from "../configKeys";
import { CTF_CONFIG_KEYS, isCtfKind, type HackathonKind } from "../kinds";

function toLocalInput(iso: unknown): string {
  const t = Date.parse(String(iso ?? ""));
  if (!Number.isFinite(t) || Number.isNaN(t)) return "";
  const d = new Date(t);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ConfigToggleRow({
  tracks,
  eventId,
  organizerId,
  meta,
  enabled,
  configValue,
}: {
  tracks: { id: string; name: string; kind?: string }[];
  eventId: string;
  organizerId: string;
  meta: HackathonConfigKey;
  enabled: boolean;
  configValue: Record<string, unknown>;
}) {
  const idBase = `cfg-${meta.key}`;
  const settingsPath = `/organizer/${organizerId}/events/${eventId}/settings`;
  const ctfOnly = CTF_CONFIG_KEYS.has(meta.key);
  const choices = tracks.filter((t) => !ctfOnly || isCtfKind(t.kind));
  return (
    <div className="rounded-xl border border-line bg-paper p-4">
      <form action={saveHackathonConfigRow} className="space-y-3">
        <input type="hidden" name="eventId" value={eventId} />
        <input type="hidden" name="organizerId" value={organizerId} />
        <input type="hidden" name="configKey" value={meta.key} />
        <input type="hidden" name="returnTo" value={settingsPath} />
        <label className="flex items-center gap-2 text-xs font-semibold text-ink">
          <input type="checkbox" name="enabled" defaultChecked={enabled} />
          {meta.label}
        </label>
        <p className="text-xs text-ink-soft">
          {meta.effect}
          {meta.toggleOnly ? " Stored only — the app does not enforce this." : ""}
        </p>
        <label className="flex items-center gap-2 text-xs text-ink">
          <input type="checkbox" name="allTracks" defaultChecked />
          All competitions{ctfOnly ? " (CTF only)" : ""}
        </label>
        <fieldset className="space-y-1">
          <legend className="text-2xs uppercase text-ink-soft">Or apply only to these competitions</legend>
          {choices.map((t) => (
            <label key={t.id} className="flex items-center gap-2 text-xs text-ink">
              <input type="checkbox" name="trackIds" value={t.id} />
              {t.name}
            </label>
          ))}
        </fieldset>
        {(meta.fields ?? []).map((field) =>
          field.type === "boolean" ? (
            <label key={field.name} className="flex items-center gap-2 text-xs text-ink">
              <input type="checkbox" name={`cfg_${field.name}`} defaultChecked={configValue[field.name] === true} />
              {field.label}
            </label>
          ) : (
            <div key={field.name}>
              <label htmlFor={`${idBase}-${field.name}`} className={labelClass}>
                {field.label}
              </label>
              <input
                id={`${idBase}-${field.name}`}
                name={`cfg_${field.name}`}
                type={field.type === "number" ? "number" : field.type === "datetime" ? "datetime-local" : "text"}
                min={field.type === "number" ? 0 : undefined}
                defaultValue={
                  field.type === "datetime"
                    ? toLocalInput(configValue[field.name])
                    : configValue[field.name] != null
                      ? String(configValue[field.name])
                      : ""
                }
                className={fieldClass}
              />
              {field.help ? <p className="mt-1 text-2xs text-ink-soft">{field.help}</p> : null}
            </div>
          ),
        )}
        <SubmitButton className={buttonClass("secondary", "sm")}>Save</SubmitButton>
      </form>
    </div>
  );
}

export function HackathonConfigPanel(props: {
  trackId: string;
  eventId: string;
  organizerId: string;
  rows: { config_key: string; enabled: boolean; config_value: unknown }[];
  kind?: HackathonKind;
  tracks?: { id: string; name: string; kind?: string }[];
}) {
  const byKey = new Map(props.rows.map((r) => [r.config_key, r]));
  const keys = HACKATHON_CONFIG_KEYS.filter((meta) => !CTF_CONFIG_KEYS.has(meta.key) || isCtfKind(props.kind));
  const tracks = props.tracks?.length
    ? props.tracks
    : [{ id: props.trackId, name: "This competition", kind: props.kind }];
  return (
    <div className="grid gap-2 md:grid-cols-2">
      {keys.map((meta) => {
        const row = byKey.get(meta.key);
        const value = row?.config_value && typeof row.config_value === "object" ? (row.config_value as Record<string, unknown>) : {};
        return (
          <ConfigToggleRow
            key={meta.key}
            tracks={tracks}
            eventId={props.eventId}
            organizerId={props.organizerId}
            meta={meta}
            enabled={Boolean(row?.enabled)}
            configValue={value}
          />
        );
      })}
    </div>
  );
}

export function HackathonEventConfigPanel(props: {
  eventId: string;
  organizerId: string;
  tracks: { id: string; name: string; kind: HackathonKind }[];
  rowsByTrack: Map<string, { config_key: string; enabled: boolean; config_value: unknown }[]>;
}) {
  const hasCtf = props.tracks.some((t) => isCtfKind(t.kind));
  return (
    <div className="grid gap-2 md:grid-cols-2">
      {HACKATHON_CONFIG_KEYS.filter((meta) => !CTF_CONFIG_KEYS.has(meta.key) || hasCtf).map((meta) => {
        const samples = props.tracks.flatMap((t) => props.rowsByTrack.get(t.id) ?? []).filter((r) => r.config_key === meta.key && r.enabled);
        const row = samples[0];
        const value = row?.config_value && typeof row.config_value === "object" ? (row.config_value as Record<string, unknown>) : {};
        return (
          <ConfigToggleRow
            key={meta.key}
            tracks={props.tracks}
            eventId={props.eventId}
            organizerId={props.organizerId}
            meta={meta}
            enabled={samples.length > 0}
            configValue={value}
          />
        );
      })}
    </div>
  );
}
