import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/src/features/auth/authService";
import { startOAuthConnect } from "@/src/features/connections/server/oauth.service";
import type { ConnectionCapability, ConnectionOwnerType } from "@/src/features/connections/types";

export const runtime = "nodejs";

export async function GET(req: NextRequest, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  if (provider !== "google") {
    return NextResponse.json({ error: "Unsupported provider" }, { status: 400 });
  }

  const user = await AuthService.getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL("/auth/signin", req.nextUrl.origin));
  }

  const rawCap = req.nextUrl.searchParams.get("capability") || "email.send";
  const capability = rawCap as ConnectionCapability | "workspace";
  const ownerType = (req.nextUrl.searchParams.get("ownerType") || "user") as ConnectionOwnerType;
  const ownerId = req.nextUrl.searchParams.get("ownerId") || user.userId;
  const returnTo =
    req.nextUrl.searchParams.get("returnTo") || `/organizer/${ownerId}/settings/connections`;
  const loginHint = req.nextUrl.searchParams.get("loginHint") || undefined;

  if (ownerType === "user" && ownerId !== user.userId) {
    const admin = await AuthService.requireAdmin("organizers");
    if (!admin?.isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const started = await startOAuthConnect({
    userId: user.userId,
    ownerType,
    ownerId,
    capability,
    returnTo,
    origin: req.nextUrl.origin,
    loginHint,
  });

  if (!started.ok) {
    const dest = new URL(returnTo, req.nextUrl.origin);
    dest.searchParams.set("e", started.error);
    return NextResponse.redirect(dest);
  }

  return NextResponse.redirect(started.url);
}
