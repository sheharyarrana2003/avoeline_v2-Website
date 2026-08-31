"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { TriangleAlert, HelpCircle } from "lucide-react";

export type ConfirmTone = "danger" | "default";

/**
 * The two tones differ by the weight of the badge and by their icon, not by hue.
 * Both confirm buttons are solid ink: the dialog itself is the safety mechanism,
 * so making the destructive button quieter than the cancel button would just make
 * it harder to find. Pass a `confirmLabel` that names the act ("Delete event",
 * not "Confirm") -- that wording is the channel that actually prevents mistakes.
 */
const TONE: Record<ConfirmTone, { icon: ReactNode; badge: string; confirm: string }> = {
    danger: {
        icon: <TriangleAlert className="h-5 w-5" aria-hidden="true" />,
        badge: "bg-danger-soft text-danger ring-1 ring-danger-line",
        confirm: "bg-danger text-ink-invert hover:brightness-90 focus-visible:outline-accent",
    },
    default: {
        icon: <HelpCircle className="h-5 w-5" aria-hidden="true" />,
        badge: "bg-muted text-ink-soft ring-1 ring-line",
        confirm: "bg-ink text-ink-invert hover:bg-ink-soft focus-visible:outline-accent",
    },
};

export type ConfirmDialogProps = {
    open: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    tone?: ConfirmTone;
    /** Disables the confirm button and shows a busy label while an action runs. */
    busy?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
};

/**
 * Confirmation built on the native <dialog> element.
 *
 * showModal() gives the focus trap, Escape-to-close, the inert background and
 * top-layer stacking for free. The repo's one hand-rolled `fixed inset-0`
 * modal had none of those, and reimplementing them is a few hundred lines of
 * things to get subtly wrong.
 */
export function ConfirmDialog({
    open,
    title,
    description,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    tone = "danger",
    busy = false,
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    const ref = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const dialog = ref.current;
        if (!dialog) return;
        if (open && !dialog.open) dialog.showModal();
        if (!open && dialog.open) dialog.close();
    }, [open]);

    const styles = TONE[tone];

    return (
        <dialog
            ref={ref}
            // Escape fires `cancel`; without this the dialog would close while
            // the parent still believes it is open.
            onCancel={(e) => {
                e.preventDefault();
                if (!busy) onCancel();
            }}
            // The dialog element fills the viewport, so a click landing on it
            // rather than on the panel inside is a backdrop click.
            onClick={(e) => {
                if (e.target === ref.current && !busy) onCancel();
            }}
            className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl bg-paper p-0 text-ink shadow-2xl backdrop:bg-black/50"
        >
            <div className="p-6">
                <div className="flex gap-4">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${styles.badge}`}>
                        {styles.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                        <h2 className="text-base font-bold tracking-tight">{title}</h2>
                        <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{description}</p>
                    </div>
                </div>

                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={busy}
                        className="rounded-full border border-line-loud px-5 py-2.5 text-sm font-medium text-ink transition hover:bg-muted disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={busy}
                        aria-busy={busy}
                        className={`rounded-full px-5 py-2.5 text-sm font-semibold transition disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 ${styles.confirm}`}
                    >
                        {busy ? "Working…" : confirmLabel}
                    </button>
                </div>
            </div>
        </dialog>
    );
}

type GateProps = Omit<ConfirmDialogProps, "open" | "onConfirm" | "onCancel"> & {
    children: ReactNode;
    className?: string;
    disabled?: boolean;
    /**
     * Forwarded to the button, for a form with more than one submit button --
     * `name="decision" value="reject"` beside a plain Approve button. Passed to
     * requestSubmit() as the submitter, so the pair reaches the action.
     */
    name?: string;
    value?: string;
};

/**
 * A submit button that asks first.
 *
 * Every destructive action in this app lives inside a plain
 * `<form action={serverAction}>` on a Server Component page. Rather than
 * converting those pages to client components, this replaces just the button:
 * it swallows the first click, and on confirm hands the form back to the
 * platform via requestSubmit(), so the action, the hidden inputs and the
 * page all stay exactly as they were.
 */
export function ConfirmSubmit({ children, className = "", disabled, name, value, ...dialog }: GateProps) {
    const [open, setOpen] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);

    return (
        <>
            <button
                ref={buttonRef}
                type="submit"
                name={name}
                value={value}
                disabled={disabled}
                className={className}
                onClick={(e) => {
                    e.preventDefault();
                    setOpen(true);
                }}
            >
                {children}
            </button>
            <ConfirmDialog
                {...dialog}
                open={open}
                onCancel={() => setOpen(false)}
                onConfirm={() => {
                    setOpen(false);
                    // requestSubmit, not submit(): it runs validation and fires
                    // the submit event, which is what React's form action needs.
                    // The button is passed as the submitter, or its name/value
                    // is dropped -- which silently turns a two-button form
                    // (Approve / Reject) into whichever branch is the default.
                    const button = buttonRef.current;
                    button?.form?.requestSubmit(button);
                }}
            />
        </>
    );
}

/** The same gate for an ordinary onClick handler rather than a form submit. */
export function ConfirmButton({
    children,
    className = "",
    disabled,
    onConfirm,
    ...dialog
}: GateProps & { onConfirm: () => void }) {
    const [open, setOpen] = useState(false);

    return (
        <>
            <button
                type="button"
                disabled={disabled}
                className={className}
                onClick={() => setOpen(true)}
            >
                {children}
            </button>
            <ConfirmDialog
                {...dialog}
                open={open}
                onCancel={() => setOpen(false)}
                onConfirm={() => {
                    setOpen(false);
                    onConfirm();
                }}
            />
        </>
    );
}
