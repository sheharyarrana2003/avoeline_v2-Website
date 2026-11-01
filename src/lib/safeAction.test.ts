import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { safeAction, safeFail, toLegacyResult } from "./safeAction";

describe("safeAction", () => {
  it("rejects invalid input", async () => {
    const action = safeAction({
      input: z.object({ email: z.string().email() }),
      run: async () => ({ done: true }),
    });
    const result = await action({ email: "not-an-email" });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error.code, "VALIDATION");
  });

  it("runs with auth and returns data", async () => {
    const action = safeAction({
      input: z.object({ n: z.number().int().positive() }),
      auth: async () => ({ userId: "u1" }),
      run: async (input, auth) => ({ sum: input.n + auth.userId.length }),
    });
    const result = await action({ n: 3 });
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.data.sum, 5);
  });

  it("propagates auth failures", async () => {
    const action = safeAction({
      input: z.object({}),
      auth: async () => safeFail("UNAUTHORIZED", "Sign in required."),
      run: async () => ({ ok: true as const, data: undefined }),
    });
    const result = await action({});
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error.code, "UNAUTHORIZED");
  });

  it("bridges to legacy ActionResult", () => {
    assert.deepEqual(toLegacyResult({ ok: true, data: null }), { success: true });
    assert.deepEqual(toLegacyResult(safeFail("X", "nope")), { success: false, error: "nope" });
  });
});
