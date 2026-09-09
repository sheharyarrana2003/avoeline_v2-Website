import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardBody } from "@/src/shared_components/ui/Card";
import { BrandMark } from "@/src/shared_components/ui/BrandMark";
import { AuthService } from "@/src/features/auth/authService";
import { AdminSignInForm } from "@/src/features/admin/components/AdminSignInForm";
import { adminSignIn } from "@/src/features/admin/actions/signin.action";

export const metadata = { title: "Admin sign in — Avoeline", robots: { index: false, follow: false } };

/**
 * Spec 9.1's separate admin login.
 *
 * Outside the admin shell's guard by necessity — it is the way in — so it is
 * the one route under `/admin` that does not require an admin, which is why
 * `proxy.ts`'s matcher for `/admin/:path*` has to keep letting it through to
 * the page rather than bouncing it to a login form. It is `noindex`: an admin
 * door does not belong in a search index.
 */
export default async function AdminSignInPage({
    searchParams,
}: {
    searchParams: Promise<{ next?: string }>;
}) {
    const { next } = await searchParams;

    // Already an admin? Skip the form.
    if (await AuthService.requireAdmin()) redirect("/admin");

    const target = next && next.startsWith("/admin") && !next.startsWith("/admin/signin") ? next : "/admin";

    return (
        <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-16 sm:px-6">
            <Link href="/" className="mb-8 inline-flex items-center gap-2 self-start rounded-xs focus-visible:outline-2 focus-visible:outline-offset-2">
                <BrandMark className="h-7 w-7" />
                <span className="text-2xs font-medium uppercase tracking-wider text-ink-soft">Avoeline</span>
            </Link>

            <Card tone="raised">
                <CardBody>
                    <AdminSignInForm action={adminSignIn.bind(null, target)} />
                </CardBody>
            </Card>

            <p className="mt-6 text-center text-xs text-ink-soft">
                Organizer, vendor or attendee?{" "}
                <Link href="/auth/signin" className="font-medium text-ink hover:underline">
                    Sign in here
                </Link>
                .
            </p>
        </main>
    );
}
