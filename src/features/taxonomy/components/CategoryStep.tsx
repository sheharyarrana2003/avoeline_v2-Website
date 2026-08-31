"use client";

import { useActionState, useState } from "react";
import { ListChecks, Plus } from "lucide-react";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { buttonClass, fieldClass, labelClass } from "@/src/lib/ui";
import type { ActionResult } from "@/src/lib/action";
import type { CustomFieldOption, EventFormData } from "@/src/services/models/event.model";
import { requestCategoryAction } from "../actions/taxonomy.action";
import { resolveChecklist, selectable, type CategoryAnswers, type TaxonomyEntry } from "../types";

export type CategoryStepProps = {
    /** Selectable entries of both kinds, already filtered by the page. */
    entries: TaxonomyEntry[];
    superCategoryId: string;
    eventFormatId: string;
    categoryFields: CategoryAnswers;
    /** Patches several wizard fields at once -- a category change moves three. */
    onChange: (patch: Partial<EventFormData>) => void;
};

/**
 * Step 1's category block: the two database-driven dropdowns, the request-a-new-
 * one form, the chosen category's extra fields, and the checklist preview.
 *
 * One component rather than four, because all four read the same `entries` array
 * and three of them change together when the category does. It also keeps the
 * 1500-line wizard from growing another 150 lines.
 *
 * Nesting a <form> here is safe: the wizard has no <form> element at all -- it
 * posts a plain object through a server closure -- so this is the only form on
 * the page and submitting it cannot carry the wizard's state anywhere.
 */
