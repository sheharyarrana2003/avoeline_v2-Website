"use server";

import { revalidatePath } from "next/cache";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { adminAuth } from "@/data/admin_db";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { type ActionResult, fail, ok } from "@/src/lib/action";
import { AuthService } from "@/src/features/auth/authService";
import { isStoredAdminType, sanitizeAreas } from "../types";

const MIN_PASSWORD = 8;

async function findAuthIdByEmail(email: string): Promise<string | null> {
    const { data } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const hit = data.users.find((u) => String(u.email ?? "").toLowerCase() === email);
    return hit?.id ?? null;
}

async function writeStaffRow(uid: string, email: string, name: string, permissions: string[]) {
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin.from(TABLES.USERS).upsert(
        {
            id: uid,
            email,
            full_name: name,
            user_type: "platform_admin",
            is_owner: false,
            account_status: "active",
            admin_permissions: permissions,
            updated_at: now,
        },
        { onConflict: "id" },
    );
    if (error) throw error;
}

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
            const created = await adminAuth.createUser({
                email,
                password,
                displayName: name,
                userType: "platform_admin",
            });
            uid = created.uid;
        } catch (err: unknown) {
            const code = String((err as { code?: string })?.code ?? "");
            if (code === "auth/invalid-password") return fail("That password is too weak.");
            if (code !== "auth/email-already-exists") {
                console.error("[createAdmin] createUser failed", err);
                return fail("Could not create that account. Please try again.");
            }
            const existing = await findAuthIdByEmail(email);
            if (!existing) return fail("An account already exists with that address, but it could not be updated.");
            uid = existing;
            await adminAuth.updateUser(uid, { password, disabled: false });
            await supabaseAdmin.auth.admin.updateUserById(uid, {
                user_metadata: { full_name: name, user_type: "platform_admin" },
            });
        }

        const { data: existingRow } = await supabaseAdmin
            .from(TABLES.USERS)
            .select("is_owner")
            .eq("id", uid)
            .maybeSingle();
        if (existingRow?.is_owner) return fail("That address already belongs to an owner.");

        await writeStaffRow(uid, email, name, permissions);

        revalidatePath("/admin/admins");
        return ok();
    } catch (err) {
        if (isRedirectError(err)) throw err;
        console.error("[createAdmin]", err);
        return fail("Could not add that admin. Please try again.");
    }
}

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

        const { data: row } = await supabaseAdmin
            .from(TABLES.USERS)
            .select("user_type, is_owner")
            .eq("id", userId)
            .maybeSingle();
        if (!row || !isStoredAdminType(row.user_type)) return fail("That is not an admin account.");
        if (row.is_owner) return fail("You cannot change another owner's permissions.");

        await supabaseAdmin
            .from(TABLES.USERS)
            .update({
                admin_permissions: sanitizeAreas(formData.getAll("permissions").map(String)),
                updated_at: new Date().toISOString(),
            })
            .eq("id", userId);

        revalidatePath("/admin/admins");
        return ok();
    } catch (err) {
        if (isRedirectError(err)) throw err;
        console.error("[setAdminPermissions]", err);
        return fail("Could not save those permissions. Please try again.");
    }
}

export async function revokeAdmin(prevState: ActionResult | null, formData: FormData): Promise<ActionResult> {
    try {
        const admin = await AuthService.requireAdmin();
        if (!admin) return fail("Please sign in again.");
        if (!admin.isOwner) return fail("Only a platform owner can revoke an admin.");

        const userId = String(formData.get("userId") ?? "").trim();
        if (userId === admin.userId) return fail("You cannot revoke your own access.");

        const { data: row } = await supabaseAdmin
            .from(TABLES.USERS)
            .select("user_type, is_owner")
            .eq("id", userId)
            .maybeSingle();
        if (!row || !isStoredAdminType(row.user_type)) return fail("That is not an admin account.");
        if (row.is_owner) return fail("You cannot revoke another owner.");

        await supabaseAdmin
            .from(TABLES.USERS)
            .update({ account_status: "deactivated", admin_permissions: [], updated_at: new Date().toISOString() })
            .eq("id", userId);

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
