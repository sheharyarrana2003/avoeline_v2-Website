import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isWorkspaceOAuthCapability,
  shouldBootstrapGoogleWorkspace,
  WORKSPACE_CAPABILITIES,
  WORKSPACE_GOOGLE_SCOPES,
} from "../lib/workspaceScopes.logic";

describe("workspace scopes bootstrap", () => {
  it("bootstraps organizers and vendors only", () => {
    assert.equal(shouldBootstrapGoogleWorkspace("organizer"), true);
    assert.equal(shouldBootstrapGoogleWorkspace("vendor"), true);
    assert.equal(shouldBootstrapGoogleWorkspace("attendee"), false);
    assert.equal(shouldBootstrapGoogleWorkspace(""), false);
  });

  it("includes gmail calendar and drive scopes", () => {
    assert.ok(WORKSPACE_GOOGLE_SCOPES.some((s) => s.includes("gmail.send")));
    assert.ok(WORKSPACE_GOOGLE_SCOPES.some((s) => s.includes("calendar.events")));
    assert.ok(WORKSPACE_GOOGLE_SCOPES.some((s) => s.includes("drive.file")));
    assert.ok(
      !(WORKSPACE_GOOGLE_SCOPES as readonly string[]).includes(
        "https://www.googleapis.com/auth/drive",
      ),
    );
  });

  it("workspace capability sentinel", () => {
    assert.equal(isWorkspaceOAuthCapability("workspace"), true);
    assert.equal(isWorkspaceOAuthCapability("email.send"), false);
    assert.deepEqual(WORKSPACE_CAPABILITIES, [
      "email.send",
      "calendar",
      "meet",
      "drive.files",
      "sheets.sync",
    ]);
  });
});
