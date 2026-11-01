import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  normalizePermissionKey,
  normalizePermissionList,
  TAB_PERMISSION,
  LEGACY_PERMISSION_MAP,
} from "@/src/lib/permissions";

describe("permissions catalog", () => {
  it("maps legacy page_* keys", () => {
    assert.equal(normalizePermissionKey("page_attendees"), "registrations:manage");
    assert.equal(normalizePermissionKey("page_access"), "access:manage");
    assert.equal(normalizePermissionKey("page_competitions"), "hackathon:manage");
    assert.equal(normalizePermissionKey("teams:manage"), "teams:manage");
  });

  it("dedupes normalized lists", () => {
    const out = normalizePermissionList([
      "page_attendees",
      "registrations:manage",
      "page_attendees",
    ]);
    assert.deepEqual(out, ["registrations:manage"]);
  });

  it("covers staff and hackathon tabs", () => {
    assert.equal(TAB_PERMISSION.staff, "teams:manage");
    assert.equal(TAB_PERMISSION.attendees, "registrations:manage");
    assert.equal(TAB_PERMISSION.competitions, "hackathon:manage");
    assert.ok(Object.keys(LEGACY_PERMISSION_MAP).length >= 8);
  });
});
