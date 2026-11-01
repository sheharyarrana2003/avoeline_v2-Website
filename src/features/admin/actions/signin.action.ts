"use server";

import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { z } from "zod";
import { type ActionResult, fail, toLegacyResult } from "@/src/lib/action";
import { safeAction, safeFail } from "@/src/lib/safeAction";
import { rateLimit } from "@/src/lib/rateLimit";
import { AuthService } from "@/src/features/auth/authService";
import { mapSignInAuthError } from "@/src/features/auth/authErrors";
import { signOutAction } from "@/src/features/auth/actions/signOut.action";
import { signInSchema } from "@/src/features/auth/auth.schema";
import { logger } from "@/src/lib/logger";

const adminSignInInner = safeAction({
  input: signInSchema.extend({
    next: z.string().optional(),
  }),
  run: async (input) => {
    const emailKey = input.email.trim().toLowerCase();
    const limited = rateLimit(`login:admin:${emailKey}`, 8, 60);
    if (!limited.ok) {
      return safeFail(
        "RATE_LIMIT",
        `Too many sign-in attempts. Try again in ${limited.retryAfterSec}s.`,
      );
    }

    try {
      await AuthService.loginWithEmail(input.email, input.password);
    } catch (err: unknown) {
      return safeFail("AUTH", mapSignInAuthError(err));
    }

    const admin = await AuthService.requireAdmin();
    if (!admin) {
      await signOutAction().catch(() => {});
      return safeFail("FORBIDDEN", "That is not an admin account.");
    }

    const next = input.next?.startsWith("/admin") ? input.next : "/admin";
    redirect(next);
  },
});

/**
 * Sign in to the admin panel (spec 9.1).
 * Returns legacy ActionResult for the existing form; validates with zod + rate limit.
 */
export async function adminSignIn(
  next: string,
  prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  void prevState;
  try {
    const result = await adminSignInInner({
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      next,
    });
    return toLegacyResult(result);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    logger.error("[adminSignIn]", { err: err instanceof Error ? err.message : "unknown" });
    return fail("Could not sign you in. Please try again.");
  }
}
