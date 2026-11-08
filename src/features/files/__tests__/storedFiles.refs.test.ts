import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  contentDisposition,
  fileIdFromStorageRef,
  publicFileUrl,
  shouldInline,
  storageRefForFileId,
} from "../fileRefs.logic";

describe("stored file refs", () => {
  it("round-trips file: refs", () => {
    const id = "11111111-1111-4111-8111-111111111111";
    assert.equal(storageRefForFileId(id), `file:${id}`);
    assert.equal(fileIdFromStorageRef(`file:${id}`), id);
    assert.equal(fileIdFromStorageRef("drive:abc"), null);
    assert.equal(publicFileUrl(id), `/api/files/${id}`);
  });

  it("inline for images and pdf only", () => {
    assert.equal(shouldInline("image/png"), true);
    assert.equal(shouldInline("application/pdf"), true);
    assert.equal(shouldInline("application/zip"), false);
  });

  it("content-disposition never embeds newlines", () => {
    const d = contentDisposition(true, "evil\r\nname.png");
    assert.ok(!d.includes("\r"));
    assert.ok(!d.includes("\n"));
    assert.match(d, /^inline;/);
  });
});
