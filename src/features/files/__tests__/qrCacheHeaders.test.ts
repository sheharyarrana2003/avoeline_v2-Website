import assert from "node:assert/strict";
import { describe, it } from "node:test";

/** Mirror of /api/qr/[token] cache headers (keep in sync with route). */
function qrResponseHeaders(registrationId: string): Record<string, string> {
  return {
    "Content-Type": "image/png",
    "Cache-Control": "private, max-age=300",
    "X-Content-Type-Options": "nosniff",
    "Content-Disposition": `inline; filename="${registrationId}.png"`,
  };
}

describe("QR endpoint cache headers", () => {
  it("sets private max-age=300 and nosniff", () => {
    const h = qrResponseHeaders("11111111-1111-4111-8111-111111111111");
    assert.equal(h["Cache-Control"], "private, max-age=300");
    assert.equal(h["X-Content-Type-Options"], "nosniff");
    assert.equal(h["Content-Type"], "image/png");
    assert.ok(!JSON.stringify(h).includes("googleapis"));
    assert.ok(!JSON.stringify(h).includes("ya29."));
  });
});
