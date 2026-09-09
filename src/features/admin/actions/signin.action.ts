"use server";

import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { type ActionResult, fail } from "@/src/lib/action";
import { AuthService } from "@/src/features/auth/authService";
import { signOutAction } from "@/src/features/auth/actions/signOut.action";

/**
 * Sign in to the admin panel (spec 9.1).
 *
 * Reuses the one session mechanism the app has -- there is no second auth
 * system here, and there should not be. What makes it a *separate* login is
 * what happens after: an account that is not an admin is signed straight back
 * out and told so, rather than being redirected into an organizer dashboard it
 * may not even have. So the credential works everywhere, but this door only
 * opens for an admin.
 */
export async function adminSignIn(
    next: string,
    prevState: ActionResult | null,
    formData: FormData,
): Promise<ActionResult> {
    try {
        const email = String(formData.get("email") ?? "").trim();
        const password = String(formData.get("password") ?? "");
        if (!email || !password) return fail("Enter your email and password.");

        try {
            await AuthService.loginWithEmail(email, password);
        } catch (err: unknown) {
            const code = String((err as { code?: string })?.code ?? "");
            if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
                // One message for both halves: saying which was wrong tells
                // somebody probing whether an admin address exists.
                return fail("That email and password do not match an account.");
            }
            if (code === "auth/user-disabled") return fail("That account has been disabled.");
            // A suspended account throws from `setClaimsForUser` with a message
            // written for the person reading it, so it is passed through.
            const message = String((err as { message?: string })?.message ?? "");
            if (message.includes("suspended")) return fail(message);
            console.error("[adminSignIn] login failed", err);
            return fail("Could not sign you in. Please try again.");
        }

        const admin = await AuthService.requireAdmin();
        if (!admin) {
            // They proved who they are, and they are somebody else. Drop the
            // session again rather than leaving them signed in on a page that
            // just refused them.
            await signOutAction().catch(() => {});
            return fail("That is not an admin account.");
        }

        redirect(next.startsWith("/admin") ? next : "/admin");
    } catch (err) {
        if (isRedirectError(err)) throw err;
        console.error("[adminSignIn]", err);
        return fail("Could not sign you in. Please try again.");
    }
}
