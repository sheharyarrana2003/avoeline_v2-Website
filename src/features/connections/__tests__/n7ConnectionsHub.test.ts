import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { requiredScopesForCapability } from "../catalog";
import {
  accountPermissionChips,
  findConnectionWithCapability,
  hasEnabledCapability,
} from "../lib/connectionCardHelpers";
import {
  formatConnectionUserError,
  formatGoogleMappedError,
  formatSafeActionError,
} from "../lib/connectionUserErrors";
import { diagnoseGoogleConnectionsEnv } from "@/src/env";
import type { ConnectionPublic } from "../types";

const here = path.dirname(fileURLToPath(import.meta.url));

function mockConnection(
  caps: Array<{
    capability: ConnectionPublic["capabilities"][number]["capability"];
    enabled: boolean;
  }>,
): ConnectionPublic {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    ownerType: "user",
    ownerId: "22222222-2222-4222-8222-222222222222",
    provider: "google",
    providerAccountId: "g1",
    providerEmail: "org@example.com",
    displayName: "Org",
    avatarUrl: null,
    status: "active",
    grantedScopes: [],
    connectedAt: new Date().toISOString(),
    lastUsedAt: null,
    lastError: null,
    capabilities: caps.map((c) => ({ ...c, settings: {} })),
  };
}

describe("N7 connection card helpers", () => {
  it("lists each account once with chips (no per-integration duplicate rows)", () => {
    const conn = mockConnection([
      { capability: "email.send", enabled: true },
      { capability: "calendar", enabled: true },
      { capability: "meet", enabled: true },
      { capability: "drive.files", enabled: false },
    ]);
    const chips = accountPermissionChips(conn);
    assert.equal(chips.length, 3);
    assert.deepEqual(
      chips.map((c) => c.label),
      ["Email", "Calendar and Meet", "Drive"],
    );
    assert.equal(chips.find((c) => c.id === "email")?.enabled, true);
    assert.equal(chips.find((c) => c.id === "calendar-meet")?.enabled, true);
    assert.equal(chips.find((c) => c.id === "drive")?.enabled, false);
  });

  it("finds email capability without treating other caps as send-test hosts", () => {
    const email = mockConnection([{ capability: "email.send", enabled: true }]);
    const calOnly = mockConnection([{ capability: "calendar", enabled: true }]);
    assert.ok(findConnectionWithCapability([email, calOnly], "email.send")?.id === email.id);
    assert.equal(findConnectionWithCapability([calOnly], "email.send"), undefined);
    assert.ok(hasEnabledCapability(calOnly, "calendar"));
    assert.equal(hasEnabledCapability(calOnly, "email.send"), false);
  });
});

describe("N7 incremental consent scopes", () => {
  it("Enable Email asks only gmail.send (+ identity)", () => {
    const scopes = requiredScopesForCapability("email.send");
    assert.ok(scopes.includes("https://www.googleapis.com/auth/gmail.send"));
    assert.ok(!scopes.includes("https://www.googleapis.com/auth/calendar.events"));
    assert.ok(!scopes.includes("https://www.googleapis.com/auth/drive.file"));
  });

  it("Enable Calendar asks only calendar.events (+ identity)", () => {
    const scopes = requiredScopesForCapability("calendar");
    assert.ok(scopes.includes("https://www.googleapis.com/auth/calendar.events"));
    assert.ok(!scopes.includes("https://www.googleapis.com/auth/gmail.send"));
  });

  it("Enable Drive asks only drive.file (+ identity)", () => {
    const scopes = requiredScopesForCapability("drive.files");
    assert.ok(scopes.includes("https://www.googleapis.com/auth/drive.file"));
    assert.ok(!scopes.includes("https://www.googleapis.com/auth/gmail.send"));
  });

  it("Enable Sheets asks only drive.file (+ identity)", () => {
    const scopes = requiredScopesForCapability("sheets.sync");
    assert.deepEqual(
      scopes.filter((s) => s.startsWith("https://")),
      ["https://www.googleapis.com/auth/drive.file"],
    );
  });
});

