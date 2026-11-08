import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatPickerUserError } from "../lib/pickerErrors";

describe("formatPickerUserError", () => {
  it("explains invalid developer key without echoing secrets", () => {
    const out = formatPickerUserError("The API developer key is invalid.");
    assert.match(out, /HTTP referrer/i);
    assert.match(out, /GOOGLE_PICKER_API_KEY/);
    assert.doesNotMatch(out, /AIza/);
  });

  it("passes through generic messages", () => {
    assert.equal(formatPickerUserError("Sign in required."), "Sign in required.");
  });
});
