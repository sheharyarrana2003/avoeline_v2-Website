import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultLayout } from "../layout.types";
import { renderCertificate, renderCertificatePdf } from "../renderCertificate";

const baseData = {
  recipient_name: "Alex Rivera",
  role: "Attendee",
  event_title: "Sample Summit",
  event_dates: "12 Oct 2026",
  issuer_name: "Avoeline",
  issuer_title: "Organizer",
  certificate_number: "CERT-TEST01",
  verify_url: "https://example.com/verify/test",
};

test("SVG contains short Latin name", () => {
  const { svg } = renderCertificate(defaultLayout(), baseData);
  assert.match(svg, /Alex Rivera/);
  assert.match(svg, /Sample Summit/);
});

test("SVG contains long name", () => {
  const long = {
    ...baseData,
    recipient_name: "Alexandria Maximillian von Habsburg-Lorraine III",
  };
  const { svg } = renderCertificate(defaultLayout(), long);
  assert.match(svg, /Alexandria Maximillian von Habsburg-Lorraine III/);
});

test("SVG contains non-Latin name", () => {
  const nonLatin = {
    ...baseData,
    recipient_name: "محمد علی خان",
  };
  const { svg } = renderCertificate(defaultLayout(), nonLatin);
  assert.match(svg, /محمد علی خان/);
});

test("PDF bytes length > 0", async () => {
  const bytes = await renderCertificatePdf(defaultLayout(), baseData);
  assert.ok(bytes.byteLength > 0);
  // PDF magic
  assert.equal(String.fromCharCode(bytes[0]!, bytes[1]!, bytes[2]!, bytes[3]!), "%PDF");
});
