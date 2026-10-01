"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { TeamEngineService } from "../teamEngine.service";
import { AuthService } from "@/src/features/auth/authService";
import { syncPresidentOrganizerProfile } from "@/src/features/clubs/club.service";
import { adminAuth } from "@/data/admin_db";
import { TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import type { ActionResult } from "@/src/lib/action";
import { fail, ok } from "@/src/lib/action";
import { finishForm } from "@/src/lib/formRedirect";
import { sendEmail, escapeHtml } from "@/src/lib/email";
import { isModuleKey } from "@/src/features/permissions/moduleKeys";
import { getDepartmentPlan } from "@/src/features/department/department.service";

/**
 * Ensures caller is either platform_admin or the department_admin for the given department.
 */
async function assertDepartmentAdminOrPlatformAdmin(departmentId: string) {
    const user = await AuthService.getCurrentUser();
    if (!user?.userId) {
        throw new Error("You must be logged in.");
    }

    if (user.role === "platform_admin" || user.userType === "admin") {
        return user;
    }

    if (user.role === "department_admin") {
        // Scoped to own orgId or managedOrgIds
        if (user.orgId === departmentId || user.managedOrgIds?.includes(departmentId)) {
            return user;
        }
    }

    const department = await TeamEngineService.getOrg(departmentId);
    if (department?.type === "department" && department.ownerUid === user.userId) return user;

    throw new Error("You do not have permission to manage this department.");
}

/**
 * A club president runs club events from the organizer dashboard, so an
 * attendee account is upgraded to organizer and given an organizer profile.
 */
async function ensurePresidentCanOrganize(userId: string, clubId: string) {
    const { data: row } = await supabaseAdmin.from(TABLES.USERS).select("user_type").eq("id", userId).maybeSingle();
    if (!row || row.user_type === "platform_admin" || row.user_type === "vendor") return;
    if (row.user_type !== "organizer") {
        await supabaseAdmin.from(TABLES.USERS).update({ user_type: "organizer", updated_at: new Date().toISOString() }).eq("id", userId);
    }
    const club = await TeamEngineService.getOrg(clubId);
    if (club) await syncPresidentOrganizerProfile(userId, club);
}

export async function createClubAccount(formData: FormData): Promise<void> {
    finishForm(formData, "/department/clubs", await createClubAccountImpl(formData), "Club created. The president must change their password on first sign-in.");
}

async function createClubAccountImpl(formData: FormData): Promise<ActionResult> {
    const departmentId = String(formData.get("departmentId") ?? "").trim();
    try {
        await assertDepartmentAdminOrPlatformAdmin(departmentId);
    } catch (err: unknown) {
        return fail(err instanceof Error ? err.message : "Not allowed.");
    }

    const name = String(formData.get("name") ?? "").trim();
    const presidentName = String(formData.get("presidentName") ?? "").trim() || name;
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const chosenPassword = String(formData.get("password") ?? "");
    const modules = formData.getAll("modules").map(String).filter(isModuleKey);
    if (!name) return fail("Club name is required.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("President email is required.");
    if (chosenPassword && chosenPassword.length < 8) return fail("A temporary password needs at least 8 characters.");
    if (!chosenPassword && !(process.env.BREVO_API_KEY && process.env.MAIL_FROM)) {
        return fail("Email isn't configured, so type a temporary password to share with the president.");
    }

    const plan = await getDepartmentPlan(departmentId);
    const allowed = new Set(plan?.modules ?? []);
    const granted = modules.filter((k) => allowed.has(k));

    const password = chosenPassword || `Av-${randomBytes(6).toString("base64url")}`;
    let uid: string;
    try {
        const created = await adminAuth.createUser({ email, password, displayName: presidentName, userType: "organizer" });
        uid = created.uid;
    } catch (err) {
        console.error("[createClubAccount] auth", err);
        return fail("Could not create that login. The email may already be in use.");
    }

    const now = new Date().toISOString();
    await supabaseAdmin.from(TABLES.USERS).upsert({
        id: uid,
        email,
        full_name: presidentName,
        user_type: "organizer",
        account_status: "active",
        must_reset_password: true,
        setup_complete: true,
        updated_at: now,
    });

    const club = await TeamEngineService.createOrg({
        name,
        type: "club",
        parentOrgId: departmentId,
        ownerUid: uid,
    });

    await supabaseAdmin.from(TABLES.ORGANIZER_PROFILES).upsert({
        user_id: uid,
        org_name: name,
        org_id: club.id,
        plan_type: plan?.key || "free",
        review_status: "approved",
    });

    if (granted.length) {
        const grantedBy = (await AuthService.getCurrentUser())?.userId ?? uid;
        await supabaseAdmin.from(TABLES.ORG_MODULE_ACCESS).insert(
            granted.map((module_key) => ({
                org_id: club.id,
                module_key,
                enabled: true,
                granted_by: grantedBy,
            })),
        );
    }

    await sendEmail(
        { email, name: presidentName },
        {
            subject: "Your Avoeline club account",
            html: `<p>Hello ${escapeHtml(presidentName)},</p><p>A department created a club president account for <strong>${escapeHtml(name)}</strong>.</p><p>Temporary password: <strong>${escapeHtml(password)}</strong></p><p>Sign in and you will be asked to set a new password.</p>`,
            text: `Club: ${name}. Temporary password: ${password}. Sign in and reset it.`,
        },
    );

    revalidatePath("/department/clubs");
    revalidatePath("/department");
    return ok();
}

/**
 * @deprecated Use createClubAccount. Kept for any leftover bound forms.
 */
export async function addClubUnderDepartmentAction(
    departmentId: string,
    prevState: ActionResult | null,
    formData: FormData
): Promise<ActionResult> {
    try {
        await assertDepartmentAdminOrPlatformAdmin(departmentId);

        const name = String(formData.get("name") ?? "").trim();
        const ownerEmail = String(formData.get("ownerEmail") ?? "").trim().toLowerCase();
        let ownerUid = String(formData.get("ownerUid") ?? "").trim();

        if (!name) {
            return fail("Club name is required.");
        }

        // If an email is provided instead of UID, resolve it
        if (!ownerUid && ownerEmail) {
            const { data: existing } = await supabaseAdmin
                .from(TABLES.USERS)
                .select("id")
                .eq("email", ownerEmail)
                .maybeSingle();
            if (existing?.id) ownerUid = existing.id;
        }

        const club = await TeamEngineService.createOrg({
            name,
            type: "club",
            parentOrgId: departmentId,
            ownerUid: ownerUid || "",
        });

        if (!ownerUid && ownerEmail) {
            await supabaseAdmin.from(TABLES.PENDING_INVITES).insert({
                email: ownerEmail,
                org_type: "club",
                parent_org_id: departmentId,
                invited_by: (await AuthService.getCurrentUser())?.userId,
                status: "pending",
            });
        }

        if (ownerUid) {
            try {
                await ensurePresidentCanOrganize(ownerUid, club.id);
            } catch (err) {
                console.error("[addClubUnderDepartmentAction] failed to link president", err);
            }
        }

        revalidatePath("/department");
        revalidatePath(`/department?orgId=${departmentId}`);
        revalidatePath(`/admin/orgs`);

        return ok();
    } catch (err: any) {
        console.error("[addClubUnderDepartmentAction]", err);
        return fail(err?.message || "Failed to create club under department.");
    }
}

/**
 * Action: Assign or update the club owner.
 */
export async function assignClubOwnerAction(
    clubId: string,
    departmentId: string,
    prevState: ActionResult | null,
    formData: FormData
): Promise<ActionResult> {
    try {
        await assertDepartmentAdminOrPlatformAdmin(departmentId);

        const ownerEmail = String(formData.get("ownerEmail") ?? "").trim().toLowerCase();
        let ownerUid = String(formData.get("ownerUid") ?? "").trim();

        if (!ownerUid && ownerEmail) {
            const { data: existing } = await supabaseAdmin
                .from(TABLES.USERS)
                .select("id")
                .eq("email", ownerEmail)
                .maybeSingle();

            if (existing?.id) {
                ownerUid = existing.id;
            } else {
                const password = `Av-${randomBytes(6).toString("base64url")}`;
                try {
                    const created = await adminAuth.createUser({
                        email: ownerEmail,
                        password,
                        displayName: ownerEmail.split("@")[0],
                        userType: "organizer",
                    });
                    ownerUid = created.uid;
                    await supabaseAdmin.from(TABLES.USERS).upsert({
                        id: ownerUid,
                        email: ownerEmail,
                        full_name: ownerEmail.split("@")[0],
                        user_type: "organizer",
                        account_status: "active",
                        must_reset_password: true,
                        setup_complete: true,
                        updated_at: new Date().toISOString(),
                    });
                } catch {
                    return fail("Could not create a login for that email.");
                }
            }
        }

        if (!ownerUid) {
            return fail("Please provide a valid user email or user ID for the club owner.");
        }

        const club = await TeamEngineService.getOrg(clubId);
        if (!club || club.type !== "club" || club.parentOrgId !== departmentId) {
            return fail("That club does not belong to this department.");
        }

        await TeamEngineService.updateOrgOwner(clubId, ownerUid);
        await ensurePresidentCanOrganize(ownerUid, clubId);

        revalidatePath("/department");
        revalidatePath(`/department?orgId=${departmentId}`);
        revalidatePath(`/clubs/${clubId}`);

        return ok();
    } catch (err: any) {
        console.error("[assignClubOwnerAction]", err);
        return fail(err?.message || "Failed to assign club owner.");
    }
}
