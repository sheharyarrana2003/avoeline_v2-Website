"use client"

// lucide dropped its brand glyphs, so LinkedIn and Twitter get generic marks; the
// inputs carry the actual naming via aria-label and placeholder.
import { Link2, AtSign, Globe, Mail, Phone, X } from "lucide-react";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import { MediaUpload } from "@/src/features/media/MediaUpload";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";

const BIO_LIMIT = 500;

/** Icon-prefixed field: the icon sits in a joined leading cell, not inside the input. */
function PrefixedField({
    icon,
    children,
}: {
    icon: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <div className="flex">
            <span
                aria-hidden="true"
                className="flex items-center justify-center rounded-l-lg border border-r-0 border-line-loud bg-canvas px-3 text-xs font-medium text-ink-soft"
            >
                {icon}
            </span>
            {children}
        </div>
    );
}

export default function CreateSpeakerForm({ handle_speaker_submission }: { handle_speaker_submission: (formData: FormData) => void | Promise<void> }) {
    const router = useRouter();
    const [photoUrl, setPhotoUrl] = useState<string>("");
    const [bio, setBio] = useState<string>("");

    // Joins onto the prefix cell above, so it drops its own left radius and border.
    const prefixedInput = `${fieldClass} rounded-l-none`;

    return (
        <div className="w-full max-w-4xl rounded-2xl border border-line bg-paper p-8">
            <div className="mb-8 flex items-center justify-between">
                <h2 className="font-display text-xl text-ink">Add New Speaker</h2>
                {/* Was a bare <button> with no handler sitting where a close control belongs.
                    Wired to the same route pop as Cancel rather than deleted, because the
                    form renders as a modal over the speakers list. */}
                <button
                    type="button"
                    onClick={() => router.back()}
                    aria-label="Close"
                    className={buttonClass("ghost", "sm")}
                >
                    <X size={18} aria-hidden="true" />
                </button>
            </div>

            <form action={handle_speaker_submission}>
                <div className="grid grid-cols-1 gap-x-12 gap-y-8 md:grid-cols-2">

                    <div className="space-y-6">
                        <div className="flex flex-col items-center justify-center rounded-2xl border border-line p-8">
                            <MediaUpload
                                folder="speaker-avatars"
                                accept="image/*"
                                value={photoUrl || null}
                                label="Upload Photo"
                                onUploaded={setPhotoUrl}
                                buttonClassName="relative flex h-24 w-24 flex-col items-center justify-center gap-1 overflow-hidden rounded-full border-2 border-dashed border-line-loud bg-canvas text-ink-soft transition hover:border-gray-900 disabled:opacity-60"
                            />
                            {/* Uploaded avatar URL rides the form's server action. */}
                            <input type="hidden" name="profileImage" value={photoUrl} />
                        </div>

                        <div>
                            <label htmlFor="speaker-name" className={labelClass}>Full Name *</label>
                            <input id="speaker-name" name="speakerName" type="text" placeholder="e.g. Sarah Jenkins" className={`${fieldClass} mt-1.5`} required />
                        </div>
                        <div>
                            <label htmlFor="speaker-title" className={labelClass}>Title/Designation *</label>
                            <input id="speaker-title" name="title" type="text" placeholder="e.g. Chief Innovation Officer" className={`${fieldClass} mt-1.5`} required />
                        </div>
                        <div>
                            <label htmlFor="speaker-company" className={labelClass}>Company/Organization *</label>
                            <input id="speaker-company" name="company" type="text" placeholder="e.g. Acme Tech Global" className={`${fieldClass} mt-1.5`} required />
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <div className="mb-1.5 flex items-end justify-between">
                                <label htmlFor="speaker-bio" className={labelClass}>Biography</label>
                                {/* Was a hardcoded "0 / 500" that never moved, next to a textarea
                                    with no limit at all. Now both are real. */}
                                <span className="text-xs font-medium text-ink-soft tabular-nums">
                                    {bio.length} / {BIO_LIMIT}
                                </span>
                            </div>
                            <textarea
                                id="speaker-bio"
                                name="bio"
                                maxLength={BIO_LIMIT}
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                placeholder="Tell us about the speaker..."
                                className={`${fieldClass} h-[132px] resize-none`}
                            />
                        </div>

                        <div>
                            <span className={labelClass}>Social Profiles</span>
                            <div className="mt-1.5 space-y-3">
                                <PrefixedField icon={<Link2 size={16} />}>
                                    <input name="linkedin" type="url" aria-label="LinkedIn URL" placeholder="LinkedIn URL" className={prefixedInput} />
                                </PrefixedField>
                                <PrefixedField icon={<AtSign size={16} />}>
                                    <input name="twitter" type="url" aria-label="Twitter URL" placeholder="Twitter URL" className={prefixedInput} />
                                </PrefixedField>
                                <PrefixedField icon={<Globe size={16} />}>
                                    <input name="website" type="url" aria-label="Website URL" placeholder="Website URL" className={prefixedInput} />
                                </PrefixedField>
                            </div>
                        </div>

                        <div>
                            <span className={labelClass}>Agenda</span>
                            <div className="mt-1.5 space-y-3">
                                <PrefixedField icon="Purpose">
                                    <input name="purpose" type="text" aria-label="Session purpose" placeholder="Opening ceremony…" className={prefixedInput} />
                                </PrefixedField>
                                {/* start_time / end_time, with underscores: the form posted
                                    "start-time" and the service read "start_time", so every
                                    speaker was saved with blank session times. */}
                                <PrefixedField icon="Start Time">
                                    <input name="start_time" type="time" aria-label="Session start time" className={`${prefixedInput} tabular-nums`} />
                                </PrefixedField>
                                <PrefixedField icon="End Time">
                                    <input name="end_time" type="time" aria-label="Session end time" className={`${prefixedInput} tabular-nums`} />
                                </PrefixedField>
                            </div>
                        </div>
                    </div>
                </div>

                <hr className="my-8 border-line" />

                <div>
                    <span className={labelClass}>Direct Contact</span>
                    <div className="mt-4 flex flex-col gap-4 md:flex-row md:gap-8">
                        <div className="flex items-center gap-3 text-ink-soft">
                            <Mail size={18} aria-hidden="true" />
                            <input type="email" name="email" aria-label="Email address" placeholder="Email Address" className={`${fieldClass} w-64`} />
                        </div>
                        <div className="flex items-center gap-3 text-ink-soft">
                            <Phone size={18} aria-hidden="true" />
                            <input type="tel" name="phone" aria-label="Phone number" placeholder="+1 (555) 000-0000" className={`${fieldClass} w-64`} />
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex justify-end gap-3 border-t border-line pt-6">
                    <button type="button" onClick={() => router.back()} className={buttonClass("secondary")}>
                        Cancel
                    </button>
                    <SubmitButton pendingText="Saving…" className={buttonClass("primary")}>
                        Save Speaker
                    </SubmitButton>
                </div>
            </form>
        </div>
    )
}
