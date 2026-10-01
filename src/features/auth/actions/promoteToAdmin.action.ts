"use server";

import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { supabaseAdmin } from "@/data/supabase";
import { TABLES } from "@/data/collections";
import { ADMIN_AREAS } from "@/src/features/admin/types";
import { AuthService } from "@/src/features/auth/authService";
import { createSupabaseServer } from "@/data/supabase";

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

        if (!email || !allowed.includes(email)) {
            console.warn("[promoteToAdminAction] refused: caller is not in PLATFORM_ADMIN_EMAILS");
            redirect("/admin?e=" + encodeURIComponent("Only an address in PLATFORM_ADMIN_EMAILS can be promoted."));
        }

        await supabaseAdmin.from(TABLES.USERS).update({
            user_type: "platform_admin",
            is_owner: true,
            admin_permissions: [...ADMIN_AREAS],
            updated_at: new Date().toISOString(),
        }).eq("id", user.userId);

        const supabase = await createSupabaseServer();
        await supabase.auth.signOut();
        redirect("/auth/signin?next=/admin");
    } catch (err) {
        if (isRedirectError(err)) throw err;
        console.error("[promoteToAdminAction]", err);
        redirect("/admin?e=" + encodeURIComponent("Could not promote this account. Please try again."));
    }
}
