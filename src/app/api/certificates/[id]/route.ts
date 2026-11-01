import { createHash } from "crypto";
import { NextResponse } from "next/server";
import {
  getCertificateById,
  loadRenderBundle,
} from "@/src/features/certificates/certificates.service";
import { rateLimit } from "@/src/lib/rateLimit";

export const runtime = "nodejs";

/**
 * Public JSON for an issued certificate's render payload (layout + data + assets).
 * ETag support for cache revalidation.
 */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const certId = String(id ?? "").trim();
  if (!certId) {
    return NextResponse.json({ error: "Missing certificate id" }, { status: 400 });
  }

  const limited = rateLimit(`cert:api:${certId}`, 60, 60);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  const cert = await getCertificateById(certId);
  if (!cert || cert.status !== "issued") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const bundle = await loadRenderBundle(cert);
  const body = {
    templateLayout: bundle.layout,
    version: bundle.version,
    assets: bundle.assets,
    data: bundle.data,
  };
  const json = JSON.stringify(body);
  const etag = `"${createHash("sha1").update(json).digest("hex")}"`;

  const ifNoneMatch = request.headers.get("if-none-match");
  if (ifNoneMatch && ifNoneMatch === etag) {
    return new NextResponse(null, { status: 304, headers: { ETag: etag } });
  }

  return new NextResponse(json, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      ETag: etag,
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
    },
  });
}
