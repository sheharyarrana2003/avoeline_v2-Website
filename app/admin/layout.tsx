import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthService } from "@/src/features/auth/authService";
import { BrandMark } from "@/src/shared_components/ui/BrandMark";

export const metadata = { title: "Platform admin — Avoeline" };

/**
 * The platform-admin shell.
 *
 * Its own file rather than a check inlined in the page, so any admin route
 * added later inherits the guard instead of quietly shipping without one.
 * proxy.ts only proves the visitor is signed in; the role check is here, and
 * every admin action re-checks it because a Server Action is a public endpoint.
 *
 * ponytail: not DashboardNav. That component hardcodes `${basePath}/dashboard`,
 * `/profile` and `/notifications`, none of which exist under /admin, so reusing
 * it today would ship three dead links. Switch to it when module 9 builds the
 * admin dashboard.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const admin = await AuthService.requireAdmin();

    if (!admin) {
        const signedIn = await AuthService.getCurrentUser();
        // Signed in but not an admin gets sent home, not to a sign-in page they
        // are already past -- and told nothing about what is behind this URL.
        redirect(signedIn ? "/" : "/auth/signin?next=/admin");
    }

    return (
        <div className="flex min-h-screen flex-col">
            <header className="border-b border-line">
                <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-4 sm:px-6">
                    <Link href="/admin" className="flex items-center gap-2 rounded-xs focus-visible:outline-2 focus-visible:outline-offset-2">
                        <BrandMark className="h-7 w-7" />
                        <span className="text-2xs font-medium uppercase tracking-wider text-ink-soft">Platform admin</span>
                    </Link>
                    <span className="ml-auto truncate text-xs text-ink-soft">{admin.email}</span>
                </div>
            </header>

            <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">{children}</main>
        </div>
    );
}
