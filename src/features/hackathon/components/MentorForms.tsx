"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import type { ActionResult } from "@/src/lib/action";
import { MENTOR_EXPERTISE, type HackathonMentor, type MentorSlot } from "../live";

type Action = (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;

/**
 * Spec 3.4: a mentor signs themselves up with the hours they are free.
 *
 * No account, and the access code travels with the form so a private
 * hackathon's mentor sign-up is as gated as its registration — the server
 * re-decides that, this only carries the credential.
 */
export function MentorSignUpForm({
    accessCode,
    action,
}: {
    accessCode: string | null;
    action: Action;
}) {
    const [state, formAction] = useActionState<ActionResult | null, FormData>(action, null);

    return (
        <form action={formAction} className="flex flex-col gap-4">
            {accessCode ? <input type="hidden" name="accessCode" value={accessCode} /> : null}

            {state?.error ? <FormFeedback error={state.error} /> : null}
            {state?.success ? (
                <FormFeedback success="Thank you — you are listed, and teams can book your slots." />
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                    <label htmlFor="mentor-name" className={labelClass}>Your name</label>
                    <input id="mentor-name" name="name" required maxLength={120} className={fieldClass} />
                </div>
                <div className="flex flex-col gap-1.5">
                    <label htmlFor="mentor-email" className={labelClass}>Email</label>
                    <input id="mentor-email" name="email" type="email" required className={fieldClass} />
                </div>
            </div>

            <div className="flex flex-col gap-2">
                <span className={labelClass}>What you can help with</span>
                <div className="flex flex-wrap gap-2">
                    {MENTOR_EXPERTISE.map((tag) => {
                        const id = `mentor-${tag.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
                        return (
                            <label
                                key={tag}
                                htmlFor={id}
                                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-line-loud px-3 py-1.5 text-xs text-ink transition hover:border-ink has-checked:border-ink has-checked:bg-ink has-checked:text-ink-invert"
                            >
                                <input id={id} type="checkbox" name="expertise" value={tag} className="sr-only" />
                                {tag}
                            </label>
                        );
                    })}
                </div>
            </div>

            <div className="flex flex-col gap-1.5">
                <label htmlFor="mentor-bio" className={labelClass}>
                    A line about you <span className="normal-case text-ink-faint">(optional)</span>
                </label>
                <textarea id="mentor-bio" name="bio" rows={2} maxLength={1000} className={fieldClass} />
            </div>

            <div className="flex flex-col gap-1.5">
                <label htmlFor="mentor-slots" className={labelClass}>When you are free</label>
                <textarea
                    id="mentor-slots"
                    name="slots"
                    required
                    rows={4}
                    defaultValue=""
                    placeholder={"20/12/2026 | 10:00 AM | 11:00 AM\n20/12/2026 | 11:00 AM | 12:00 PM"}
                    className={`${fieldClass} font-mono text-xs`}
                />
                <p className="text-xs text-ink-soft">
                    One slot per line, as <span className="font-mono">date | from | to</span>. Signing up again with
                    the same email updates your hours, and a slot a team has already booked is never removed.
                </p>
            </div>

            <div>
                <SubmitButton pendingText="Signing up…" className={buttonClass("primary")}>
                    Offer these times
                </SubmitButton>
            </div>
        </form>
    );
}

/**
 * A team books or releases one mentor slot (spec 3.4).
 *
 * One form per slot rather than a select and a submit: the slot id is the whole
 * input, and a list of buttons is what a team scanning for a free hour actually
 * wants to click.
 */
export function MentorBooking({
    mentors,
    teamId,
    teamName,
    book,
    cancel,
}: {
    mentors: { mentor: HackathonMentor; open: MentorSlot[] }[];
    teamId: string;
    teamName: string;
    book: Action;
    cancel: Action;
}) {
    const [bookState, bookAction] = useActionState<ActionResult | null, FormData>(book, null);
    const [cancelState, cancelAction] = useActionState<ActionResult | null, FormData>(cancel, null);

    const held = mentors.flatMap(({ mentor }) =>
        mentor.slots.filter((s) => s.bookedByTeamId === teamId).map((slot) => ({ mentor, slot })),
    );

    return (
        <div className="flex flex-col gap-4">
            {bookState?.error ? <FormFeedback error={bookState.error} /> : null}
            {bookState?.success && !bookState.error ? <FormFeedback success="Booked." /> : null}
            {cancelState?.error ? <FormFeedback error={cancelState.error} /> : null}

            {held.length ? (
                <div>
                    <p className={labelClass}>{teamName} has booked</p>
                    <ul className="mt-2 divide-y divide-line border-y border-line">
                        {held.map(({ mentor, slot }) => (
                            <li key={`${mentor.id}-${slot.id}`} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                                <span className="text-sm text-ink">
                                    {mentor.name}
                                    <span className="text-ink-soft">
                                        {" "}
                                        · {slot.date} {slot.startTime}
                                        {slot.endTime ? `–${slot.endTime}` : ""}
                                    </span>
                                </span>
                                <form action={cancelAction}>
                                    <input type="hidden" name="mentorId" value={mentor.id} />
                                    <input type="hidden" name="slotId" value={slot.id} />
                                    <input type="hidden" name="teamId" value={teamId} />
                                    <SubmitButton
                                        pendingText="Releasing…"
                                        className="text-2xs uppercase text-ink-faint hover:text-ink"
                                    >
                                        Release
                                    </SubmitButton>
                                </form>
                            </li>
                        ))}
                    </ul>
                </div>
            ) : null}

            {mentors.length === 0 ? (
                <p className="text-sm text-ink-soft">No mentors have offered times yet.</p>
            ) : (
                <div className="flex flex-col gap-4">
                    {mentors.map(({ mentor, open }) => (
                        <div key={mentor.id} className="border-t border-line pt-4 first:border-t-0 first:pt-0">
                            <p className="text-sm font-medium text-ink">
                                {mentor.name}
                                {mentor.expertise.length ? (
                                    <span className="ml-2 text-2xs uppercase text-ink-faint">
                                        {mentor.expertise.join(" · ")}
                                    </span>
                                ) : null}
                            </p>
                            {mentor.bio ? <p className="mt-0.5 text-xs text-ink-soft">{mentor.bio}</p> : null}

                            {open.length ? (
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {open.map((slot) => (
                                        <form key={slot.id} action={bookAction}>
                                            <input type="hidden" name="mentorId" value={mentor.id} />
                                            <input type="hidden" name="slotId" value={slot.id} />
                                            <input type="hidden" name="teamId" value={teamId} />
                                            <SubmitButton
                                                pendingText="Booking…"
                                                className={buttonClass("secondary", "sm")}
                                            >
                                                {slot.date} · {slot.startTime}
                                            </SubmitButton>
                                        </form>
                                    ))}
                                </div>
                            ) : (
                                <p className="mt-1 text-xs text-ink-soft">No free slots left.</p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
