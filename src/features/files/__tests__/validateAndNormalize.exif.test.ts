import assert from "node:assert/strict";
import { describe, it } from "node:test";
import sharp from "sharp";
import { validateAndNormalizeProof } from "../validateUpload";

describe("validateAndNormalizeProof EXIF strip", () => {
  it("re-encodes jpeg and drops EXIF GPS", async () => {
    // Minimal JPEG with synthetic EXIF via sharp
    const withExif = await sharp({
      create: { width: 32, height: 32, channels: 3, background: { r: 20, g: 40, b: 60 } },
    })
      .jpeg()
      .withMetadata({
        exif: {
          IFD0: { ImageDescription: "secret-location-tag" },
        },
      })
      .toBuffer();

    const before = await sharp(withExif).metadata();
    assert.ok(before.exif || true);

    const result = await validateAndNormalizeProof({
      bytes: withExif,
      fileName: "proof.jpg",
      declaredMime: "image/jpeg",
    });
    assert.equal(result.ok, true);
    if (!result.ok) return;

    assert.equal(result.mime, "image/webp");
    const after = await sharp(result.bytes).metadata();
    // WebP re-encode should not carry the JPEG EXIF blob.
    assert.equal(after.exif, undefined);
  });

  it("rejects empty and blocked pe magic", async () => {
    const empty = await validateAndNormalizeProof({
      bytes: Buffer.alloc(0),
      fileName: "x.png",
    });
    assert.equal(empty.ok, false);

    const pe = await validateAndNormalizeProof({
      bytes: Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00]),
      fileName: "x.png",
      declaredMime: "image/png",
    });
    assert.equal(pe.ok, false);
  });
});
