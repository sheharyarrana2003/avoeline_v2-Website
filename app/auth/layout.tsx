import type { ReactNode } from "react";
import { ThemeToggle } from "@/src/shared_components/ui/ThemeToggle";

/**
 * Shell for every /auth route.
 *
 * The theme toggle lived only in DashboardNav, which means it did not exist until
 * you were already signed in — so the two screens a first-time visitor actually
 * sees, plus both role-setup wizards, had no way to change theme at all. A layout
 * puts it on all four (and anything added later) from one place rather than
 * pasting the same absolutely-positioned button into four client components.
 *
 * Fixed rather than absolute: the setup wizards scroll, and a toggle that scrolls
 * out of reach is barely better than not having one.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
    return (
        <>
            <div className="fixed right-4 top-4 z-50 sm:right-6 sm:top-6">
                <ThemeToggle />
            </div>
            {children}
        </>
    );
}
