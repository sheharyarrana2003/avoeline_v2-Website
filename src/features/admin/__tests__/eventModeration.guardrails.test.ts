/**
 * Static guardrails for admin events moderation UI.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { join } from "node:path";

const root = join(process.cwd());

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("admin events moderation guardrails", () => {
  it("EventsTable rows have no Reason textarea or Unpublish control", () => {
    const src = read("src/features/admin/components/events/EventsTable.tsx");
    assert.equal(/textarea/i.test(src), false);
    assert.equal(src.includes("ModerationForm"), false);
    assert.equal(src.includes("reasonLabel"), false);
    assert.equal(/\bUnpublish\b/.test(src), false);
    assert.equal(src.includes('submitLabel="Unpublish"'), false);
    assert.match(src, /Moderate/);
  });

  it("ModerateEventModal requires a reason for unpublish/remove", () => {
    const src = read("src/features/admin/components/events/ModerateEventModal.tsx");
    assert.match(src, /reason\.trim\(\)\.length >= 10/);
    assert.match(src, /confirmTitle/);
    assert.match(src, /isOwner/);
    assert.match(src, /Notify the organizer/);
  });

  it("moderateEventAction gates remove to owner and moderate to canManage", () => {
    const src = read("src/features/admin/actions/events.action.ts");
    assert.match(src, /isOwner/);
    assert.match(src, /canManageArea/);
    assert.match(src, /confirmTitle/);
    assert.match(src, /rateLimit/);
    assert.match(src, /moderation_unpublished/);
  });

  it("reportEvent rate-limits and dedupes per day", () => {
    const src = read("src/features/admin/actions/events.action.ts");
    assert.match(src, /report-event:/);
    assert.match(src, /already reported this event today/i);
  });

  it("EventThumb has designed gradient fallback and wide size", () => {
    const src = read("src/shared_components/ui/EventThumb.tsx");
    assert.match(src, /wide/);
    assert.match(src, /linear-gradient/);
    assert.match(src, /onError/);
  });

  it("page is thin and uses getAdminEventsBundle", () => {
    const src = read("src/app/admin/events/page.tsx");
    assert.match(src, /getAdminEventsBundle/);
    assert.match(src, /parseAdminEventFilters/);
    assert.equal(src.includes("ModerationForm"), false);
    assert.equal(src.includes("listAdminEventRows"), false);
  });
});
