import Link from "next/link";
import { ShieldAlert, ArrowLeft, LogOut, Home } from "lucide-react";
import { buttonClass } from "@/src/lib/ui";
import { signOutAction } from "@/src/features/auth/actions/signOut.action";
import { AuthService } from "@/src/features/auth/authService";
import { landingPathFor } from "@/src/services/user.service";

export const metadata = {
    title: "Access Denied — Avoeline",
};

export default async function AccessDeniedPage({
    searchParams,
}: {
    searchParams: Promise<{ required?: string; role?: string; reason?: string }>;
}) {
    const sp = await searchParams;
    const currentUser = await AuthService.getCurrentUser();
    const currentRole = sp.role || currentUser?.role || currentUser?.userType || "attendee";
    const requiredRoles = sp.required ? sp.required.split(",") : [];

    const getDashboardPath = () => landingPathFor(currentUser);

    return (
        <div className="flex min-h-[80vh] items-center justify-center px-4 py-16 sm:px-6">
            <div className="w-full max-w-md rounded-2xl border border-line bg-paper p-8 text-center shadow-lg">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400">
                    <ShieldAlert className="h-8 w-8" />
                </div>

                <h1 className="mt-5 font-display text-2xl font-semibold text-ink">
                    Access Denied
                </h1>

                <p className="mt-2 text-sm text-ink-soft">
                    You do not have the required permissions to view or perform actions on this page.
                </p>

                <div className="my-6 rounded-xl border border-line bg-muted/40 p-4 text-left text-xs">
                    <div className="flex justify-between py-1">
                        <span className="text-ink-soft">Your Current Role:</span>
                        <span className="font-semibold uppercase text-ink">
                            {currentRole.replace("_", " ")}
                        </span>
                    </div>
                    {requiredRoles.length > 0 && (
                        <div className="flex justify-between border-t border-line/60 pt-1.5 mt-1.5">
                            <span className="text-ink-soft">Required Role(s):</span>
                            <span className="font-medium text-ink">
                                {requiredRoles.map((r) => r.replace("_", " ")).join(", ")}
                            </span>
                        </div>
                    )}
                    {sp.reason && (
                        <div className="border-t border-line/60 pt-1.5 mt-1.5 text-rose-600 dark:text-rose-400">
                            {sp.reason === "unauthorized_department"
                                ? "This resource does not belong to your assigned department."
                                : sp.reason === "unauthorized_team"
                                ? "You are not a designated lead for this team."
                                : sp.reason}
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-3">
                    <Link
                        href={getDashboardPath()}
                        className={buttonClass("primary", "md", "w-full justify-center")}
                    >
                        <Home className="h-4 w-4 mr-2" />
                        Go to My Dashboard
                    </Link>

                    <form action={signOutAction} className="w-full">
                        <button
                            type="submit"
                            className={buttonClass("secondary", "md", "w-full justify-center")}
                        >
                            <LogOut className="h-4 w-4 mr-2" />
                            Sign Out & Switch Account
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
