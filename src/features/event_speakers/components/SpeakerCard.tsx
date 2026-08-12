import { Speaker } from "@/src/services/models/event.model";
import { formatTime } from "@/src/lib/datetime";

export function SpeakerCard({ speaker }: { speaker: Speaker }) {
    const initials = speaker.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
    // Stored as 24h "HH:mm" straight off <input type="time">; blank until a session
    // is scheduled, so the whole row goes rather than rendering an empty dash.
    const slot = [speaker.start_time, speaker.end_time].filter(Boolean).map(formatTime).join(' – ');

    return (
        // A genuine container: a grid tile that has to hold together as one unit.
        <div className="flex flex-col items-center rounded-2xl border border-line bg-paper p-6 text-center">
            <div className="relative mb-4 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-gray-100">
                {speaker.profileImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={speaker.profileImage}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover grayscale"
                    />
                ) : (
                    <span aria-hidden="true" className="text-xl font-semibold text-ink-soft">
                        {initials}
                    </span>
                )}
            </div>

            <h3 className="font-display text-lg text-ink">{speaker.name}</h3>

            {speaker.designation && (
                <p className="mt-1 text-sm text-ink-soft">{speaker.designation}</p>
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

            {speaker.sessionTitle && (
                <span className="mt-4 rounded-full border border-line px-4 py-1.5 text-xs font-medium text-ink-soft">
                    {speaker.sessionTitle}
                </span>
            )}
        </div>
    );
}
