import { NextResponse } from "next/server";
import { AuthService } from "@/src/features/auth/authService";
import { diagnoseGooglePickerEnv, getGoogleOAuthConfig } from "@/src/env";
import { rateLimit } from "@/src/lib/rateLimit";

export const runtime = "nodejs";

/**
 * Admin-only: presence/format checks for Picker env. Never returns key values.
 */
export async function GET() {
  const user = await AuthService.getCurrentUser().catch(() => null);
  if (!user?.userId) {
    return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401 });
  }
  const isAdmin =
    user.role === "platform_admin" ||
    String(user.userType || "")
      .trim()
      .toLowerCase() === "admin";
  if (!isAdmin) {
    return NextResponse.json({ ok: false, error: "Admin only." }, { status: 403 });
  }

  const limited = rateLimit(`picker-diag:${user.userId}`, 20, 60);
  if (!limited.ok) {
    return NextResponse.json({ ok: false, error: "Too many requests." }, { status: 429 });
  }

  const checks = diagnoseGooglePickerEnv();
  const oauth = getGoogleOAuthConfig();

  return NextResponse.json({
    ok: true,
    checks: {
      ...checks,
      oauthClientIdLooksValid: Boolean(oauth.clientId?.includes(".apps.googleusercontent.com")),
    },
    // Never include secret values.
  });
}
