import { AuthService } from "@/src/features/auth/authService";
import { safeFail, type SafeActionResult } from "@/src/lib/safeAction";
import { canWebsiteCap, type AdminArea, type AdminIdentity, type WebsiteCap } from "./types";

/**
 * The guard every admin page uses, so no page has to remember the import path
 * of the auth service to ask a question about the admin panel.
 *
 * A thin alias on purpose -- the rule itself lives in `requireAdmin`, which is
 * where the session is. Having one name for it inside the feature keeps the
 * pages reading as "does this admin hold this area" rather than as auth
 * plumbing.
 */
export function requireAdminArea(area?: AdminArea): Promise<AdminIdentity | null> {
  return AuthService.requireAdmin(area);
}

/**
 * Server-action gate for `/admin/website` writes (and fine-grained reads).
 * Requires a platform admin session, then `canWebsiteCap`.
 */
export async function requireWebsiteCap(
  cap: WebsiteCap,
): Promise<AdminIdentity | SafeActionResult<never>> {
  const admin = await AuthService.requireAdmin();
  if (!admin) return safeFail("UNAUTHORIZED", "Please sign in as an admin.");
  if (!canWebsiteCap(admin, cap)) {
    return safeFail("FORBIDDEN", `You need ${cap} to do that.`);
  }
  return admin;
}
