import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getUploadKindConfig,
  isUploadKind,
  mimeAllowedForKind,
  pathForUploadKind,
  UPLOAD_KINDS,
} from "../uploadKinds";

describe("uploadKinds", () => {
  it("lists every N1 kind", () => {
    for (const k of [
      "event_banner",
      "event_gallery",
      "sponsor_logo",
      "collaborator_logo",
      "partner_logo",
      "speaker_photo",
      "competition_image",
      "payment_proof",
      "submission_file",
      "task_attachment",
      "certificate_asset",
      "certificate_archive",
      "export_file",
    ] as const) {
      assert.equal(isUploadKind(k), true);
      assert.ok(UPLOAD_KINDS.includes(k));
    }
  });

  it("routes public display kinds to supabase_public and private to filestore", () => {
    assert.equal(getUploadKindConfig("event_banner").store, "supabase_public");
    assert.equal(getUploadKindConfig("sponsor_logo").store, "supabase_public");
    assert.equal(getUploadKindConfig("payment_proof").store, "filestore");
    assert.equal(getUploadKindConfig("submission_file").store, "filestore");
  });

  it("rejects video mime on public image kinds", () => {
    assert.equal(mimeAllowedForKind("event_gallery", "video/mp4"), false);
    assert.equal(mimeAllowedForKind("event_banner", "image/jpeg"), true);
    assert.equal(mimeAllowedForKind("payment_proof", "application/pdf"), true);
  });

  it("builds stable paths per kind", () => {
    const path = pathForUploadKind({
      kind: "sponsor_logo",
      ownerId: "org-1",
      eventId: "evt-1",
      fileId: "fid",
      safeName: "logo.webp",
    });
    assert.match(path, /^sponsors\/evt-1\/org-1\/fid-logo\.webp$/);
  });

  it("enforces organizer vs public_registrant who", () => {
    assert.deepEqual(getUploadKindConfig("event_banner").who, ["organizer"]);
    assert.deepEqual(getUploadKindConfig("payment_proof").who, ["public_registrant"]);
  });
});
