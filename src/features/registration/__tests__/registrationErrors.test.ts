import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  looksLikeRawValidatorText,
  mapProofUploadClientError,
  mapRegistrationValidationMessage,
  UPLOAD_FILE_HELP,
} from "../registrationErrors";

describe("registrationErrors", () => {
  it("maps Zod object/undefined text to plain upload help", () => {
    const mapped = mapRegistrationValidationMessage(
      "Invalid input: expected object, received undefined",
    );
    assert.equal(mapped, UPLOAD_FILE_HELP);
    assert.equal(looksLikeRawValidatorText(mapped), false);
  });

  it("keeps short plain schema messages", () => {
    const msg = "Email must be a valid email";
    assert.equal(mapRegistrationValidationMessage(msg), msg);
  });

  it("maps proof upload not-found and closed to attendee copy", () => {
    assert.match(mapProofUploadClientError("Event not found.", 404), /couldn't find this event/i);
    assert.match(
      mapProofUploadClientError("This event is not open for registration."),
      /not open for registration/i,
    );
  });

  it("never returns raw validator phrases from proof mapper", () => {
    const out = mapProofUploadClientError("Invalid input: expected object, received undefined");
    assert.equal(looksLikeRawValidatorText(out), false);
  });
});
