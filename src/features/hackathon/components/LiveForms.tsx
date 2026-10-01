"use client";

import { useActionState, useState } from "react";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import type { ActionResult } from "@/src/lib/action";
import type { HackathonSettings } from "../live";

type Action = (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;

/**
 * Spec 3.4's broadcast tool.
 *
 * The email switch is the important control, and it defaults on: most
 * participants have no account, so there is no in-app inbox to reach them and
 * an announcement nobody is told about is just a note on a page they may not
 * reopen. Off is still offered, for something that only needs to be on record.
 */
export function AnnouncementForm({
    tracks,
    audienceCount,
    action,
}: {
    tracks: { id: string; name: string }[];
    audienceCount: number;
    action: Action;
}) {
    const [state, formAction] = useActionState<ActionResult | null, FormData>(action, null);
    // Controlled, not `defaultChecked`: React resets an uncontrolled checkbox
    // when the action's state change re-renders the form, so a refusal over a
    // missing title would silently un-tick "email it" while leaving the typed
    // text in place -- and the next attempt would post to nobody.
    const [alsoEmail, setAlsoEmail] = useState(true);

    return (
        <form action={formAction} className="flex flex-col gap-4">
            {state?.error ? <FormFeedback error={state.error} /> : null}
            {state?.success && !state.error ? <FormFeedback success="Posted." /> : null}

            <div className="flex flex-col gap-1.5">
                <label htmlFor="ann-title" className={labelClass}>Title</label>
                <input
                    id="ann-title"
                    name="title"
                    required
                    maxLength={160}
                    placeholder="Judging starts at 4pm, not 3pm"
                    className={fieldClass}
                />
            </div>

            <div className="flex flex-col gap-1.5">
                <label htmlFor="ann-body" className={labelClass}>Message</label>
                <textarea
                    id="ann-body"
                    name="body"
                    required
                    rows={4}
                    maxLength={4000}
                    placeholder="What changed, and what people should do about it."
                    className={fieldClass}
                />
            </div>

            <div className="flex flex-col gap-1.5">
                <label htmlFor="ann-track" className={labelClass}>Who sees it</label>
                <select id="ann-track" name="trackId" defaultValue="" className={fieldClass}>
                    <option value="">Everyone registered for this hackathon</option>
                    {tracks.map((t) => (
                        <option key={t.id} value={t.id}>
                            Only teams on {t.name}
                        </option>
                    ))}
                </select>
            </div>

            <label className="flex items-start gap-2.5 text-sm text-ink">
                <input
                    type="checkbox"
                    name="sendEmail"
                    value="true"
                    checked={alsoEmail}
                    onChange={(e) => setAlsoEmail(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-current"
                />
                <span>
                    Email it as well as posting it
                    <span className="block text-xs text-ink-soft">
                        {audienceCount
                            ? `Up to ${audienceCount} registered participant${audienceCount === 1 ? "" : "s"}. Most have no account, so email is the only way they are told.`
                            : "Nobody has registered yet, so there is nobody to email."}
                    </span>
                </span>
            </label>

            <div>
                <SubmitButton pendingText="Posting…" className={buttonClass("primary", "sm")}>
                    Post announcement
                </SubmitButton>
            </div>
        </form>
    );
}

/**
 * Spec 3.5's online-mode switch.
 *
 * Only YouTube and Zoom links are accepted, and only their embed forms. The
 * spectator page puts this in an iframe, and an arbitrary URL there is somebody
 * else's script running in a frame of our own origin — so the server validates
 * it too, and refuses rather than storing something that will not embed.
 */
export function HackathonSettingsForm({
    settings,
    spectatorHref,
    action,
}: {
    settings: HackathonSettings;
    spectatorHref: string;
    action: Action;
}) {
    const [state, formAction] = useActionState<ActionResult | null, FormData>(action, null);
    // Reflects what the server last stored. It is not seeded from local state
    // on purpose: React resets a checkbox when the action's re-render lands, so
    // the only value that can be trusted after a submit is the saved one.
    const [online, setOnline] = useState(settings.onlineMode);

    return (
        <form action={formAction} className="flex flex-col gap-4">
            {/* A bad livestream link comes back as `error` alongside `success`,
                so it reads as "saved, but" rather than as a failure. */}
            {state?.error ? <FormFeedback error={state.error} /> : null}
            {state?.success && !state.error ? <FormFeedback success="Saved." /> : null}

            <label className="flex items-start gap-2.5 text-sm text-ink">
                <input
                    type="checkbox"
                    name="onlineMode"
                    value="true"
                    checked={online}
                    onChange={(e) => setOnline(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-current"
                />
                <span>
                    Run this hackathon online
                    <span className="block text-xs text-ink-soft">
                        Opens a public spectator page per track: the live leaderboard, the stream, and your
                        sponsors.
                    </span>
                </span>
            </label>

            <div className="flex flex-col gap-1.5">
                <label htmlFor="livestream" className={labelClass}>Livestream link</label>
                <input
                    id="livestream"
                    name="livestreamUrl"
                    type="url"
                    inputMode="url"
                    maxLength={500}
                    defaultValue={settings.livestreamUrl}
                    placeholder="https://youtu.be/… or https://zoom.us/j/…"
                    className={fieldClass}
                />
                <p className="text-xs text-ink-soft">
                    YouTube or Zoom. Anything else is refused rather than stored, because the spectator page
                    embeds it.
                </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <SubmitButton pendingText="Saving…" className={buttonClass("secondary", "sm")}>
                    Save
                </SubmitButton>
                {settings.onlineMode ? (
                    <a href={spectatorHref} className="text-xs font-medium text-ink hover:underline">
                        Open the spectator view
                    </a>
                ) : null}
            </div>
        </form>
    );
}
