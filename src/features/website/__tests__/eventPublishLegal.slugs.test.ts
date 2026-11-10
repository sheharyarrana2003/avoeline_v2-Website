import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EVENT_PUBLISH_LEGAL_SLUGS, REGISTRATION_LEGAL_SLUGS } from "../consent.logic";

describe("legal acceptance slug sets", () => {
  it("registration keeps privacy + terms", () => {
    assert.deepEqual([...REGISTRATION_LEGAL_SLUGS], ["privacy", "terms"]);
  });

  it("event publish records terms, organizer-agreement, content-rights", () => {
    assert.deepEqual(
      [...EVENT_PUBLISH_LEGAL_SLUGS],
      ["terms", "organizer-agreement", "content-rights"],
    );
    const publish = new Set<string>(EVENT_PUBLISH_LEGAL_SLUGS);
    assert.ok(publish.has("organizer-agreement"));
    assert.ok(publish.has("content-rights"));
    assert.equal(publish.has("privacy"), false);
  });
});
