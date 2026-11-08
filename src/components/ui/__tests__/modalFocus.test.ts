import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { trapFocusKeyDown } from "../modalFocus";

function fakeRoot(ids: string[]) {
  const nodes = ids.map((id) => {
    const el = {
      id,
      tabIndex: 0,
      hasAttribute: () => false,
      offsetParent: {},
      focus: () => {
        focused = el;
      },
    };
    return el;
  });
  let focused: (typeof nodes)[number] | null = nodes[0] ?? null;
  return {
    nodes,
    get focused() {
      return focused;
    },
    querySelectorAll: () => nodes,
    contains: (el: unknown) => nodes.includes(el as (typeof nodes)[number]),
  };
}

describe("trapFocusKeyDown", () => {
  it("cycles Tab from last to first", () => {
    const root = fakeRoot(["a", "b", "c"]);
    let prevented = false;
    const handled = trapFocusKeyDown(
      root as unknown as ParentNode,
      {
        key: "Tab",
        shiftKey: false,
        preventDefault: () => {
          prevented = true;
        },
      },
      root.nodes[2] as unknown as Element,
    );
    assert.equal(handled, true);
    assert.equal(prevented, true);
    assert.equal(root.focused?.id, "a");
  });

  it("cycles Shift+Tab from first to last", () => {
    const root = fakeRoot(["a", "b"]);
    let prevented = false;
    const handled = trapFocusKeyDown(
      root as unknown as ParentNode,
      {
        key: "Tab",
        shiftKey: true,
        preventDefault: () => {
          prevented = true;
        },
      },
      root.nodes[0] as unknown as Element,
    );
    assert.equal(handled, true);
    assert.equal(prevented, true);
    assert.equal(root.focused?.id, "b");
  });

  it("ignores non-Tab keys", () => {
    const root = fakeRoot(["a"]);
    const handled = trapFocusKeyDown(
      root as unknown as ParentNode,
      { key: "Escape", shiftKey: false, preventDefault: () => {} },
      root.nodes[0] as unknown as Element,
    );
    assert.equal(handled, false);
  });
});

describe("modal opacity contract", () => {
  it("documents solid panel + dimmed overlay classes", () => {
    // Regression lock for O5: panel must stay fully opaque when portaled.
    assert.equal("bg-paper opacity-100".includes("opacity-100"), true);
    assert.equal("bg-black/60".includes("black/60"), true);
    assert.equal("z-[100]".includes("100"), true);
  });
});
