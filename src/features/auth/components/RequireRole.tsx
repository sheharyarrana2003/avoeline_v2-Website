import type { ReactNode } from "react";
import type { UserRole } from "@/src/services/models/user.type";
import { requireRole } from "../rbac.service";

export interface RequireRoleProps {
    /** The set of allowed roles that can access this subtree */
    allow: UserRole[];
    /** Optional custom destination if access is denied */
    fallbackUrl?: string;
    /** Optional orgId to check department scoping */
    orgId?: string;
    /** Optional teamId to check team lead scoping */
    teamId?: string;
    children: ReactNode;
}

/**
 * Reusable Server Component wrapper that checks the logged-in user's role from their
 * Firestore /users doc before rendering. Redirects to login or /access-denied if unauthorized.
 */
export async function RequireRole({
    allow,
    fallbackUrl,
    orgId,
    teamId,
    children,
}: RequireRoleProps) {
    await requireRole(allow, { fallbackUrl, orgId, teamId });
    return <>{children}</>;
}

export default RequireRole;
