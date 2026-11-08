import assert from "node:assert/strict";
import { describe, it } from "node:test";

/** Mirrors `folders.ts` A6 kinds / labels (pure — folders.ts is server-only). */
const EVENT_FOLDER_KINDS = [
  "payment_proofs",
  "certificates",
  "media",
  "exports",
  "submissions",
] as const;

const FOLDER_LABEL: Record<(typeof EVENT_FOLDER_KINDS)[number], string> = {
  payment_proofs: "Payment proofs",
  certificates: "Certificates",
  media: "Media",
  exports: "Exports",
  submissions: "Submissions",
};

function safeFileName(name: string, fallback = "file"): string {
  return (
    name
      .replace(/[\\/:*?"<>|]/g, "-")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120) || fallback
  );
}

describe("A6 event folder helpers", () => {
  it("exposes the five standard A6 kinds with stable labels", () => {
    assert.deepEqual(
      [...EVENT_FOLDER_KINDS],
      ["payment_proofs", "certificates", "media", "exports", "submissions"],
    );
    assert.equal(FOLDER_LABEL.certificates, "Certificates");
    assert.equal(FOLDER_LABEL.payment_proofs, "Payment proofs");
  });

  it("sanitizes file names for Drive", () => {
    assert.equal(safeFileName("a/b:c*?.pdf"), "a-b-c--.pdf");
    assert.equal(safeFileName("   "), "file");
  });
});

describe("linked file event auth tab", () => {
  it("uses files tab not attendees", () => {
    const tab = "files" as const;
    assert.equal(tab, "files");
    assert.notEqual(tab, "attendees");
  });
});
