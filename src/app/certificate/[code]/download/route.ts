import { NextResponse } from "next/server";
import {
  bumpDownloadCount,
  getCertificateByCode,
  renderCertPdfBytes,
} from "@/src/features/certificates/certificates.service";
import { rateLimit } from "@/src/lib/rateLimit";

export const runtime = "nodejs";

/**
 * Stream a freshly rendered certificate PDF. Nothing is stored on disk/bucket.
 */
export async function GET(_request: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params;
  const verificationCode = String(code ?? "").trim();
  if (!verificationCode) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  const limited = rateLimit(`cert:dl:${verificationCode}`, 30, 60);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many downloads" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  const cert = await getCertificateByCode(verificationCode);
  if (!cert || cert.status !== "issued") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const bytes = await renderCertPdfBytes(cert);
  void bumpDownloadCount(cert.id);

  const filename =
    (cert.data.recipient_name || "certificate")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "certificate";

  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="certificate-${filename}.pdf"`,
      "Cache-Control": "private, max-age=300",
      "Content-Length": String(bytes.byteLength),
    },
  });
}