describe("N7 user-facing errors", () => {
  it("maps codes to specific safe messages", () => {
    assert.match(formatConnectionUserError("CONFIG"), /platform admin/i);
    assert.match(formatConnectionUserError("NO_CONNECTION"), /Connect Google/i);
    assert.match(formatConnectionUserError("QUOTA"), /limit/i);
    assert.match(formatConnectionUserError("ADMIN_BLOCKED"), /organization/i);
    assert.match(formatConnectionUserError("PERMISSION"), /Enable/i);
    assert.match(formatSafeActionError({ code: "NEEDS_RECONNECT" }), /Reconnect/i);
  });

  it("never echoes Google JSON bodies", () => {
    const out = formatConnectionUserError('{"error":{"message":"secret-token-xyz"}}');
    assert.doesNotMatch(out, /secret-token/);
    assert.doesNotMatch(out, /\{/);
    const mapped = formatGoogleMappedError({
      kind: "other",
      message: '{"error":"leak"}',
      status: 500,
    });
    assert.doesNotMatch(mapped, /leak/);
  });
});

describe("N7 OAuth diagnostics", () => {
  it("exposes presence flags and redirect path without secret values", () => {
    const d = diagnoseGoogleConnectionsEnv();
    assert.ok(Array.isArray(d.variables));
    assert.ok(d.variables.some((v) => v.name === "GOOGLE_OAUTH_CLIENT_ID"));
    assert.ok(d.variables.some((v) => v.name === "GOOGLE_OAUTH_CLIENT_SECRET"));
    assert.ok(d.variables.some((v) => v.name === "GOOGLE_OAUTH_REDIRECT_URI"));
    assert.ok(d.variables.some((v) => v.name === "CONNECTIONS_ENCRYPTION_KEY"));
    assert.equal(d.expectedRedirectPath, "/api/connections/google/callback");
    const serialized = JSON.stringify(d);
    assert.doesNotMatch(serialized, /"clientSecret"\s*:/);
    assert.doesNotMatch(serialized, /GOCSPX-/);
    for (const v of d.variables) {
      assert.equal(typeof v.present, "boolean");
      assert.ok(!("value" in v));
    }
  });
});

describe("N7 disconnect revokes and removes tokens", () => {
  it("disconnectConnection revokes at Google then deletes integration_secrets", () => {
    const src = readFileSync(path.join(here, "../server/connections.service.ts"), "utf8");
    const fn = src.slice(src.indexOf("export async function disconnectConnection"));
    assert.match(fn, /GoogleOAuthProvider\.revokeToken/);
    assert.match(fn, /INTEGRATION_SECRETS/);
    assert.match(fn, /\.delete\(/);
    assert.match(fn, /status:\s*"revoked"/);
    const revokeAt = fn.indexOf("revokeToken");
    const deleteAt = fn.indexOf(".delete(");
    assert.ok(revokeAt >= 0 && deleteAt > revokeAt);
  });
});

describe("N7 hub UI structure (source)", () => {
  it("ConnectionsHub has no tab bar and no duplicate ConnectionRow under integrations", () => {
    const hub = readFileSync(path.join(here, "../components/ConnectionsHub.tsx"), "utf8");
    assert.doesNotMatch(hub, /ConnectionsHubTab/);
    assert.doesNotMatch(hub, /from "\.\/IntegrationCard"/);
    assert.doesNotMatch(hub, /from "\.\/ConnectionRow"/);
    assert.match(hub, /GoogleAccountCard/);
    assert.match(hub, /EmailIntegrationCard/);
    assert.match(hub, /CalendarMeetIntegrationCard/);
    assert.match(hub, /DriveIntegrationCard/);
    assert.match(hub, /SheetsIntegrationCard/);
  });

  it("Send test email lives only on the Email card", () => {
    const cards = readFileSync(
      path.join(here, "../components/CapabilityIntegrationCards.tsx"),
      "utf8",
    );
    assert.match(cards, /Send test email to me/);
    assert.equal((cards.match(/await testConnectionAction/g) || []).length, 1);
    const calSection = cards.slice(cards.indexOf("export function CalendarMeetIntegrationCard"));
    assert.doesNotMatch(calSection, /testConnectionAction/);
    const driveSection = cards.slice(cards.indexOf("export function DriveIntegrationCard"));
    assert.doesNotMatch(
      driveSection.slice(0, driveSection.indexOf("export function Sheets")),
      /testConnectionAction/,
    );
  });
});
