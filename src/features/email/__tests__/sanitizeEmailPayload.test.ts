import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sanitizeEmailPayload } from "@/src/lib/email/sanitizePayload";

describe("sanitizeEmailPayload", () => {
  it("strips password and internal notes keys", () => {
    const out = sanitizeEmailPayload({
      tenantName: "Acme",
      password: "secret",
      temporaryPassword: "tmp",
      tempPassword: "tmp2",
      notes: "internal",
      internalNotes: "nope",
      internal_notes: "nope2",
      planName: "Pro",
    });
    assert.deepEqual(out, { tenantName: "Acme", planName: "Pro" });
    assert.equal("password" in out, false);
    assert.equal("notes" in out, false);
  });
});
