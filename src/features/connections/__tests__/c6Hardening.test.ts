import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { INTEGRATION_CATALOG } from "../catalog";
import { sameOriginReturnTo } from "../lib/returnTo";
import { sanitizeCalendarText, sanitizeHeaderValue } from "../lib/calendarFallbacks";
import { sanitizeSheetCell } from "../lib/sheetSanitize";
import {
  isAccessibleProviderFileId,
  mayUseDriveFiles,
  sanitizePickerTokenResponse,
} from "../lib/linkedFiles.logic";
import { maySyncCalendar } from "../lib/calendarSync.logic";
import { oauthStateGate, scopeDowngradeBlocks } from "../lib/oauthState.logic";
import { missingRequiredScopes } from "../providers/google/errors";
import {
  auditDetailsStripSecrets,
  googleProviderImportAllowed,
  hasRestrictedScope,
  onlyAllowedScopes,
  organizerMailUsesPlatformSender,
  pickerResponseLeaksRefresh,
} from "../lib/securityChecks.logic";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");

describe("C6 static scope checks", () => {
  it("catalog never requests restricted scopes", () => {
    const all = INTEGRATION_CATALOG.flatMap((e) => e.scopes);
    assert.equal(hasRestrictedScope(all), false);
    assert.equal(onlyAllowedScopes(["openid", "email", ...all]), true);
  });

  it("import-boundary script passes", () => {
    const r = spawnSync(process.execPath, ["scripts/check-connections-imports.mjs"], {
      cwd: root,
      encoding: "utf8",
    });
    assert.equal(r.status, 0, r.stderr || r.stdout);
  });

  it("documents allowed google provider import paths", () => {
    assert.equal(googleProviderImportAllowed("features/connections/server/oauth.service.ts"), true);
    assert.equal(
      googleProviderImportAllowed("features/connections/actions/calendar.action.ts"),
      false,
    );
    assert.equal(
      googleProviderImportAllowed("features/email/organizerTransport.service.ts"),
      false,
    );
  });
});

describe("C6 threat helpers", () => {
  it("rejects open redirect returnTo", () => {
    assert.equal(sameOriginReturnTo("https://evil.example/phish", "https://avoeline.com"), "/");
    assert.equal(sameOriginReturnTo("//evil.example", "https://avoeline.com"), "/");
    assert.equal(
      sameOriginReturnTo("/organizer/x/settings/connections", "https://avoeline.com"),
      "/organizer/x/settings/connections",
    );
  });

  it("oauthStateGate blocks replay, expiry, and user mismatch", () => {
    const base = {
      usedAt: null as string | null,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      stateUserId: "user-a",
      actorId: "user-a",
    };
    assert.deepEqual(oauthStateGate(base), { ok: true });
    assert.equal(oauthStateGate({ ...base, usedAt: new Date().toISOString() }).ok, false);
    assert.equal(
      oauthStateGate({
        ...base,
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      }).ok,
      false,
    );
    assert.equal(oauthStateGate({ ...base, actorId: "user-b" }).ok, false);
  });

  it("scopeDowngradeBlocks when required scopes missing", () => {
    const missing = missingRequiredScopes(
      ["openid", "email"],
      ["openid", "email", "https://www.googleapis.com/auth/gmail.send"],
    );
    assert.ok(missing.length > 0);
    assert.equal(scopeDowngradeBlocks(missing), true);
    assert.equal(scopeDowngradeBlocks([]), false);
  });

  it("grant / linked-file allowlist fail closed", () => {
    assert.equal(
      mayUseDriveFiles({ hasDriveCapability: true, isOwner: false, hasGrant: false }),
      false,
    );
    assert.equal(
      maySyncCalendar({ hasCalendarCapability: true, isOwner: false, hasGrant: false }),
      false,
    );
    assert.equal(isAccessibleProviderFileId("file-z", ["file-a"]), false);
    assert.equal(isAccessibleProviderFileId("file-a", ["file-a"]), true);
  });

  it("strips ICS / header / formula injection", () => {
    assert.ok(!sanitizeHeaderValue("A\r\nB").includes("\n"));
    assert.ok(sanitizeCalendarText("x\u0000y").includes(" "));
    assert.equal(sanitizeSheetCell("=1+1"), "'=1+1");
  });

  it("picker token allowlist blocks refresh keys", () => {
    assert.equal(pickerResponseLeaksRefresh(["accessToken", "refreshToken"]), true);
    const bad = sanitizePickerTokenResponse({
      accessToken: "t",
      expiresIn: 1,
      apiKey: "k",
      appId: "1",
      clientId: "c",
      refresh_token: "nope",
    });
    assert.ok("error" in bad);
  });

  it("organizer mail must not use platform sender when resolveSender succeeds", () => {
    assert.equal(
      organizerMailUsesPlatformSender({ resolveSenderOk: true, usedPlatformResend: true }),
      true,
    );
    assert.equal(
      organizerMailUsesPlatformSender({ resolveSenderOk: true, usedPlatformResend: false }),
      false,
    );
  });

  it("audit details never keep secret-shaped keys", () => {
    const cleaned = auditDetailsStripSecrets({
      action: "send",
      refreshToken: "secret",
      access_token: "x",
      count: 3,
    });
    assert.equal(cleaned.count, 3);
    assert.equal(cleaned.refreshToken, undefined);
    assert.equal(cleaned.access_token, undefined);
  });
});
