import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import {
  ALLOWED_PROOF_MIMES,
  extensionOf,
  isBlockedExecutable,
  sniffMime,
} from "../validateUpload.logic";

describe("validateUpload guards", () => {
  it("blocks executable extensions and mimes", () => {
    assert.equal(
      isBlockedExecutable({ name: "payload.exe", mime: "application/octet-stream" }),
      true,
    );
    assert.equal(isBlockedExecutable({ name: "run.bat", mime: "text/plain" }), true);
    assert.equal(isBlockedExecutable({ name: "x.js", mime: "application/javascript" }), true);
    assert.equal(isBlockedExecutable({ name: "proof.pdf", mime: "application/pdf" }), false);
    assert.equal(isBlockedExecutable({ name: "shot.png", mime: "image/png" }), false);
  });

  it("sniffs magic bytes", () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    assert.equal(sniffMime(jpeg), "image/jpeg");
    const pdf = Buffer.from("%PDF-1.4 mock");
    assert.equal(sniffMime(pdf), "application/pdf");
    const pe = Buffer.from([0x4d, 0x5a, 0x90, 0x00]);
    assert.equal(sniffMime(pe), "application/x-msdownload");
  });

  it("hashes stably", () => {
    const a = createHash("sha256").update("hello").digest("hex");
    const b = createHash("sha256").update("hello").digest("hex");
    assert.equal(a, b);
    assert.equal(a.length, 64);
  });

  it("extensionOf reads last segment", () => {
    assert.equal(extensionOf("a/b/c.PNG"), "png");
    assert.equal(extensionOf("noext"), "");
  });

  it("allowlist contains proof types", () => {
    assert.ok(ALLOWED_PROOF_MIMES.has("image/webp"));
    assert.ok(ALLOWED_PROOF_MIMES.has("application/pdf"));
  });
});
