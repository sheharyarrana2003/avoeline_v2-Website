import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decryptWithKey, encryptWithKey } from "@/src/features/connections/lib/crypto";

describe("connections token crypto", () => {
  const key = "test-connections-key-32b!";

  it("encrypts and decrypts round-trip", () => {
    const plain = "refresh-token-value-å";
    const enc = encryptWithKey(plain, key);
    assert.match(enc, /^[^:]+:[^:]+:[^:]+$/);
    assert.equal(decryptWithKey(enc, key), plain);
  });

  it("rejects tampered ciphertext", () => {
    const enc = encryptWithKey("secret", key);
    const [iv, tag, data] = enc.split(":");
    const bad = `${iv}:${tag}:${Buffer.from("nope").toString("base64")}`;
    assert.throws(() => decryptWithKey(bad, key));
    void data;
  });
});
