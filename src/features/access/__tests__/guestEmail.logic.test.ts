import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyGuestEmailTokens,
  filterGuestRecipients,
  guestLinkFor,
  previewGuestEmailHtml,
  type GuestEmailRow,
} from "../guestEmail.logic";

const rows: GuestEmailRow[] = [
  {
    id: "1",
    email: "a@ex.com",
    name: "A",
    kind: "invite",
    token: "tok1",
    openedAt: null,
    registeredAt: null,
    revokedAt: null,
    expiresAt: "",
    singleUse: false,
  },
  {
    id: "2",
    email: "b@ex.com",
    name: "B",
    kind: "invite",
    token: "tok2",
    openedAt: "2026-01-01T00:00:00.000Z",
    registeredAt: null,
    revokedAt: null,
    expiresAt: "",
    singleUse: false,
  },
  {
    id: "3",
    email: "c@ex.com",
    name: "C",
    kind: "whitelist",
    token: null,
    openedAt: null,
    registeredAt: null,
    revokedAt: null,
    expiresAt: "",
    singleUse: false,
  },
  {
    id: "4",
    email: "d@ex.com",
    name: "D",
    kind: "invite",
    token: "tok4",
    openedAt: null,
    registeredAt: null,
    revokedAt: "2026-01-02T00:00:00.000Z",
    expiresAt: "",
    singleUse: false,
    lastEmailStatus: "failed",
  },
];

describe("guestEmail.logic", () => {
  it("applies tokens", () => {
    const out = applyGuestEmailTokens("Hi {{name}} {{inviteLink}} {{eventLink}} {{email}}", {
      name: "Alex",
      inviteLink: "https://x/i",
      eventLink: "https://x/e",
      email: "a@ex.com",
    });
    assert.match(out, /Alex/);
    assert.match(out, /https:\/\/x\/i/);
  });

  it("builds invite vs event links", () => {
    assert.equal(
      guestLinkFor({ kind: "invite", token: "abc" }, "https://app/events/e1"),
      "https://app/events/e1?invite=abc",
    );
    assert.equal(
      guestLinkFor({ kind: "whitelist", token: null }, "https://app/events/e1?x=1"),
      "https://app/events/e1",
    );
  });

  it("filters recipients", () => {
    assert.deepEqual(
      filterGuestRecipients(rows, "all_pending").map((r) => r.id),
      ["1", "3"],
    );
    assert.deepEqual(
      filterGuestRecipients(rows, "not_opened").map((r) => r.id),
      ["1"],
    );
    assert.deepEqual(
      filterGuestRecipients(rows, "not_registered").map((r) => r.id),
      ["1", "2", "3"],
    );
    assert.deepEqual(
      filterGuestRecipients(rows, "selected", ["2", "4"]).map((r) => r.id),
      ["2"],
    );
  });

  it("builds preview html without raw script", () => {
    const preview = previewGuestEmailHtml("Sub {{name}}", "Body <b>x</b>\nline", {
      name: "Alex",
      inviteLink: "https://app/i",
      eventLink: "https://app/e",
      email: "a@ex.com",
    });
    assert.equal(preview.subject, "Sub Alex");
    assert.match(preview.html, /&lt;b&gt;/);
    assert.match(preview.html, /https:\/\/app\/i/);
  });
});
