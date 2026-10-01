import { redirect } from "next/navigation";
import { AuthService } from "@/src/features/auth/authService";
import { UserService } from "@/src/services/user.service";
import type { User, UserRole } from "@/src/services/models/user.type";
import { TeamEngineService } from "@/src/features/teams/teamEngine.service";
import type { TeamMemberDoc } from "@/src/features/teams/teamEngine.types";

/**
 * Resolves the authenticated user with a fresh `users` row.
 * Always reads from Postgres (wrapped in React cache) so role changes take effect immediately.
 */
export async function getAuthenticatedUser(): Promise<User | null> {
    const session = await AuthService.getCurrentUser();
    if (!session?.userId) return null;

    try {
        const user = await UserService.getUserById(session.userId);
        return user;
    } catch (err) {
        console.error("[getAuthenticatedUser] failed to fetch user doc", err);
        return null;
    }
}

/**
 * Checks if a user possesses one of the allowed roles.
 * Platform Admin (platform_admin) possesses super-admin standing across all roles.
 */
export function checkUserRole(user: User | null, allow: UserRole[]): boolean {
    if (!user) return false;
    if (user.role === "platform_admin" || user.isOwner) return true;
    return allow.includes(user.role);
}

/**
 * Server-side role guard for loaders, pages, and actions.
 * Redirects to signin or /access-denied if unauthorized.
 */
export async function requireRole(
    allow: UserRole[],
    options?: {
        fallbackUrl?: string;
        orgId?: string;
        teamId?: string;
    }
): Promise<User> {
    const user = await getAuthenticatedUser();

    if (!user) {
        const isOnlyAdmin = allow.length === 1 && allow[0] === "platform_admin";
        const loginPath = isOnlyAdmin ? "/admin/signin" : "/auth/signin";
        redirect(loginPath);
    }

    // Platform admin bypasses all lower-tier restrictions
    if (user.role === "platform_admin" || user.isOwner) {
        return user;
    }

    const hasAllowedRole = allow.includes(user.role);
    if (!hasAllowedRole) {
        const destination = options?.fallbackUrl || `/access-denied?required=${encodeURIComponent(allow.join(","))}&role=${encodeURIComponent(user.role)}`;
        redirect(destination);
    }

    // Department admin check: if an orgId is specified, verify that the department admin manages it
    if (user.role === "department_admin" && options?.orgId) {
        const isOwnOrg = user.orgId === options.orgId;
        const isManaged = user.managedOrgIds?.includes(options.orgId);
        if (!isOwnOrg && !isManaged) {
            redirect("/access-denied?reason=unauthorized_department");
        }
    }

    // Team lead check: if a teamId is specified, verify lead status in that team
    if (user.role === "team_lead" && options?.teamId) {
        const isLead = await assertTeamLead(user.userId, options.teamId);
        if (!isLead) {
            redirect("/access-denied?reason=unauthorized_team");
        }
    }

    return user;
}

/**
 * Checks if the user is a designated team lead for a given team.
 */
export async function assertTeamLead(userId: string, teamId: string): Promise<boolean> {
    try {
        const members = await TeamEngineService.getTeamMembers(teamId);
        const member = members.find((m: TeamMemberDoc) => m.userId === userId);
        return member?.role === "lead";
    } catch {
        return false;
    }
}
