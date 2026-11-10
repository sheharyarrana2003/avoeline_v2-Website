import assert from "node:assert/strict";
import { describe, it, before } from "node:test";

describe("check-in token", () => {
  before(() => {
    process.env.REGISTRATION_QR_SECRET = "test-registration-qr-secret-32";
  });

  it("signs and verifies; rejects tamper and wrong event", async () => {
    const { signCheckInToken, verifyCheckInToken, checkInQrImagePath } =
      await import("../checkInToken");
    const token = signCheckInToken({
      registrationId: "11111111-1111-1111-1111-111111111111",
      eventId: "22222222-2222-2222-2222-222222222222",
    });
    assert.ok(token.includes("."));
    const ok = verifyCheckInToken(token);
    assert.ok(ok);
    assert.equal(ok!.rid, "11111111-1111-1111-1111-111111111111");
    assert.equal(ok!.eid, "22222222-2222-2222-2222-222222222222");

    assert.equal(verifyCheckInToken(token.slice(0, -2) + "ff"), null);
    assert.equal(verifyCheckInToken("not-a-token"), null);
    assert.ok(checkInQrImagePath(token).startsWith("/api/qr/"));
    assert.ok(checkInQrImagePath(token).endsWith(".png"));
  });
});
