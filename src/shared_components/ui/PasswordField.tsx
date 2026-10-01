"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { fieldClass, labelClass } from "@/src/lib/ui";

export function PasswordField({
    id,
    name,
    label,
    value,
    onChange,
    autoComplete,
    placeholder,
    required,
}: {
    id: string;
    name?: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    autoComplete?: string;
    placeholder?: string;
    required?: boolean;
}) {
    const [visible, setVisible] = useState(false);

    return (
        <div>
            <label htmlFor={id} className={labelClass}>
                {label}
            </label>
            <div className="relative mt-1.5">
                <input
                    id={id}
                    type={visible ? "text" : "password"}
                    name={name}
                    autoComplete={autoComplete}
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className={`${fieldClass} pr-11`}
                    required={required}
                />
                <button
                    type="button"
                    onClick={() => setVisible((v) => !v)}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-ink-soft hover:text-ink"
                    aria-label={visible ? "Hide password" : "Show password"}
                >
                    {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
            </div>
        </div>
    );
}
