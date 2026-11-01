import { AuthService } from "@/src/features/auth/authService";
import {
  canManageArea,
  canWebsiteCap,
  holdsArea,
  isAdminArea,
  isWebsiteCap,
  type AdminArea,
} from "@/src/features/admin/types";
import { isModuleKey, type ModuleKey } from "./moduleKeys";
import { hasModuleAccess } from "./permissions.service";
import { EventService } from "@/src/services/event.service";
import { normalizePermissionKey } from "@/src/lib/permissions";
import { userHasGrantPermission, userHasPositionPermission } from "./grants.service";

export type PermissionScope = {
  organizerId?: string;
  orgId?: string;
  eventId?: string;
};

/** Minimal actor for can() — accepts full User or AuthService CurrentUserData. */
export type CanUser = {
  userId: string;
  isOwner?: boolean;
};

const ADMIN_PERM = /^admin:([a-z_]+):(view|manage)$/;

/**
 * Unified permission gate (ENGINEERING_RULES S2).
 * - `admin:{area}:view|manage` → AdminIdentity grants
 * - `website:*` / `legal:publish` / `contact:manage` / `community:view` → canWebsiteCap
 * - Module keys → hasModuleAccess
 * - Dashboard keys → access_grants ∪ team_positions (no JWT claims)
 * - Event/org owners short-circuit for their scope
 */
export async function can(
  user: CanUser | null | undefined,
  permission: string,
  scope: PermissionScope = {},
): Promise<boolean> {
  if (!user?.userId || !permission) return false;
  const key = normalizePermissionKey(permission);

  const adminMatch = ADMIN_PERM.exec(key);
  if (adminMatch) {
    const area = adminMatch[1] as AdminArea;
    const cap = adminMatch[2] as "view" | "manage";
    if (!isAdminArea(area)) return false;
    const identity = await AuthService.requireAdmin();
    if (!identity || identity.userId !== user.userId) return false;
    return cap === "manage" ? canManageArea(identity, area) : holdsArea(identity, area);
  }

  if (isWebsiteCap(key)) {
    const identity = await AuthService.requireAdmin();
    if (!identity || identity.userId !== user.userId) return false;
    return canWebsiteCap(identity, key);
  }

  if (user.isOwner) return true;

  if (isModuleKey(key)) {
    const organizerId = scope.organizerId || user.userId;
    return hasModuleAccess(organizerId, key as ModuleKey);
  }

  // Scope owners
  if (scope.organizerId && scope.organizerId === user.userId) return true;
  if (scope.eventId) {
    const event = await EventService.getEventByID(scope.eventId);
    if (event && String(event.organizerId) === user.userId) return true;
    if (!scope.organizerId && event) {
      scope = { ...scope, organizerId: String(event.organizerId) };
    }
  }

  if (await userHasGrantPermission(user.userId, key, scope)) return true;
  if (await userHasPositionPermission(user.userId, key, scope)) return true;

  return false;
}
