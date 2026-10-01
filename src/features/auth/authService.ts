import { cache } from "react";
import { cookies } from "next/headers";
import { createSupabaseServer, supabaseAdmin } from "@/data/supabase";
import { TABLES } from "@/data/collections";
import { pgGet, pgInsert, pgUpdate, pgUpsert } from "@/data/pg";
import {
    accountIsLive,
    holdsArea,
    sanitizeAreas,
    type AdminArea,
    type AdminIdentity,
} from "@/src/features/admin/types";
import { UserService } from "@/src/services/user.service";
import { CurrentUserData, User } from "@/src/services/models/user.type";

interface signup_with_email_form_data {
    name: string;
    email: string;
    contactNo: string;
    gender: string;
    country: string;
    city: string;
    password: string;
    userType: string;
}

export interface SetupSocialLink {
    platform: string;
    url: string;
}

export interface OrganizerSetupProfileData {
    username: string;
    description: string;
    address: string;
    email: string;
    contactNo: string;
    established: string;
    recoveryContact: string;
    website: string;
    link1: string;
    socialLinks: SetupSocialLink[];
    logoUrl?: string | null;
}

export interface VendorSetupProfileData extends OrganizerSetupProfileData {
    services: string[];
}

function socialLinksToMap(links: SetupSocialLink[] = []): Record<string, string> {
    const socialMedia: Record<string, string> = {};
    for (const link of links) {
        if (!link?.url?.trim()) continue;
        const key = String(link.platform || "").trim().toLowerCase();
        if (key === "instagram") socialMedia.instagram = link.url.trim();
        else if (key === "linkedin") socialMedia.linkedin = link.url.trim();
        else if (key === "facebook") socialMedia.facebook = link.url.trim();
        else if (key === "twitter" || key === "x") socialMedia.twitter = link.url.trim();
    }
    return socialMedia;
}

function sessionUserType(dbType: string): CurrentUserData["userType"] {
    if (dbType === "platform_admin" || dbType === "admin") return "admin";
    if (dbType === "organizer" || dbType === "vendor" || dbType === "attendee") return dbType;
    return "attendee";
}

function isValidCurrentUserData(data: unknown): data is CurrentUserData {
    if (typeof data !== "object" || data === null) return false;
    const d = data as Record<string, unknown>;
    return (
        typeof d.userId === "string" &&
        typeof d.email === "string" &&
        typeof d.userType === "string" &&
        typeof d.name === "string" &&
        typeof d.roleId === "string"
    );
}

async function converting_to_current_user_data(user: User): Promise<CurrentUserData> {
    const orgIds = await UserService.listMembershipOrgIds(user.userId);
    const isDeptAdmin = user.role === "department_admin";
    return {
        userId: user.userId,
        email: user.email || "",
        name: user.profile.fullName || "",
        userType: sessionUserType(user.userType),
        role: user.role,
        orgId: isDeptAdmin ? user.orgId : orgIds[0] || user.orgId,
        managedOrgIds: isDeptAdmin ? user.managedOrgIds ?? [] : orgIds,
        presidentOfOrgIds: user.presidentOfOrgIds ?? [],
        roleId: user.userId,
        accountStatus: user.accountStatus,
    };
}

const SELF_SIGNUP_ROLES = ["attendee", "organizer", "vendor"];