export function CategoryStep({
    entries,
    superCategoryId,
    eventFormatId,
    categoryFields,
    onChange,
}: CategoryStepProps) {
    const [requestNonce, setRequestNonce] = useState(0);

    const superCategories = selectable(entries, "super");
    const formats = selectable(entries, "format");

    const chosenSuper = superCategories.find((s) => s.id === superCategoryId);
    const chosenFormat = formats.find((f) => f.id === eventFormatId);
    const checklist = resolveChecklist(chosenSuper, chosenFormat);

    const setSuper = (id: string) => {
        const entry = superCategories.find((s) => s.id === id);
        // categoryFields resets with the category: the answers belong to the
        // fields of the category that was chosen, and a Sports event carrying a
        // leftover "Cuisine Type" is worse than an empty form.
        onChange({ superCategoryId: id, category: entry?.name ?? "", categoryFields: {} });
    };

    const setFormat = (id: string) => {
        const entry = formats.find((f) => f.id === id);
        onChange({ eventFormatId: id, eventType: entry?.name ?? "" });
    };

    const setAnswer = (fieldId: string, value: string | number | boolean) => {
        onChange({ categoryFields: { ...categoryFields, [fieldId]: value } });
    };

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-bold text-ink mb-1">Category and format</h3>
                <p className="text-sm text-ink-soft">
                    Every event is a category plus a format — &ldquo;Technology + Hackathon&rdquo;. Both lists are
                    managed by Avoeline, so they change without an app update.
                </p>
            </div>

            {!superCategories.length || !formats.length ? (
                <FormFeedback error="No event categories have been set up yet. Ask an Avoeline admin to add them before creating an event." />
            ) : null}

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                    <label htmlFor="superCategoryId" className={labelClass}>Super category</label>
                    <select
                        id="superCategoryId"
                        value={superCategoryId}
                        onChange={(e) => setSuper(e.target.value)}
                        className={fieldClass}
                    >
                        <option value="">Select a category…</option>
                        {superCategories.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                    {chosenSuper?.description ? (
                        <p className="text-xs text-ink-soft">{chosenSuper.description}</p>
                    ) : null}
                </div>

                <div className="flex flex-col gap-1.5">
                    <label htmlFor="eventFormatId" className={labelClass}>Event format</label>
                    <select
                        id="eventFormatId"
                        value={eventFormatId}
                        onChange={(e) => setFormat(e.target.value)}
                        className={fieldClass}
                    >
                        <option value="">Select a format…</option>
                        {formats.map((f) => (
                            <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                    </select>
                    {chosenFormat?.description ? (
                        <p className="text-xs text-ink-soft">{chosenFormat.description}</p>
                    ) : null}
                </div>
            </div>

            {chosenSuper?.fields.length ? (
                <div className="rounded-2xl border border-line p-5">
                    <h4 className="text-sm font-bold text-ink">{chosenSuper.name} details</h4>
                    <p className="mb-4 mt-1 text-xs text-ink-soft">
                        Extra questions Avoeline asks for {chosenSuper.name.toLowerCase()} events.
                    </p>
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        {chosenSuper.fields.map((field) => (
                            <CategoryFieldInput
                                key={field.fieldId}
                                field={field}
                                value={categoryFields[field.fieldId]}
                                onChange={(v) => setAnswer(field.fieldId, v)}
                            />
                        ))}
                    </div>
                </div>
            ) : null}

            {checklist.length ? (
                <div className="rounded-2xl border border-line bg-muted p-5">
                    <div className="mb-3 flex items-center gap-2">
                        <ListChecks size={16} className="text-ink-faint" aria-hidden="true" />
                        <h4 className="text-sm font-bold text-ink">Suggested checklist</h4>
                    </div>
                    <p className="mb-3 text-xs text-ink-soft">
                        Added to your event when you publish, based on {chosenFormat?.name} and {chosenSuper?.name}.
                        You can tick these off from the event page.
                    </p>
                    <ul className="space-y-1.5">
                        {checklist.map((item) => (
                            <li key={item} className="flex gap-2 text-sm text-ink">
                                <span aria-hidden="true" className="text-ink-faint">□</span>
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>
            ) : null}

            {/* Keyed so a successful request remounts it: useActionState has no
                reset, and without this the panel stays stuck on its own success
                banner for the rest of the page's life. */}
            <RequestCategory key={requestNonce} onDone={() => setRequestNonce((n) => n + 1)} />
        </div>
    );
}

function CategoryFieldInput({
    field,
    value,
    onChange,
}: {
    field: CustomFieldOption;
    value: string | number | boolean | undefined;
    onChange: (value: string | number | boolean) => void;
}) {
    const id = `cf-${field.fieldId}`;

    if (field.type === "checkbox") {
        return (
            <label htmlFor={id} className="flex items-start gap-2.5 text-sm text-ink sm:col-span-2">
                <input
                    id={id}
                    type="checkbox"
                    checked={value === true}
                    onChange={(e) => onChange(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-current"
                />
                <span>
                    {field.label}
                    {field.required ? <span className="text-ink-soft"> (required)</span> : null}
                </span>
            </label>
        );
    }

    return (
        <div className="flex flex-col gap-1.5">
            <label htmlFor={id} className={labelClass}>
                {field.label}
                {field.required ? " *" : ""}
            </label>
            {field.type === "dropdown" ? (
                <select id={id} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} className={fieldClass}>
                    <option value="">Select…</option>
                    {field.options.map((o) => (
                        <option key={o} value={o}>{o}</option>
                    ))}
                </select>
            ) : (
                <input
                    id={id}
                    type={field.type === "number" ? "number" : "text"}
                    inputMode={field.type === "number" ? "numeric" : undefined}
                    min={field.type === "number" ? 0 : undefined}
                    value={String(value ?? "")}
                    onChange={(e) =>
                        onChange(field.type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value)
                    }
                    className={`${fieldClass}${field.type === "number" ? " tabular-nums" : ""}`}
                />
            )}
        </div>
    );
}

/** Spec 1.3: the organizer asks for something that is not in the list yet. */
function RequestCategory({ onDone }: { onDone: () => void }) {
    const [open, setOpen] = useState(false);
    const [state, formAction] = useActionState<ActionResult | null, FormData>(requestCategoryAction, null);

    if (!open) {
        return (
            <button type="button" onClick={() => setOpen(true)} className={buttonClass("ghost", "sm")}>
                <Plus size={14} aria-hidden="true" />
                Can&apos;t find your category? Request a new one
            </button>
        );
    }

    return (
        <div className="rounded-2xl border border-line p-5">
            {state?.success ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <FormFeedback success="Request sent. You will get a notification once an Avoeline admin has reviewed it." />
                    <button type="button" onClick={onDone} className={buttonClass("ghost", "sm")}>
                        Request another
                    </button>
                </div>
            ) : (
                <form action={formAction} className="flex flex-wrap items-end gap-3">
                    {state?.error ? <FormFeedback error={state.error} className="w-full" /> : null}

                    <div className="flex min-w-40 flex-col gap-1.5">
                        <label htmlFor="request-kind" className={labelClass}>Type</label>
                        <select id="request-kind" name="kind" defaultValue="super" className={fieldClass}>
                            <option value="super">Super category</option>
                            <option value="format">Event format</option>
                        </select>
                    </div>

                    <div className="flex min-w-48 flex-1 flex-col gap-1.5">
                        <label htmlFor="request-name" className={labelClass}>Name</label>
                        <input id="request-name" name="name" required maxLength={60} placeholder="Agriculture" className={fieldClass} />
                    </div>

                    <SubmitButton pendingText="Sending…" className={buttonClass("primary")}>
                        Send request
                    </SubmitButton>
                    <button type="button" onClick={() => setOpen(false)} className={buttonClass("ghost")}>
                        Cancel
                    </button>
                </form>
            )}
        </div>
    );
}

export default CategoryStep;
