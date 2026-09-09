"use server";

import { revalidatePath } from "next/cache";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { adminAuth, adminDb } from "@/data/admin_db";
import { COLLECTIONS } from "@/data/collections";
import { type ActionResult, fail, ok } from "@/src/lib/action";
import { AuthService } from "@/src/features/auth/authService";
import { sanitizeAreas } from "../types";

/**
 * Managing admins (spec 9.1's "separate Admin login... with its own
 * permissions layer").
 *
 * Owner-only, and that is not one of the tickable areas on purpose: making
 * "can manage admins" a permission would let anybody who held it grant
 * themselves everything else, which is the same as having no permissions
 * layer at all.
 */

const MIN_PASSWORD = 8;

/**
 * Create another admin.
 *
 * `adminAuth.createUser` rather than the signup flow, because signup is
 * deliberately closed to this role -- `SELF_SIGNUP_ROLES` excludes `admin` so
 * nobody can register their way into the panel. An admin account therefore only
 * ever comes from an existing owner, or from the documented env bootstrap.
 */
export async function createAdmin(
    prevState: ActionResult | null,
    formData: FormData,
): Promise<ActionResult> {
    try {
        const admin = await AuthService.requireAdmin();
        if (!admin) return fail("Please sign in again.");
        if (!admin.isOwner) return fail("Only a platform owner can add an admin.");

        const email = String(formData.get("email") ?? "").trim().toLowerCase();
        const password = String(formData.get("password") ?? "");
        const name = String(formData.get("name") ?? "").trim();
        const permissions = sanitizeAreas(formData.getAll("permissions").map(String));

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return fail("That email address does not look right.");
        if (password.length < MIN_PASSWORD) return fail(`Use a password of at least ${MIN_PASSWORD} characters.`);
        if (!name) return fail("Give them a name.");
        if (!permissions.length) return fail("Choose at least one area they can work in.");

        let uid: string;
        try {
            const created = await adminAuth.createUser({ email, password, displayName: name });
            uid = created.uid;
        } catch (err: unknown) {
            const code = String((err as { code?: string })?.code ?? "");
            if (code === "auth/email-already-exists") {
                return fail("An account already exists with that address.");
            }
            if (code === "auth/invalid-password") return fail("That password is too weak.");
            console.error("[createAdmin] createUser failed", err);
            return fail("Could not create that account. Please try again.");
        }

        const now = new Date();
        await adminDb.collection(COLLECTIONS.USERS).doc(uid).set({
            userId: uid,
            email,
            userType: "admin",
            accountStatus: "active",
            // A created admin is never an owner. Only the env bootstrap and the
            // promote flow mint one, so an owner cannot be manufactured from
            // inside the panel by anybody other than an existing owner.
            isOwner: false,
            adminPermissions: permissions,
            profile: { fullName: name, phoneNumber: "", profileImageUrl: "", gender: "other" },
            createdAt: now,
            updatedAt: now,
            lastActive: now,
        });

        revalidatePath("/admin/admins");
        return ok();
    } catch (err) {
        if (isRedirectError(err)) throw err;
        console.error("[createAdmin]", err);
        return fail("Could not add that admin. Please try again.");
    }
}

/**
 * Change what another admin can reach.
 *
 * Takes effect on their very next request, because permissions are read from
 * the user document rather than the session claims -- a claim would have kept
 * working for the five days the cookie lasts.
 */
export async function setAdminPermissions(
    prevState: ActionResult | null,
    formData: FormData,
): Promise<ActionResult> {
    try {
        const admin = await AuthService.requireAdmin();
        if (!admin) return fail("Please sign in again.");
        if (!admin.isOwner) return fail("Only a platform owner can change permissions.");

        const userId = String(formData.get("userId") ?? "").trim();
        if (!userId) return fail("Missing admin.");
        if (userId === admin.userId) return fail("You cannot change your own permissions.");

        const snap = await adminDb.collection(COLLECTIONS.USERS).doc(userId).get();
        if (!snap.exists || String(snap.data()?.userType).trim().toLowerCase() !== "admin") return fail("That is not an admin account.");
        // An owner is not editable through this form: their standing does not
        // come from a list, and demoting one here would be a way around the
        // owner-only guard above.
        if (snap.data()?.isOwner) return fail("You cannot change another owner's permissions.");

        await adminDb
            .collection(COLLECTIONS.USERS)
            .doc(userId)
            .set(
                { adminPermissions: sanitizeAreas(formData.getAll("permissions").map(String)), updatedAt: new Date() },
                { merge: true },
            );

        revalidatePath("/admin/admins");
        return ok();
    } catch (err) {
        if (isRedirectError(err)) throw err;
        console.error("[setAdminPermissions]", err);
        return fail("Could not save those permissions. Please try again.");
    }
}

/**
 * Revoke an admin.
 *
 * Their Firebase Auth account is disabled and their role dropped, so the
 * session they are holding stops working on its next verification rather than
 * lasting out the cookie. Deliberately not a delete: the moderation log points
 * at them by id, and a log whose author cannot be resolved is worth less.
 */
export async function revokeAdmin(prevState: ActionResult | null, formData: FormData): Promise<ActionResult> {
    try {
        const admin = await AuthService.requireAdmin();
        if (!admin) return fail("Please sign in again.");
        if (!admin.isOwner) return fail("Only a platform owner can revoke an admin.");

        const userId = String(formData.get("userId") ?? "").trim();
        if (userId === admin.userId) return fail("You cannot revoke your own access.");

        const snap = userId ? await adminDb.collection(COLLECTIONS.USERS).doc(userId).get() : null;
        if (!snap?.exists || String(snap.data()?.userType).trim().toLowerCase() !== "admin") return fail("That is not an admin account.");
        if (snap.data()?.isOwner) return fail("You cannot revoke another owner.");

        await adminDb
            .collection(COLLECTIONS.USERS)
            .doc(userId)
            .set({ accountStatus: "deactivated", adminPermissions: [], updatedAt: new Date() }, { merge: true });

        // Belt and braces: the account-status check already refuses them at
        // login and in requireAdmin, and this stops the credential outright.
        await adminAuth.updateUser(userId, { disabled: true }).catch((err: unknown) =>
            console.error("[revokeAdmin] could not disable the auth account", err),
        );
        await adminAuth.revokeRefreshTokens(userId).catch(() => {});

        revalidatePath("/admin/admins");
        return ok();
    } catch (err) {
        if (isRedirectError(err)) throw err;
        console.error("[revokeAdmin]", err);
        return fail("Could not revoke that admin. Please try again.");
    }
}
