"use client";

import { InputHTMLAttributes, useEffect, useRef, useState } from "react";

/**
 * Date input that is DD/MM/YYYY for every user, on every machine.
 *
 * A native `<input type="date">` renders its placeholder, its value AND its
 * editable segments in the format taken from the user's **OS regional settings**
 * — `dd/mm/yyyy` in Pakistan, `mm/dd/yyyy` in the US. Nothing in page code can
 * change that: the `lang` attribute, `<html lang>` and `navigator.language` are
 * all ignored for it (verified in Chrome — an en-US browser on a PK machine
 * still renders day-first). That is why two people saw different formats on the
 * same deployed page.
 *
 * So the visible control here is a plain text input we format and parse
 * ourselves: it shows DD/MM/YYYY, and typing digits is masked into DD/MM/YYYY as
 * you go. The calendar button still opens the browser's native picker (a month
 * grid, which has no ordering problem) via a hidden `<input type="date">`.
 *
 * Contract matches a normal date input, so call sites are unchanged:
 *   - `value` / `defaultValue` are ISO `yyyy-mm-dd`
 *   - `onChange` receives `{ target: { value } }` with ISO `yyyy-mm-dd` ("" when
 *     incomplete or invalid), so `(e) => setX(e.target.value)` keeps working
 *   - `name` submits ISO `yyyy-mm-dd` via a hidden input, as before
 *   - `required` is enforced on the visible field, with a pattern so a
 *     half-typed date can't be submitted
 */

const DISPLAY_RE = /^(\d{2})\/(\d{2})\/(\d{4})$/;

/** ISO `yyyy-mm-dd` → `DD/MM/YYYY` ("" if not a plain ISO date). */
function isoToDisplay(iso: string): string {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
    return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

/** `DD/MM/YYYY` → ISO `yyyy-mm-dd` ("" if incomplete or not a real date). */
function displayToIso(text: string): string {
    const m = DISPLAY_RE.exec((text || "").trim());
    if (!m) return "";
    const day = Number(m[1]);
    const month = Number(m[2]);
    const year = Number(m[3]);
    // Reject 31/02 and friends: round-tripping through Date normalizes overflow,
    // so a mismatch means the date doesn't exist.
    const probe = new Date(year, month - 1, day);
    if (
        probe.getFullYear() !== year ||
        probe.getMonth() !== month - 1 ||
        probe.getDate() !== day
    ) {
        return "";
    }
    return `${m[3]}-${m[2]}-${m[1]}`;
}

/** Keep typed input in DD/MM/YYYY shape, inserting the slashes automatically. */
function mask(raw: string): string {
    const digits = (raw || "").replace(/\D/g, "").slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export type DateFieldProps = Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "type" | "value" | "defaultValue" | "onChange"
> & {
    /** ISO `yyyy-mm-dd`. */
    value?: string;
    /** ISO `yyyy-mm-dd`. */
    defaultValue?: string;
    /** Receives ISO `yyyy-mm-dd` on `e.target.value` ("" when cleared/invalid). */
    onChange?: (event: { target: { value: string; name?: string } }) => void;
};

export function DateField({
    className = "",
    value,
    defaultValue,
    onChange,
    name,
    required,
    disabled,
    min,
    max,
    ...props
}: DateFieldProps) {
    const isControlled = value !== undefined;
    const [text, setText] = useState(() => isoToDisplay(String(value ?? defaultValue ?? "")));
    const pickerRef = useRef<HTMLInputElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Follow externally-driven value changes (controlled callers, resets).
    useEffect(() => {
        if (isControlled) setText(isoToDisplay(String(value ?? "")));
    }, [isControlled, value]);

    const iso = displayToIso(text);

    // `pattern` only checks the shape, so "31/02/2026" would pass it and submit an
    // empty ISO value. Block a well-formed but non-existent date explicitly.
    useEffect(() => {
        const el = inputRef.current;
        if (!el) return;
        el.setCustomValidity(text.length === 10 && !iso ? "That date doesn't exist." : "");
    }, [text, iso]);

    const emit = (nextIso: string) => onChange?.({ target: { value: nextIso, name } });

    const handleText = (raw: string) => {
        const masked = mask(raw);
        setText(masked);
        emit(displayToIso(masked));
    };

    const openPicker = () => {
        const el = pickerRef.current;
        if (!el || disabled) return;
        // showPicker() is the supported way to open the native calendar; fall back
        // to a click for older engines.
        if (typeof el.showPicker === "function") {
            try {
                el.showPicker();
                return;
            } catch {
                /* falls through to click */
            }
        }
        el.click();
    };

    return (
        <div className="relative w-full">
            <input
                {...props}
                ref={inputRef}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="DD/MM/YYYY"
                pattern="\d{2}/\d{2}/\d{4}"
                title="Use the format DD/MM/YYYY"
                required={required}
                disabled={disabled}
                value={text}
                onChange={(e) => handleText(e.target.value)}
                className={className}
            />

            {/* Value actually submitted with the form — ISO, as before. */}
            {name && <input type="hidden" name={name} value={iso} />}

            {/* Hidden native input purely as the calendar popup source. */}
            <input
                ref={pickerRef}
                type="date"
                tabIndex={-1}
                aria-hidden="true"
                value={iso}
                min={min}
                max={max}
                onChange={(e) => {
                    setText(isoToDisplay(e.target.value));
                    emit(e.target.value);
                }}
                className="pointer-events-none absolute bottom-0 left-3 h-px w-px opacity-0"
            />

            <button
                type="button"
                onClick={openPicker}
                disabled={disabled}
                aria-label="Open calendar"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition hover:text-gray-700 disabled:opacity-50"
            >
                <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                </svg>
            </button>
        </div>
    );
}
