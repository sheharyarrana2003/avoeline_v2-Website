/**
 * Static guardrails for admin org identity split + public event deep links.
 * These catch regressions without spinning up Next or Supabase.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { join } from "node:path";

const root = join(process.cwd());

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

describe("admin departments & clubs identity", () => {
  it("department detail has no organizer dossier links", () => {
    const src = read("src/app/admin/departments/[id]/page.tsx");
    assert.equal(src.includes("/admin/organizers/"), false);
    assert.equal(/Open dossier/i.test(src), false);
    assert.match(src, /Account/);
    assert.match(src, /Club tenures|club tenures/i);
  });

  it("department and club event cards deep-link to /e/[id]", () => {
    const dept = read("src/app/admin/departments/[id]/page.tsx");
    const club = read("src/app/admin/clubs/[id]/page.tsx");
    assert.match(dept, /`\/e\/\$\{/);
    assert.match(club, /`\/e\/\$\{/);
    assert.equal(dept.includes("href={`/events/${"), false);
    assert.equal(club.includes("href={`/events/${"), false);
  });

  it("organizer detail redirects department tenants and has no outbound email panel", () => {
    const src = read("src/app/admin/organizers/[organizerId]/page.tsx");
    assert.match(src, /redirect\(`\/admin\/departments\/\$\{/);
    assert.equal(src.includes("OrganizerEmailConnectPanel"), false);
  });

  it("listOrganizers excludes department_admin memberships", () => {
    const src = read("src/features/admin/admin.service.ts");
    assert.match(src, /department_admin/);
    assert.match(src, /departmentAdminIds/);
  });

  it("/admin/departments redirects to /admin/orgs", () => {
    const src = read("src/app/admin/departments/page.tsx");
    assert.match(src, /redirect\(["']\/admin\/orgs["']\)/);
  });
});

describe("public event surface", () => {
  it("public page consumes getPublicEventView only", () => {
    const src = read("src/app/events/[eventId]/page.tsx");
    assert.match(src, /getPublicEventView/);
    assert.equal(src.includes("getEventForVisitor"), false);
    assert.equal(src.includes("getPublicEvent("), false);
  });

  it("short /e route redirects preserving query", () => {
    const src = read("src/app/e/[eventId]/page.tsx");
    assert.match(src, /\/events\//);
    assert.match(src, /redirect/);
  });
});
