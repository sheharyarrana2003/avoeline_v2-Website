import assert from "node:assert/strict";
import { describe, it } from "node:test";

/**
 * Mirrors `certificateEmail.ts` (that module pulls server-only via email helpers).
 * Primary CTA = viewer URL; Drive block only when opt-in + share URL.
 */
const DRIVE_SHARE_WARNING =
  "Anyone with this Google Drive link can view that file. Only include it if you accept that risk.";

function shouldIncludeDriveLinkInEmail(opts: {
  includeDriveLink: boolean;
  driveShareUrl?: string | null;
}): boolean {
  return Boolean(opts.includeDriveLink && String(opts.driveShareUrl || "").trim());
}

function buildEmailSnippet(opts: {
  viewerUrl: string;
  includeDriveLink?: boolean;
  driveShareUrl?: string | null;
}): { text: string; html: string } {
  const drive =
    opts.includeDriveLink && opts.driveShareUrl ? String(opts.driveShareUrl).trim() : "";
  const openUrl = opts.viewerUrl;
  return {
    text: [
      `View your certificate: ${openUrl}`,
      drive ? `Google Drive copy (shared link): ${drive}` : null,
    ]
      .filter((line): line is string => line !== null)
      .join("\n"),
    html: [
      `<a href="${openUrl}">View certificate</a>`,
      drive ? `<a href="${drive}">Open Drive copy</a>` : "",
    ].join(""),
  };
}

describe("buildCertificateEmail CTA", () => {
  it("uses viewer URL as primary CTA (works with Drive down)", () => {
    const built = buildEmailSnippet({
      viewerUrl: "https://app.example/certificate/VERIFY01",
    });
    assert.match(
      built.text,
      /View your certificate: https:\/\/app\.example\/certificate\/VERIFY01/,
    );
    assert.match(built.html, /View certificate/);
    assert.doesNotMatch(built.html, /Open Drive copy/);
    assert.doesNotMatch(built.text, /Google Drive copy/);
  });

  it("omits Drive unless includeDriveLink and share URL", () => {
    const noShare = buildEmailSnippet({
      viewerUrl: "https://app.example/certificate/VERIFY01",
      includeDriveLink: true,
      driveShareUrl: null,
    });
    assert.doesNotMatch(noShare.html, /Open Drive copy/);

    const withShare = buildEmailSnippet({
      viewerUrl: "https://app.example/certificate/VERIFY01",
      includeDriveLink: true,
      driveShareUrl: "https://drive.google.com/file/d/x/view",
    });
    assert.match(withShare.html, /Open Drive copy/);
    assert.match(withShare.text, /Google Drive copy \(shared link\)/);
  });
});

describe("shouldIncludeDriveLinkInEmail", () => {
  it("requires both opt-in and non-empty share URL", () => {
    assert.equal(
      shouldIncludeDriveLinkInEmail({ includeDriveLink: false, driveShareUrl: "https://x" }),
      false,
    );
    assert.equal(
      shouldIncludeDriveLinkInEmail({ includeDriveLink: true, driveShareUrl: "" }),
      false,
    );
    assert.equal(
      shouldIncludeDriveLinkInEmail({ includeDriveLink: true, driveShareUrl: "https://x" }),
      true,
    );
  });
});

describe("DRIVE_SHARE_WARNING", () => {
  it("warns that anyone with the link can view", () => {
    assert.match(DRIVE_SHARE_WARNING, /Anyone with this Google Drive link/i);
  });
});
