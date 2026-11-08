import assert from "node:assert/strict";
import { describe, it } from "node:test";

/** Mirrors issue default: archive on when Drive connected unless explicitly off. */
function resolveArchiveToDrive(opts: {
  archiveToDrive?: boolean;
  driveConnected: boolean;
}): boolean {
  if (opts.archiveToDrive !== undefined) return opts.archiveToDrive;
  return opts.driveConnected;
}

/** Private archive refs must not imply share-by-link. */
function isPrivateDriveArchive(extra: {
  driveRef?: string | null;
  driveShareUrl?: string | null;
}): boolean {
  return Boolean(extra.driveRef) && !extra.driveShareUrl;
}

describe("certificate Drive archive defaults", () => {
  it("defaults on when Drive connected", () => {
    assert.equal(resolveArchiveToDrive({ driveConnected: true }), true);
    assert.equal(resolveArchiveToDrive({ driveConnected: false }), false);
    assert.equal(resolveArchiveToDrive({ driveConnected: true, archiveToDrive: false }), false);
  });

  it("treats driveRef without share URL as private", () => {
    assert.equal(isPrivateDriveArchive({ driveRef: "files/x", driveShareUrl: null }), true);
    assert.equal(
      isPrivateDriveArchive({
        driveRef: "files/x",
        driveShareUrl: "https://drive.google.com/file/d/x/view",
      }),
      false,
    );
  });
});
