"use client";

import { Clock, MapPin, ChevronDown, X, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { createAgendaAction } from "@/src/features/agendas/actions/createAgenda.action";
import { Speaker } from "@/src/services/models/event.model";
import { DateField } from "@/src/shared_components/DateField";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";

interface CreateAgendaFormProps {
    eventId: string;
    organizerId: string;
    activeSpeakers?: Speaker[];
}

export default function CreateAgendaForm({ eventId, organizerId, activeSpeakers }: CreateAgendaFormProps) {
    const router = useRouter();

    const boundAction = createAgendaAction.bind(null, eventId, organizerId);
    const [state, formAction, isPending] = useActionState(boundAction, null);

    // Navigating during render is a side effect in the render phase: React can
    // call this twice, and the push fires before the tree has committed. It
    // belongs in an effect.
    useEffect(() => {
        if (state?.success) {
            router.push(`/organizer/${organizerId}/events/${eventId}/agenda`);
        }
    }, [state?.success, router, organizerId, eventId]);

    // Left padding clears the icon sitting inside the field.
    const iconFieldClass = `${fieldClass} pl-11`;

    return (
        <div className="w-full max-w-4xl rounded-2xl border border-line bg-paper">

            <div className="flex items-center justify-between border-b border-line px-8 py-6">
                <h2 className="font-display text-xl text-ink">Add New Session</h2>
                <button
                    type="button"
                    onClick={() => router.back()}
                    aria-label="Close"
                    className={buttonClass("ghost", "sm")}
                >
                    <X size={18} aria-hidden="true" />
                </button>
            </div>

            <form action={formAction}>
                <div className="max-h-[75vh] space-y-5 overflow-y-auto px-8 py-6">

                    {state?.error && <FormFeedback error={state.error} />}

                    <div>
                        <label htmlFor="agenda-title" className={labelClass}>
                            Session Title <span aria-hidden="true">*</span>
                        </label>
                        <input
                            id="agenda-title"
                            type="text"
                            name="title"
                            required
                            placeholder="e.g., Opening Ceremony"
                            className={`${fieldClass} mt-1.5`}
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <div>
                            <label htmlFor="agenda-type" className={labelClass}>
                                Session Type <span aria-hidden="true">*</span>
                            </label>
                            <div className="relative mt-1.5">
                                <select
                                    id="agenda-type"
                                    name="sessionType"
                                    required
                                    className={`${fieldClass} appearance-none pr-10`}
                                >
                                    <option value="talk">Talk</option>
                                    <option value="workshop">Workshop</option>
                                    <option value="panel">Panel</option>
                                    <option value="keynote">Keynote</option>
                                    <option value="networking">Networking</option>
                                    <option value="break">Break</option>
                                    <option value="qna">Q&amp;A</option>
                                    <option value="registration">Registration</option>
                                    <option value="closing">Closing</option>
                                </select>
                                <ChevronDown
                                    size={18}
                                    aria-hidden="true"
                                    className="pointer-events-none absolute inset-y-0 right-3 my-auto text-ink-soft"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="agenda-status" className={labelClass}>
                                Status
                            </label>
                            <div className="relative mt-1.5">
                                <select
                                    id="agenda-status"
                                    name="status"
                                    className={`${fieldClass} appearance-none pr-10`}
                                >
                                    <option value="confirmed">Confirmed</option>
                                    <option value="tentative">Tentative</option>
                                    <option value="cancelled">Cancelled</option>
                                    <option value="completed">Completed</option>
                                </select>
                                <ChevronDown
                                    size={18}
                                    aria-hidden="true"
                                    className="pointer-events-none absolute inset-y-0 right-3 my-auto text-ink-soft"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <div>
                            <label htmlFor="agenda-date" className={labelClass}>
                                Date <span aria-hidden="true">*</span>
                            </label>
                            {/* No leading icon: DateField already renders its own calendar button. */}
                            <div className="mt-1.5">
                                <DateField id="agenda-date" name="date" required className={`${fieldClass} pr-10`} />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="agenda-start" className={labelClass}>
                                Start Time <span aria-hidden="true">*</span>
                            </label>
                            <div className="relative mt-1.5">
                                <Clock
                                    size={18}
                                    aria-hidden="true"
                                    className="pointer-events-none absolute inset-y-0 left-3.5 my-auto text-ink-soft"
                                />
                                <input
                                    id="agenda-start"
                                    type="time"
                                    name="startTime"
                                    required
                                    className={`${iconFieldClass} tabular-nums`}
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="agenda-end" className={labelClass}>
                            End Time <span aria-hidden="true">*</span>
                        </label>
                        <div className="relative mt-1.5 w-full md:w-1/2">
                            <Clock
                                size={18}
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-y-0 left-3.5 my-auto text-ink-soft"
                            />
                            <input
                                id="agenda-end"
                                type="time"
                                name="endTime"
                                required
                                className={`${iconFieldClass} tabular-nums`}
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="agenda-location" className={labelClass}>
                            Location / Room
                        </label>
                        <div className="relative mt-1.5">
                            <MapPin
                                size={18}
                                aria-hidden="true"
                                className="pointer-events-none absolute inset-y-0 left-3.5 my-auto text-ink-soft"
                            />
                            <input
                                id="agenda-location"
                                type="text"
                                name="location"
                                placeholder="e.g., Main Hall A"
                                className={iconFieldClass}
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="agenda-speaker" className={labelClass}>Speaker</label>
                        {/* name="speakerNames" and value=name, both load-bearing: the action reads
                            `speakerNames` and splits it into names. It was `selectedEventId` posting
                            a speakerId, so every session was saved with no speaker at all. */}
                        {activeSpeakers?.length ? (
                            <div className="relative mt-1.5">
                                <select
                                    id="agenda-speaker"
                                    name="speakerNames"
                                    defaultValue=""
                                    className={`${fieldClass} appearance-none pr-10`}
                                >
                                    <option value="">No speaker</option>
                                    {activeSpeakers.map((x) => (
                                        <option key={x.speakerId} value={x.name}>
                                            {x.name}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown
                                    size={18}
                                    aria-hidden="true"
                                    className="pointer-events-none absolute inset-y-0 right-3 my-auto text-ink-soft"
                                />
                            </div>
                        ) : (
                            <p className="mt-1.5 text-sm text-ink-soft">
                                No speakers added to this event yet — add one from the Speakers tab to
                                attach it to a session.
                            </p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="agenda-description" className={labelClass}>
                            Description
                        </label>
                        <textarea
                            id="agenda-description"
                            name="description"
                            rows={3}
                            placeholder="Provide a brief overview of what attendees can expect..."
                            className={`${fieldClass} mt-1.5 resize-none`}
                        />
                    </div>
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-line px-8 py-5 md:flex-row md:justify-end">
                    <button
                        type="button"
                        className={buttonClass("secondary", "md")}
                        onClick={() => router.back()}
                    >
                        Cancel
                    </button>
                    <button type="submit" disabled={isPending} className={buttonClass("primary", "md")}>
                        {isPending ? (
                            <>
                                <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                Saving…
                            </>
                        ) : (
                            <>
                                <CheckCircle size={16} aria-hidden="true" />
                                Save Session
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