export const AuthService = {
    getCurrentUser: cache(async () => {
        try {
            const supabase = await createSupabaseServer();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user?.id) return null;
            const profile = await UserService.getUserById(user.id);
            if (!accountIsLive(profile.accountStatus)) return null;
            return converting_to_current_user_data(profile);
        } catch (err) {
            console.error("[getCurrentUser] failed", err);
            return null;
        }
    }),

    requireAdmin: async (area?: AdminArea): Promise<AdminIdentity | null> => {
        const user = await AuthService.getCurrentUser();
        if (!user?.userId) return null;

        const email = String(user.email ?? "").trim().toLowerCase();
        const bootstrapped =
            !!email &&
            String(process.env.PLATFORM_ADMIN_EMAILS ?? "")
                .split(",")
                .map((e) => e.trim().toLowerCase())
                .filter(Boolean)
                .includes(email);

        const isAdminClaim =
            String(user.userType).trim().toLowerCase() === "admin" ||
            user.role === "platform_admin";
        if (!isAdminClaim && !bootstrapped) return null;

        const record = await UserService.getUserById(user.userId).catch(() => null);
        if (record && !accountIsLive(record.accountStatus)) return null;

        const identity: AdminIdentity = {
            userId: user.userId,
            email: user.email ?? "",
            name: user.name ?? record?.profile.fullName ?? "",
            isOwner: bootstrapped || !!record?.isOwner,
            permissions: sanitizeAreas(record?.adminPermissions ?? []),
            viaBootstrap: bootstrapped && !record?.isOwner,
        };

        if (area && !holdsArea(identity, area)) {
            console.warn("[requireAdmin] refused", { area, admin: identity.email });
            return null;
        }
        return identity;
    },

    async loginWithEmail(email: string, password: string) {
        const supabase = await createSupabaseServer();
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (!data.user) throw new Error("Sign-in failed.");
        const profile = await UserService.getUserById(data.user.id);
        if (!accountIsLive(profile.accountStatus)) {
            await supabase.auth.signOut();
            throw new Error("This account has been suspended. Contact Avoeline support.");
        }
        await supabaseAdmin.from(TABLES.USERS).update({
            last_login_at: new Date().toISOString(),
            login_count: (profile.security.loginCount || 0) + 1,
        }).eq("id", data.user.id);
    },

    async signUpWithEmail(formData: signup_with_email_form_data) {
        const userTypeLower = String(formData.userType).trim().toLowerCase();
        if (!SELF_SIGNUP_ROLES.includes(userTypeLower)) {
            throw new Error("Choose a valid account type.");
        }

        const supabase = await createSupabaseServer();
        const { data, error } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: { data: { full_name: formData.name, user_type: userTypeLower } },
        });
        if (error) throw error;
        const user = data.user;
        if (!user?.id) throw new Error("Sign-up failed.");

        const now = new Date().toISOString();
        await supabaseAdmin.from(TABLES.USERS).upsert({
            id: user.id,
            email: formData.email,
            full_name: formData.name,
            phone_number: formData.contactNo,
            user_type: userTypeLower,
            account_status: "active",
            gender: (formData.gender || "other").toLowerCase(),
            city: formData.city,
            country: formData.country,
            setup_complete: false,
            created_at: now,
            updated_at: now,
        });

        if (userTypeLower === "attendee") {
            await supabaseAdmin.from(TABLES.ATTENDEE_PROFILES).upsert({ user_id: user.id });
        } else if (userTypeLower === "organizer") {
            await supabaseAdmin.from(TABLES.ORGANIZER_PROFILES).upsert({
                user_id: user.id,
                org_name: formData.name?.trim() || formData.email,
            });
        } else if (userTypeLower === "vendor") {
            await supabaseAdmin.from(TABLES.VENDOR_PROFILES).upsert({
                user_id: user.id,
                business_name: formData.name?.trim() || formData.email,
                business_email: formData.email,
            });
        }

        return { userId: user.id, email: formData.email, userType: userTypeLower };
    },

    async completeOrganizerSetup(data: OrganizerSetupProfileData) {
        const current = await AuthService.getCurrentUser();
        if (!current?.userId) throw new Error("Not authenticated.");
        if (String(current.userType).toLowerCase() !== "organizer") {
            throw new Error("Only organizers can complete organizer setup.");
        }
        const establishedYear = Number.parseInt(String(data.established), 10);
        const website = (data.website || data.link1 || "").trim();
        const socialMedia = socialLinksToMap(data.socialLinks);
        const { data: org, error } = await supabaseAdmin.from(TABLES.ORGANIZATIONS).insert({
            name: (data.username || "").trim() || current.name || current.email,
            org_type: "organizer_business",
            owner_user_id: current.userId,
            description: (data.description || "").trim(),
            logo_url: data.logoUrl || null,
            established_year: Number.isFinite(establishedYear) && establishedYear > 1900 ? establishedYear : null,
            contact_email: (data.email || "").trim() || current.email,
            contact_phone: (data.contactNo || "").trim(),
            website_url: website,
            social_links: socialMedia,
            address: { street: (data.address || "").trim() },
        }).select("id").single();
        if (error) throw error;

        await supabaseAdmin.from(TABLES.ORG_MEMBERSHIPS).upsert({
            org_id: org.id,
            user_id: current.userId,
            role: "organizer",
        }, { onConflict: "org_id,user_id" });

        await supabaseAdmin.from(TABLES.ORGANIZER_PROFILES).upsert({
            user_id: current.userId,
            org_id: org.id,
            org_name: (data.username || "").trim() || current.name,
            recovery_contact: (data.recoveryContact || "").trim(),
        });
        return { success: true as const };
    },

    async completeVendorSetup(data: VendorSetupProfileData) {
        const current = await AuthService.getCurrentUser();
        if (!current?.userId) throw new Error("Not authenticated.");
        if (String(current.userType).toLowerCase() !== "vendor") {
            throw new Error("Only vendors can complete vendor setup.");
        }
        const website = (data.website || data.link1 || "").trim();
        const categories = Array.from(
            new Set((data.services || []).map((s) => String(s).trim()).filter(Boolean))
        );
        await supabaseAdmin.from(TABLES.VENDOR_PROFILES).upsert({
            user_id: current.userId,
            business_name: (data.username || "").trim() || current.name || current.email,
            business_email: (data.email || "").trim() || current.email,
            logo_url: data.logoUrl || null,
            service_categories: categories,
        });
        if ((data.description || "").trim()) {
            await supabaseAdmin.from(TABLES.VENDOR_SERVICES).insert({
                vendor_id: current.userId,
                category: categories[0] || "General",
                name: categories[0] || "General",
                description: data.description.trim(),
            });
        }
        void website;
        return { success: true as const };
    },

    async getEmailVerificationStatus() {
        const current = await AuthService.getCurrentUser();
        if (!current?.userId) return { verified: false, email: "" };
        const supabase = await createSupabaseServer();
        const { data: { user } } = await supabase.auth.getUser();
        const verified = Boolean(user?.email_confirmed_at);
        if (verified) {
            await supabaseAdmin.from(TABLES.USERS).update({
                email_verified: true,
                email_verified_at: new Date().toISOString(),
            }).eq("id", current.userId);
        }
        return { verified, email: user?.email || current.email || "" };
    },

    async resendVerificationEmail() {
        const current = await AuthService.getCurrentUser();
        if (!current?.userId) throw new Error("Not authenticated.");
        const status = await AuthService.getEmailVerificationStatus();
        if (status.verified) return { success: true as const, alreadyVerified: true };
        const supabase = await createSupabaseServer();
        const { error } = await supabase.auth.resend({ type: "signup", email: current.email });
        if (error) throw error;
        return { success: true as const, alreadyVerified: false };
    },

    async finalizeSetup() {
        const current = await AuthService.getCurrentUser();
        if (!current?.userId) throw new Error("Not authenticated.");
        await supabaseAdmin.from(TABLES.USERS).update({
            setup_complete: true,
            updated_at: new Date().toISOString(),
        }).eq("id", current.userId);
        return { success: true as const, userId: current.userId, userType: current.userType };
    },
};

void isValidCurrentUserData;
void pgGet;
void pgInsert;
void pgUpdate;
void pgUpsert;
void cookies;
void sessionUserType;
