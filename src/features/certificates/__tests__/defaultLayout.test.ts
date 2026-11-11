import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { defaultLayout } from "../layout.types";
import { renderCertificate } from "../renderCertificate";

describe("defaultLayout seed", () => {
  it("includes title, attendee name, body, number, and QR", () => {
    const layout = defaultLayout();
    const contents = layout.elements.map((e) => e.content || "").join(" ");
    assert.ok(contents.includes("Certificate of Completion"));
    assert.ok(contents.includes("{{attendeeName}}"));
    assert.ok(contents.includes("{{certificateNumber}}"));
    assert.ok(layout.elements.some((e) => e.type === "qr"));
  });

  it("renders tokens from certificate data", () => {
    const { svg } = renderCertificate(defaultLayout(), {
      recipient_name: "Alex Rivera",
      event_title: "Demo Summit",
      event_dates: "11 Nov 2026",
      role: "Attendee",
      certificate_number: "CERT-1",
      verify_url: "https://example.com/certificate/abc",
    });
    assert.ok(svg.includes("Alex Rivera"));
    assert.ok(svg.includes("Demo Summit") || svg.includes("CERT-1"));
  });
});
