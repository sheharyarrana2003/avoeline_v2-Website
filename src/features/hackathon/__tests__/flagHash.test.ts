import assert from "node:assert/strict";
import { describe, it, before } from "node:test";
import { createHash } from "crypto";

describe("flag HMAC", () => {
  before(() => {
    process.env.HACKATHON_COMPETE_SECRET = "phase10-test-secret-xx";
    process.env.NEXT_PUBLIC_SUPABASE_URL =
      process.env.NEXT_PUBLIC_SUPABASE_URL || "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder";
    process.env.SUPABASE_SERVICE_ROLE_KEY =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.service-role-placeholderxx";
  });

  it("matches salted hmac and rejects wrong flag", async () => {
    const { hashFlag, flagsMatch } = await import("../flagCrypto");
    const hash = hashFlag("FLAG{ok}", "task-1");
    assert.equal(flagsMatch("FLAG{ok}", hash, "task-1"), true);
    assert.equal(flagsMatch("FLAG{no}", hash, "task-1"), false);
  });

  it("accepts legacy plain sha256 hashes", async () => {
    const { flagsMatch } = await import("../flagCrypto");
    const legacy = createHash("sha256").update("FLAG{legacy}").digest("hex");
    assert.equal(flagsMatch("FLAG{legacy}", legacy, "task-x"), true);
  });
});
