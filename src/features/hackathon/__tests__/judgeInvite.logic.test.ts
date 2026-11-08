import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyJudgeInviteTemplate,
  clampJudgePoints,
  meanJudgePoints,
  statusAfterOpen,
  statusAfterResend,
} from "../judgeInvite.logic";

describe("judge invite lifecycle", () => {
  it("marks invited as opened", () => {
    assert.equal(statusAfterOpen("invited"), "opened");
    assert.equal(statusAfterOpen("accepted"), "accepted");
    assert.equal(statusAfterOpen("declined"), "declined");
  });

  it("resets declined to invited on resend", () => {
    assert.equal(statusAfterResend("declined"), "invited");
    assert.equal(statusAfterResend("accepted"), "accepted");
    assert.equal(statusAfterResend("opened"), "opened");
  });
});

describe("judge scoring bounds", () => {
  it("clamps to 0..task max", () => {
    assert.equal(clampJudgePoints(-1, 10), 0);
    assert.equal(clampJudgePoints(15, 10), 10);
    assert.equal(clampJudgePoints(7.555, 10), 7.56);
    assert.equal(clampJudgePoints(3, 0), 0);
  });

  it("averages judge scores", () => {
    assert.equal(meanJudgePoints([10, 8]), 9);
    assert.equal(meanJudgePoints([]), 0);
  });
});

describe("invite template", () => {
  it("replaces tokens", () => {
    const out = applyJudgeInviteTemplate("Hi {{name}} — {{link}} for {{eventTitle}}", {
      name: "Ada",
      link: "https://x/j",
      eventTitle: "Demo",
    });
    assert.equal(out, "Hi Ada — https://x/j for Demo");
  });
});
