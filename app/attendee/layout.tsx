import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthService } from "@/src/features/auth/authService";
import { BrandMark } from "@/src/shared_components/ui/BrandMark";
import { signOutAction } from "@/src/features/auth/actions/signOut.action";
import { buttonClass } from "@/src/lib/ui";

export const metadata = { title: "My events — Avoeline" };

/**
 * The attendee shell.
 *
 * Attendees could already sign up — `userType` has always included "attendee"
 * and SELF_SIGNUP_ROLES allows it — but there was nowhere for them to land:
 * sign-in redirects to /<userType>/<uid>/dashboard, and /attendee did not
 * exist, so every attendee who registered was dropped on a 404. This is the
 * missing half of a role the app already sold.
 *
 * ponytail: not DashboardNav, for the same reason /admin is not — it hardcodes
 * /profile and /notifications, which an attendee has no routes for yet.
 */
export default async function AttendeeLayout({ children }: { children: React.ReactNode }) {
    const user = await AuthService.getCurrentUser();
    if (!user?.userId) redirect("/auth/signin");

    // Organizers and vendors have their own dashboards; send them there rather
    // than rendering an attendee view over their session.
    const role = String(user.userType ?? "").trim().toLowerCase();
    if (role !== "attendee") {
        redirect(role === "admin" ? "/admin" : `/${role}/${user.roleId || user.userId}/dashboard`);
    }

    return (
        <div className="flex min-h-screen flex-col">
            <header className="border-b border-line">
                <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-4 sm:px-6">
                    <Link href={`/attendee/${user.userId}/dashboard`} className="flex items-center gap-2 rounded-xs focus-visible:outline-2 focus-visible:outline-offset-2">
                        <BrandMark className="h-7 w-7" />
                        <span className="text-2xs font-medium uppercase tracking-wider text-ink-soft">My events</span>
                    </Link>
                    {/* The shell had exactly one link, to the page you are already
                        on, so an attendee with no tickets yet had nowhere to go
                        from here and no way back to the public site. */}
                    <Link href="/events" className="text-sm text-ink-soft hover:text-ink">
                        Browse events
                    </Link>
                    <div className="ml-auto flex items-center gap-4">
                        <span className="truncate text-xs text-ink-soft">{user.email}</span>
                        <form action={signOutAction}>
                            <button type="submit" className={buttonClass("ghost", "sm")}>Sign out</button>
                        </form>
                    </div>
                </div>
            </header>

            <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">{children}</main>
        </div>
    );
}
