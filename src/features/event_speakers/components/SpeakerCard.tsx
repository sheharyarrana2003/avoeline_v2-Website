import { Speaker } from "@/src/services/models/event.model";
import { formatTime } from "@/src/lib/datetime";
import { SpeakerPhoto } from "./SpeakerPhoto";

export function SpeakerCard({ speaker, sessions = [] }: { speaker: Speaker; sessions?: string[] }) {
    const initials = speaker.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
    // Stored as 24h "HH:mm" straight off <input type="time">; blank until a session
    // is scheduled, so the whole row goes rather than rendering an empty dash.
    const slot = [speaker.start_time, speaker.end_time].filter(Boolean).map(formatTime).join(' – ');

    return (
        // A genuine container: a grid tile that has to hold together as one unit.
        <div className="flex flex-col items-center rounded-2xl border border-line bg-paper p-6 text-center">
            <SpeakerPhoto src={speaker.profileImage} alt="" initials={initials} />

            <h3 className="font-display text-lg text-ink">{speaker.name}</h3>

            {(speaker.designation || speaker.company) && (
                <p className="mt-1 text-sm text-ink-soft">
                    {[speaker.designation, speaker.company].filter(Boolean).join(" · ")}
                </p>
            )}

            {/* Was four identical grey paragraphs stacked with mb-6 each — designation,
                purpose and both raw times, all at the same weight, so nothing read as
                subordinate to anything else. */}
            {(speaker.purpose || slot) && (
                <dl className="mt-4 w-full space-y-1.5 border-t border-line pt-4 text-left">
                    {speaker.purpose && (
                        <div className="flex justify-between gap-3">
                            <dt className="text-2xs font-medium uppercase text-ink-soft">Purpose</dt>
                            <dd className="text-xs text-ink">{speaker.purpose}</dd>
                        </div>
                    )}
                    {slot && (
                        <div className="flex justify-between gap-3">
                            <dt className="text-2xs font-medium uppercase text-ink-soft">Time</dt>
                            <dd className="text-xs text-ink tabular-nums">{slot}</dd>
                        </div>
                    )}
                </dl>
            )}

            {(speaker.email || speaker.phone || speaker.linkedin || speaker.twitter || speaker.website) && (
                <dl className="mt-3 w-full space-y-1.5 border-t border-line pt-3 text-left">
                    {speaker.email && (
                        <div className="flex justify-between gap-3">
                            <dt className="text-2xs font-medium uppercase text-ink-soft">Email</dt>
                            <dd className="truncate text-xs text-ink">{speaker.email}</dd>
                        </div>
                    )}
                    {speaker.phone && (
                        <div className="flex justify-between gap-3">
                            <dt className="text-2xs font-medium uppercase text-ink-soft">Phone</dt>
                            <dd className="text-xs text-ink tabular-nums">{speaker.phone}</dd>
                        </div>
                    )}
                    {(speaker.linkedin || speaker.twitter) && (
                        <div className="flex justify-between gap-3">
                            <dt className="text-2xs font-medium uppercase text-ink-soft">Links</dt>
                            <dd className="flex gap-2 text-xs">
                                {speaker.linkedin && (
                                    <a href={speaker.linkedin} target="_blank" rel="noopener noreferrer" className="text-ink underline">
                                        LinkedIn
                                    </a>
                                )}
                                {speaker.twitter && (
                                    <a href={speaker.twitter} target="_blank" rel="noopener noreferrer" className="text-ink underline">
                                        X
                                    </a>
                                )}
                                {speaker.website && (
                                    <a href={speaker.website} target="_blank" rel="noopener noreferrer" className="text-ink underline">
                                        Site
                                    </a>
                                )}
                            </dd>
                        </div>
                    )}
                    {!speaker.isContactPublic && (speaker.email || speaker.phone) && (
                        <p className="pt-1 text-2xs text-ink-faint">
                            The speaker asked for their contact details not to be shown publicly.
                        </p>
                    )}
                </dl>
            )}

            {(sessions.length || speaker.sessionTitle) ? (
                <div className="mt-4 flex flex-wrap gap-2">
                    {(sessions.length ? sessions : [speaker.sessionTitle]).filter(Boolean).map((title) => (
                        <span key={title} className="rounded-full border border-line px-4 py-1.5 text-xs font-medium text-ink-soft">
                            {title}
                        </span>
                    ))}
                </div>
            ) : null}
        </div>
    );
}
