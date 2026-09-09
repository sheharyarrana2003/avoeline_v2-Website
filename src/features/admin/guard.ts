import { AuthService } from "@/src/features/auth/authService";
import type { AdminArea, AdminIdentity } from "./types";

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
