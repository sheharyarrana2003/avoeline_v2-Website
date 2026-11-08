import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  COMPOSER_PREVIEW_SAMPLE,
  formatFormAnswers,
  isEventFree,
  MEMBER_QR_INLINE_LIMIT,
  previewSubstitute,
  shouldInlineMemberQrs,
} from "../emailCompose.logic";
import { toggleEmailBlockInBody } from "../emailTypes";

describe("emailCompose.logic", () => {
  it("inlines member QRs only up to the limit", () => {
    assert.equal(shouldInlineMemberQrs(1), true);
    assert.equal(shouldInlineMemberQrs(MEMBER_QR_INLINE_LIMIT), true);
    assert.equal(shouldInlineMemberQrs(MEMBER_QR_INLINE_LIMIT + 1), false);
    assert.equal(shouldInlineMemberQrs(0), false);
  });

  it("substitutes composer preview tokens", () => {
    const out = previewSubstitute(
      "Hello {{attendeeName}} — {{eventTitle}}",
      COMPOSER_PREVIEW_SAMPLE,
    );
    assert.match(out, /Alex/);
    assert.match(out, /Sample Event/);
  });

  it("toggles include blocks in the compose body", () => {
    let body = "Hello";
    body = toggleEmailBlockInBody(body, "team_name", true);
    assert.match(body, /\[team_name\]/);
    assert.match(body, /\{\{teamName\}\}/);
    body = toggleEmailBlockInBody(body, "competition", true);
    assert.match(body, /\[competition\]/);
    body = toggleEmailBlockInBody(body, "team_name", false);
    assert.equal(body.includes("[team_name]"), false);
    assert.match(body, /\[competition\]/);
  });

  it("formats form answers and detects free events", () => {
    assert.match(formatFormAnswers({ shirt_size: "M", notes: "" }), /Shirt Size: M/);
    assert.equal(isEventFree({ isFree: true }), true);
    assert.equal(isEventFree({ priceOfTicket: 0, finalPrice: 0 }), true);
    assert.equal(isEventFree({ priceOfTicket: 500, finalPrice: 500 }), false);
  });

  it("omits payment sample when free", () => {
    const paid = previewSubstitute("Pay {{paymentStatus}}", {
      ...COMPOSER_PREVIEW_SAMPLE,
      paymentStatus: "completed",
    });
    const free = previewSubstitute("Pay {{paymentStatus}}", {
      ...COMPOSER_PREVIEW_SAMPLE,
      paymentStatus: "",
    });
    assert.match(paid, /completed/);
    assert.equal(free, "Pay ");
  });
});
