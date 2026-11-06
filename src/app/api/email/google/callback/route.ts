import { NextRequest, NextResponse } from "next/server";

/**
 * Legacy callback — redirect to Connections C1 callback so old GOOGLE_REDIRECT_URI still works.
 */
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const dest = new URL("/api/connections/google/callback", req.nextUrl.origin);
  req.nextUrl.searchParams.forEach((value, key) => {
    dest.searchParams.set(key, value);
  });
  return NextResponse.redirect(dest);
}
