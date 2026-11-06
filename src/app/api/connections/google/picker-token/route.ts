import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/src/features/auth/authService";
import { assertMayUseConnection } from "@/src/features/connections/server/assertConnectionsAccess";
import { getAccessTokenForConnection } from "@/src/features/connections/server/connections.service";
import { sanitizePickerTokenResponse } from "@/src/features/connections/lib/linkedFiles.logic";
import { getGoogleOAuthConfig, getGooglePickerConfig } from "@/src/env";
import { rateLimit } from "@/src/lib/rateLimit";
import { logger } from "@/src/lib/logger";

export const runtime = "nodejs";

async function handle(req: NextRequest) {
  const user = await AuthService.getCurrentUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Sign in required." }, { status: 401 });
  }

  const limited = rateLimit(`picker-token:${user.userId}`, 10, 60);
  if (!limited.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many requests.", retryAfterSec: limited.retryAfterSec },
      { status: 429 },
    );
  }

  let connectionId = "";
  if (req.method === "GET") {
    connectionId = req.nextUrl.searchParams.get("connectionId") || "";
  } else {
    try {
      const body = (await req.json()) as { connectionId?: string };
      connectionId = String(body.connectionId || "");
    } catch {
      connectionId = "";
    }
  }
  if (!/^[0-9a-f-]{36}$/i.test(connectionId)) {
    return NextResponse.json({ ok: false, error: "connectionId required." }, { status: 400 });
  }

  const may = await assertMayUseConnection({
    userId: user.userId,
    connectionId,
    capability: "drive.files",
  });
  if (!may.ok) {
    return NextResponse.json({ ok: false, error: may.error }, { status: 403 });
  }

  const picker = getGooglePickerConfig();
  const oauth = getGoogleOAuthConfig();
  if (!picker.apiKey || !picker.appId || !oauth.clientId) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Google Picker is not configured (GOOGLE_PICKER_API_KEY / GOOGLE_PICKER_APP_ID / OAuth client).",
      },
      { status: 503 },
    );
  }

  try {
    const accessToken = await getAccessTokenForConnection(connectionId);
    const payload = sanitizePickerTokenResponse({
      accessToken,
      expiresIn: 3000,
      apiKey: picker.apiKey,
      appId: picker.appId,
      clientId: oauth.clientId,
    });
    if ("error" in payload) {
      logger.error("[picker-token] sanitize rejected", { err: payload.error });
      return NextResponse.json({ ok: false, error: "Token response invalid." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, ...payload });
  } catch (err) {
    logger.error("[picker-token]", { err: err instanceof Error ? err.message : "unknown" });
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Could not mint picker token." },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
