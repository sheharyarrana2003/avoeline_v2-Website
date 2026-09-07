"use client";

import { SKILL_TAGS } from "../types";

/**
 * The skill tags a participant claims (spec 3.2's solo matching).
 *
 * Checkboxes sharing one `name`, so the FormData carries every ticked tag and
 * the action reads them with `getAll("skills")`. No state: the form is
 * uncontrolled and the server validates each tag against `SKILL_TAGS`, so an
 * invented one never reaches Firestore.
 */
export function SkillPicker({ selected, idPrefix = "skill" }: { selected: string[]; idPrefix?: string }) {
    const have = new Set(selected);
    return (
        <div className="flex flex-wrap gap-2">
            {SKILL_TAGS.map((tag) => {
                const id = `${idPrefix}-${tag.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
                return (
                    <label
                        key={tag}
                        htmlFor={id}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-line-loud px-3 py-1.5 text-xs text-ink transition hover:border-ink has-checked:border-ink has-checked:bg-ink has-checked:text-ink-invert"
                    >
                        <input
                            id={id}
                            type="checkbox"
                            name="skills"
                            value={tag}
                            defaultChecked={have.has(tag)}
                            className="sr-only"
                        />
                        {tag}
                    </label>
                );
            })}
        </div>
    );
}
