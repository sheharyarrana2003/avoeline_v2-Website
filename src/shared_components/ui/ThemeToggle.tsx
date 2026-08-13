"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

/**
 * The light/dark switch.
 *
 * The stored choice is the source of truth. The OS preference is only a fallback,
 * and it is resolved by the inline script in app/layout.tsx before first paint —
 * not here — because a theme decided in an effect arrives one frame too late and
 * the user watches the page flash white.
 *
 * There is no useState here on purpose. `data-theme` on <html> already IS the
 * state, so mirroring it into React would mean two copies that can disagree (the
 * attribute can also be changed by the inline script, or by a second toggle in the
 * mobile bar). useSyncExternalStore subscribes to the real thing instead: toggle()
 * writes the attribute, the MutationObserver notices, and every mounted toggle
 * re-renders in step.
 *
 * The server snapshot is null because the server cannot know what this browser
 * stored — rendering Sun or Moon during SSR would be a coin flip, and a wrong guess
 * is a visible icon swap on hydration. Null renders a same-size blank, so the
 * button never changes size and nothing shifts around it.
 *
 * Storage key is duplicated as a literal in app/layout.tsx: that script is a raw
 * string injected before any module loads, so it cannot import this constant.
 */
export const THEME_KEY = "avoeline-theme";

function subscribe(onChange: () => void) {
    const observer = new MutationObserver(onChange);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
}

const readTheme = () => (document.documentElement.dataset.theme === "dark" ? "dark" : "light");
const readServerTheme = () => null;

export function ThemeToggle({ onInk = false }: { onInk?: boolean }) {
    const theme = useSyncExternalStore(subscribe, readTheme, readServerTheme);
    const isDark = theme === "dark";

    function toggle() {
        const next = isDark ? "light" : "dark";
        document.documentElement.dataset.theme = next;
        try {
            localStorage.setItem(THEME_KEY, next);
        } catch {
            // Private mode or blocked storage: the theme still applies for this page
            // load, it just will not be remembered. Not worth failing the click over.
        }
    }

    return (
        <button
            type="button"
            onClick={toggle}
            // The label states the destination, not the current state: a control
            // announced as "dark theme" leaves a screen reader user unsure whether
            // that is what it is or what it does.
            aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
            title={isDark ? "Light theme" : "Dark theme"}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
                onInk
                    ? "text-white/70 hover:bg-white/[0.07] hover:text-white"
                    : "text-ink-soft hover:bg-muted hover:text-ink"
            }`}
        >
            {theme === null ? (
                <span className="h-[18px] w-[18px]" aria-hidden="true" />
            ) : isDark ? (
                <Sun className="h-[18px] w-[18px]" aria-hidden="true" />
            ) : (
                <Moon className="h-[18px] w-[18px]" aria-hidden="true" />
            )}
        </button>
    );
}
