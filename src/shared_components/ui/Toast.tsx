"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from "react";
import { Check, X, TriangleAlert, Info } from "lucide-react";

export type ToastTone = "success" | "error" | "info";

type Toast = { id: number; tone: ToastTone; message: string };

type ToastApi = {
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

/** Errors stay up longer -- you have to read them, not just notice them. */
const DURATION: Record<ToastTone, number> = {
    success: 4000,
    info: 5000,
    error: 8000,
};

const TONE: Record<ToastTone, { ring: string; icon: ReactNode }> = {
    success: {
        ring: "ring-emerald-600/20 bg-emerald-50 text-emerald-900",
        icon: <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />,
    },
    error: {
        ring: "ring-red-600/20 bg-red-50 text-red-900",
        icon: <TriangleAlert className="h-4 w-4 text-red-600" aria-hidden="true" />,
    },
    info: {
        ring: "ring-gray-600/20 bg-white text-gray-900",
        icon: <Info className="h-4 w-4 text-gray-500" aria-hidden="true" />,
    },
};

/**
 * Transient confirmation for actions whose result you would otherwise never
 * see -- the ones that redirect, or that change something off-screen.
 *
 * Inline `<FormFeedback>` is still the right tool next to a form. Use a toast
 * when there is no form left to attach the message to.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const nextId = useRef(0);
    const timers = useRef<number[]>([]);

    const dismiss = useCallback((id: number) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const push = useCallback(
        (tone: ToastTone, message: string) => {
            const id = nextId.current++;
            setToasts((prev) => [...prev, { id, tone, message }]);
            timers.current.push(
                window.setTimeout(() => dismiss(id), DURATION[tone]),
            );
        },
        [dismiss],
    );

    useEffect(() => {
        const pending = timers.current;
        return () => pending.forEach(clearTimeout);
    }, []);

    const api = useMemo<ToastApi>(
        () => ({
            success: (m) => push("success", m),
            error: (m) => push("error", m),
            info: (m) => push("info", m),
        }),
        [push],
    );

    return (
        <ToastContext.Provider value={api}>
            {children}
            <div
                className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
                aria-live="polite"
                aria-atomic="false"
            >
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        role={t.tone === "error" ? "alert" : "status"}
                        className={`pointer-events-auto flex items-start gap-3 rounded-xl px-4 py-3 shadow-lg ring-1 ${TONE[t.tone].ring}`}
                    >
                        <span className="mt-0.5 shrink-0">{TONE[t.tone].icon}</span>
                        <p className="flex-1 text-sm font-medium leading-snug">{t.message}</p>
                        <button
                            type="button"
                            onClick={() => dismiss(t.id)}
                            aria-label="Dismiss notification"
                            className="shrink-0 rounded-md p-0.5 opacity-60 transition hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
                        >
                            <X className="h-4 w-4" aria-hidden="true" />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

/**
 * Returns a no-op API when no provider is mounted, so a component can call
 * `toast.success(...)` without every one of its call sites having to know
 * whether it is rendered inside the dashboard shell.
 */
const NOOP: ToastApi = { success: () => {}, error: () => {}, info: () => {} };

export function useToast(): ToastApi {
    return useContext(ToastContext) ?? NOOP;
}
