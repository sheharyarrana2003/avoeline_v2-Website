"use client";

import { InputHTMLAttributes, useState } from "react";

/**
 * Native date input with a locale-independent `DD/MM/YYYY` hint.
 *
 * A bare `<input type="date">` shows the *browser's* placeholder for the empty
 * state — `mm/dd/yyyy` on en-US machines — which contradicts the DD/MM/YYYY
 * format the app stores and displays everywhere (see src/lib/datetime.ts).
 * We keep the native calendar picker and only replace that hint: the browser's
 * own text is hidden via CSS (`.date-field` rules in app/globals.css) and our
 * own label is overlaid in the same grid cell, reusing the input's className so
 * padding/font (including left padding for icon'd fields) line up exactly.
 *
 * The value/onChange contract is the plain input one — `e.target.value` is still
 * ISO `yyyy-mm-dd`; callers keep converting at the write site with `formatDate`.
 */
export type DateFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export function DateField({ className = "", lang = "en-GB", onChange, onFocus, onBlur, ...props }: DateFieldProps) {
    const [focused, setFocused] = useState(false);
    // Controlled callers drive emptiness from `value`; uncontrolled ones
    // (name-based form posts) are tracked here from the change event.
    const [innerValue, setInnerValue] = useState(String(props.defaultValue ?? ""));
    const value = props.value !== undefined ? String(props.value ?? "") : innerValue;
    const showHint = !value && !focused;

    return (
        <div className="relative grid w-full">
            <input
                {...props}
                type="date"
                // Chrome/Edge/Safari format the *filled* value per this attribute, so
                // en-GB keeps a picked date rendering as 09/03/2026 — matching the hint
                // and the app's stored DD/MM/YYYY. Without it the hint would contradict
                // the value on en-US machines. The submitted value stays ISO regardless.
                lang={lang}
                data-empty={!value ? "true" : undefined}
                className={`date-field ${className}`}
                style={{ gridArea: "1 / 1" }}
                onChange={(e) => {
                    if (props.value === undefined) setInnerValue(e.target.value);
                    onChange?.(e);
                }}
                onFocus={(e) => { setFocused(true); onFocus?.(e); }}
                onBlur={(e) => { setFocused(false); onBlur?.(e); }}
            />
            {showHint && (
                <span
                    aria-hidden="true"
                    className={`pointer-events-none ${className}`}
                    // Inline styles so they beat the borrowed utility classes
                    // regardless of Tailwind's stylesheet order.
                    style={{
                        gridArea: "1 / 1",
                        display: "flex",
                        alignItems: "center",
                        background: "transparent",
                        borderColor: "transparent",
                        color: "#9ca3af",
                    }}
                >
                    DD/MM/YYYY
                </span>
            )}
        </div>
    );
}
