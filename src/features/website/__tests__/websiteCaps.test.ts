import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canWebsiteCap } from "@/src/features/admin/types";

describe("canWebsiteCap", () => {
  it("owner passes every cap", () => {
    const owner = { isOwner: true, permissions: [] as string[] };
    assert.equal(canWebsiteCap(owner, "website:view"), true);
    assert.equal(canWebsiteCap(owner, "website:edit"), true);
    assert.equal(canWebsiteCap(owner, "website:publish"), true);
    assert.equal(canWebsiteCap(owner, "legal:publish"), true);
    assert.equal(canWebsiteCap(owner, "contact:manage"), true);
    assert.equal(canWebsiteCap(owner, "community:view"), true);
  });

  it("non-owner without edit fails website:edit", () => {
    assert.equal(
      canWebsiteCap({ isOwner: false, permissions: ["website:view"] }, "website:edit"),
      false,
    );
  });

  it("view-only cannot publish", () => {
    assert.equal(
      canWebsiteCap({ isOwner: false, permissions: ["website:view"] }, "website:publish"),
      false,
    );
  });

  it("explicit edit passes; legacy manage implies view+edit only", () => {
    assert.equal(
      canWebsiteCap({ isOwner: false, permissions: ["website:edit"] }, "website:edit"),
      true,
    );
    assert.equal(
      canWebsiteCap({ isOwner: false, permissions: ["website:manage"] }, "website:view"),
      true,
    );
    assert.equal(
      canWebsiteCap({ isOwner: false, permissions: ["website:manage"] }, "website:edit"),
      true,
    );
    assert.equal(
      canWebsiteCap({ isOwner: false, permissions: ["website:manage"] }, "website:publish"),
      false,
    );
    assert.equal(canWebsiteCap({ isOwner: false, permissions: ["website"] }, "website:edit"), true);
    assert.equal(
      canWebsiteCap({ isOwner: false, permissions: ["website"] }, "legal:publish"),
      false,
    );
  });

  it("separates edit / publish / legal / contact / community caps", () => {
    const editor = { isOwner: false, permissions: ["website:edit"] };
    assert.equal(canWebsiteCap(editor, "website:edit"), true);
    assert.equal(canWebsiteCap(editor, "website:publish"), false);
    assert.equal(canWebsiteCap(editor, "legal:publish"), false);
    assert.equal(canWebsiteCap(editor, "contact:manage"), false);
    assert.equal(canWebsiteCap(editor, "community:view"), false);

    const publisher = { isOwner: false, permissions: ["website:publish"] };
    assert.equal(canWebsiteCap(publisher, "website:publish"), true);
    assert.equal(canWebsiteCap(publisher, "website:edit"), false);

    const legal = { isOwner: false, permissions: ["legal:publish"] };
    assert.equal(canWebsiteCap(legal, "legal:publish"), true);
    assert.equal(canWebsiteCap(legal, "website:publish"), false);

    const contact = { isOwner: false, permissions: ["contact:manage"] };
    assert.equal(canWebsiteCap(contact, "contact:manage"), true);
    assert.equal(canWebsiteCap(contact, "community:view"), false);

    const community = { isOwner: false, permissions: ["community:view"] };
    assert.equal(canWebsiteCap(community, "community:view"), true);
    assert.equal(canWebsiteCap(community, "contact:manage"), false);
  });
});
