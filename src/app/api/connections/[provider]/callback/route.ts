import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/src/features/auth/authService";
import { handleOAuthCallback } from "@/src/features/connections/server/oauth.service";
import { logger } from "@/src/lib/logger";

export const runtime = "nodejs";

export async function GET(req: NextRequest, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const oauthError = req.nextUrl.searchParams.get("error");
  const oauthErrorDescription = req.nextUrl.searchParams.get("error_description");

  const user = await AuthService.getCurrentUser();
  if (!user) {
    const next = `/api/connections/${provider}/callback?${req.nextUrl.searchParams.toString()}`;
    return NextResponse.redirect(
      new URL(`/auth/signin?next=${encodeURIComponent(next)}`, req.nextUrl.origin),
    );
  }

  try {
    const { redirectTo } = await handleOAuthCallback({
      provider,
      code,
      state,
      oauthError,
      oauthErrorDescription,
      userId: user.userId,
      origin: req.nextUrl.origin,
    });
    return NextResponse.redirect(new URL(redirectTo, req.nextUrl.origin));
  } catch (err) {
    logger.error("[connections/callback]", {
      err: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.redirect(
      new URL(
        `/organizer/${user.userId}/settings/connections?e=${encodeURIComponent(
          err instanceof Error ? err.message : "Connect failed",
        )}`,
        req.nextUrl.origin,
      ),
    );
  }
}
