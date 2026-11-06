import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  gateOpenAfterVerify,
  isAccessibleProviderFileId,
  linkedFileUniqueKey,
  mapDriveHttpToStatus,
  mayUseDriveFiles,
  mimeContainsForFamily,
  mimeFamily,
  mimeLabel,
  sanitizePickerTokenResponse,
  unlinkAffectsDriveFile,
} from "../lib/linkedFiles.logic";
import { mapHttpToAccessStatus } from "../providers/google/drive";

describe("C4 linked_files logic", () => {
  it("idempotent unique key is stable for same connection+file+entity", () => {
    const a = linkedFileUniqueKey("c1", "file-9", "event", "e1");
    const b = linkedFileUniqueKey("c1", "file-9", "event", "e1");
    const c = linkedFileUniqueKey("c1", "file-9", "event", "e2");
    assert.equal(a, b);
    assert.notEqual(a, c);
  });

  it("fails closed without drive capability or grant", () => {
    assert.equal(
      mayUseDriveFiles({ hasDriveCapability: false, isOwner: true, hasGrant: false }),
      false,
    );
    assert.equal(
      mayUseDriveFiles({ hasDriveCapability: true, isOwner: false, hasGrant: false }),
      false,
    );
    assert.equal(
      mayUseDriveFiles({ hasDriveCapability: true, isOwner: false, hasGrant: true }),
      true,
    );
  });

  it("picker token response never includes refresh fields", () => {
    const bad = sanitizePickerTokenResponse({
      accessToken: "ya29.x",
      expiresIn: 3000,
      apiKey: "key",
      appId: "123",
      clientId: "cid.apps.googleusercontent.com",
      refreshToken: "should-not",
    });
    assert.ok("error" in bad);

    const good = sanitizePickerTokenResponse({
      accessToken: "ya29.x",
      expiresIn: 3000,
      apiKey: "key",
      appId: "123",
      clientId: "cid.apps.googleusercontent.com",
    });
    assert.ok(!("error" in good));
    assert.equal(good.accessToken, "ya29.x");
    assert.ok(!("refreshToken" in good));
  });

  it("maps verify HTTP status to ok / missing / no_access", () => {
    assert.equal(mapDriveHttpToStatus(200), "ok");
    assert.equal(mapDriveHttpToStatus(404), "missing");
    assert.equal(mapDriveHttpToStatus(403), "no_access");
    assert.equal(mapHttpToAccessStatus(401), "no_access");
  });

  it("unlink does not delete the Drive file", () => {
    assert.equal(unlinkAffectsDriveFile(), false);
  });

  it("mime labels and family filters", () => {
    assert.equal(mimeLabel("application/vnd.google-apps.document"), "Doc");
    assert.equal(mimeLabel("application/vnd.google-apps.spreadsheet"), "Sheet");
    assert.equal(mimeLabel("application/vnd.google-apps.presentation"), "Slides");
    assert.equal(mimeFamily("application/vnd.google-apps.document"), "doc");
    assert.equal(mimeContainsForFamily("doc"), "document");
    assert.equal(mimeContainsForFamily("sheet"), "spreadsheet");
    assert.equal(mimeContainsForFamily("slides"), "presentation");
    assert.equal(mimeContainsForFamily(""), undefined);
    assert.equal(mimeContainsForFamily("other"), undefined);
  });

  it("gateOpenAfterVerify blocks missing and no_access with fix copy", () => {
    assert.deepEqual(gateOpenAfterVerify("ok"), { allow: true });
    const missing = gateOpenAfterVerify("missing");
    assert.equal(missing.allow, false);
    if (!missing.allow) assert.match(missing.reason, /missing/i);
    const denied = gateOpenAfterVerify("no_access");
    assert.equal(denied.allow, false);
    if (!denied.allow) assert.match(denied.reason, /Reconnect|share/i);
  });

  it("accessible file set is only linked provider ids", () => {
    const linked = ["file-a", "file-b"];
    assert.equal(isAccessibleProviderFileId("file-a", linked), true);
    assert.equal(isAccessibleProviderFileId("file-z", linked), false);
    assert.equal(isAccessibleProviderFileId("file-b", new Set(linked)), true);
  });
});
