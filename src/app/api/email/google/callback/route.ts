import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/src/features/auth/authService";
import {
  exchangeGoogleCode,
  upsertGoogleConnection,
} from "@/src/features/email/organizerEmailConnection.service";
import { logger } from "@/src/lib/logger";

export const runtime = "nodejs";

function redirectTo(path: string, req: NextRequest) {
  return NextResponse.redirect(new URL(path, req.nextUrl.origin));
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const stateRaw = req.nextUrl.searchParams.get("state");
  const oauthError = req.nextUrl.searchParams.get("error");

  if (oauthError) {
    return redirectTo(`/organizer/email?e=${encodeURIComponent(oauthError)}`, req);
  }
  if (!code || !stateRaw) {
    return redirectTo(`/organizer/email?e=${encodeURIComponent("Missing Google OAuth code")}`, req);
  }

  try {
    const state = JSON.parse(Buffer.from(stateRaw, "base64url").toString("utf8")) as {
      organizerId?: string;
      uid?: string;
      t?: number;
      accountEmail?: string;
      requireMatch?: boolean;
    };
    if (!state.organizerId || !state.uid) {
      return redirectTo(`/organizer/email?e=${encodeURIComponent("Invalid OAuth state")}`, req);
    }
    if (state.t && Date.now() - state.t > 15 * 60 * 1000) {
      return redirectTo(`/organizer/email?e=${encodeURIComponent("OAuth state expired")}`, req);
    }

    const user = await AuthService.getCurrentUser();
    if (!user) {
      return redirectTo(`/signin?next=${encodeURIComponent("/organizer/email")}`, req);
    }
    const isSelf = user.userId === state.organizerId;
    const admin = await AuthService.requireAdmin("organizers");
    const isOwner = Boolean(admin?.isOwner);
    if (!isSelf && !isOwner) {
      return redirectTo(`/access-denied`, req);
    }
    if (user.userId !== state.uid && !isOwner) {
      return redirectTo(`/organizer/email?e=${encodeURIComponent("OAuth session mismatch")}`, req);
    }

    const tokens = await exchangeGoogleCode(code);

    if (state.requireMatch) {
      const expected = (state.accountEmail || "").trim().toLowerCase();
      const got = (tokens.email || "").trim().toLowerCase();
      if (!expected || got !== expected) {
        const label = state.accountEmail?.trim() || expected || "your account email";
        return redirectTo(
          `/organizer/${state.organizerId}/email?e=${encodeURIComponent(
            `Connect Google using the same email as your Avoeline account (${label})`,
          )}`,
          req,
        );
      }
    }

    await upsertGoogleConnection({
      organizerId: state.organizerId,
      email: tokens.email,
      secrets: {
        refresh_token: tokens.refresh_token,
        access_token: tokens.access_token,
        expiry: tokens.expiry,
      },
      createdBy: isOwner && !isSelf ? "saas_owner" : "self",
      provisionedBy: isOwner && !isSelf ? user.userId : null,
    });

    return redirectTo(
      `/organizer/${state.organizerId}/email?ok=${encodeURIComponent("Google connected")}`,
      req,
    );
  } catch (err) {
    logger.error("[google/callback]", { err: err instanceof Error ? err.message : "unknown" });
    return redirectTo(
      `/organizer/email?e=${encodeURIComponent(err instanceof Error ? err.message : "Google connect failed")}`,
      req,
    );
  }
}
