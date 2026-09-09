"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { adminDb } from "@/data/admin_db";
import { COLLECTIONS } from "@/data/collections";
import { ADMIN_AREAS } from "@/src/features/admin/types";
import { AuthService } from "@/src/features/auth/authService";

/**
 * Turn the signed-in account into a real platform admin — the one-time bootstrap.
 *
 * Admin is a separate role, like organizer and vendor, so it has to exist as
 * `userType: "admin"` on a users doc. But nothing may create one on its own:
 * `signUpWithEmail` refuses any role outside SELF_SIGNUP_ROLES precisely so a
 * public endpoint cannot mint a platform admin. That leaves a chicken and egg,
 * and this closes it.
 *
 * Three deliberate limits, and each is load-bearing:
 *
 *  1. **Only the PLATFORM_ADMIN_EMAILS allowlist authorizes this — never the
 *     `userType === "admin"` branch.** So an existing admin cannot use it to
 *     promote anybody, and the escalation path ends with whoever controls the
 *     server's environment.
 *  2. **It only ever promotes the caller.** No id, email or uid is read from the
 *     form, so there is no target to substitute.
 *  3. **It signs the caller out.** `setClaimsForUser` copies userType into the
 *     session at login only, so the new role is invisible until the cookie is
 *     reissued. Forcing the round trip is what makes the promotion take effect,
 *     rather than leaving someone staring at an unchanged page.
 *
 * Once through, delete PLATFORM_ADMIN_EMAILS: the account stands on its own and
 * the env var stops being a standing bypass.
 *
 * Note this REPLACES the account's existing role. An organizer who promotes
 * themselves is no longer an organizer, and `proxy.ts` will bounce them off
 * /organizer afterwards. Promote a dedicated account, not one running events.
 */
export async function promoteToAdminAction(): Promise<void> {
    try {
        const user = await AuthService.getCurrentUser();
        if (!user?.userId) {
            redirect("/auth/signin?next=/admin");
        }

        const email = String(user.email ?? "").trim().toLowerCase();
        const allowed = String(process.env.PLATFORM_ADMIN_EMAILS ?? "")
            .split(",")
            .map((e) => e.trim().toLowerCase())
            .filter(Boolean);

        // Deliberately not `requireAdmin()`: qualifying through the userType claim
        // must not be enough to reach this.
        if (!email || !allowed.includes(email)) {
            console.warn("[promoteToAdminAction] refused: caller is not in PLATFORM_ADMIN_EMAILS");
            redirect("/admin?e=" + encodeURIComponent("Only an address in PLATFORM_ADMIN_EMAILS can be promoted."));
        }

        await adminDb.collection(COLLECTIONS.USERS).doc(user.userId).set(
            {
                userType: "admin",
                // Seeded as a real owner, which is what lets the
                // PLATFORM_ADMIN_EMAILS branch in `requireAdmin` eventually be
                // deleted: without this, promoting produced an admin with no
                // stored permissions who could only get in through the env var.
                isOwner: true,
                adminPermissions: [...ADMIN_AREAS],
                updatedAt: new Date(),
            },
            { merge: true },
        );
        console.log("[promoteToAdminAction] promoted", user.userId);

        // Same delete-and-overwrite as signOutAction: a bare delete can leave a
        // stale cookie alive behind some proxies, and the old cookie still says
        // this account is an organizer.
        const cookieStore = await cookies();
        cookieStore.delete("firebaseSession");
        cookieStore.set("firebaseSession", "", {
            path: "/",
            maxAge: 0,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
        });

        redirect("/auth/signin?next=/admin");
    } catch (err) {
        // redirect() reports itself by throwing, and every exit above is a
        // redirect -- swallowing it would look like the button did nothing.
        if (isRedirectError(err)) throw err;
        console.error("[promoteToAdminAction]", err);
        redirect("/admin?e=" + encodeURIComponent("Could not promote this account. Please try again."));
    }
}
