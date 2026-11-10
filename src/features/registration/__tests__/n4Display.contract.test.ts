import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildRegistrationEmail } from "../registrationEmail.logic";
import type { Registration } from "@/src/services/models/reg.type";
import type { EventModel } from "@/src/services/models/event.model";

describe("N4 display contracts", () => {
  it("email facts use Short code not Registration ID UUID", () => {
    const registration = {
      registrationId: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      shortCode: "AVO-K7Q4M2",
      attendee: { name: "Ada", email: "ada@example.com", phone: "" },
      status: "confirmed",
      pricingTier: "General",
      finalPrice: 0,
      payment: { currency: "PKR" },
      qrCode: { imageUrl: "", data: "" },
    } as unknown as Registration;
    const event = {
      title: "Demo Night",
      schedule: { startDate: "2026-12-01", startTime: "10:00" },
      location: { venueName: "Hall", city: "Lahore" },
    } as unknown as EventModel;
    const mail = buildRegistrationEmail(
      registration,
      event,
      "https://example.com/events/e1/ticket/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
    );
    assert.ok(mail.text.includes("Short code: AVO-K7Q4M2"));
    assert.equal(mail.text.includes("Registration ID:"), false);
    assert.equal(mail.html.includes("Registration ID"), false);
    // Exactly one ticket CTA phrasing in text
    assert.equal((mail.text.match(/Your ticket:/g) || []).length, 1);
  });

  it("ticket page source does not label Registration ID", () => {
    const src = readFileSync(
      join(process.cwd(), "src/app/events/[eventId]/ticket/[registrationId]/page.tsx"),
      "utf8",
    );
    assert.equal(src.includes("Registration ID"), false);
    assert.ok(src.includes("Short code"));
    assert.ok(src.includes("TicketCalendarMenu"));
  });

  it("export columns prefer Short code header", () => {
    const src = readFileSync(join(process.cwd(), "src/features/exports/eventSheets.ts"), "utf8");
    assert.ok(src.includes('header: "Short code"'));
    assert.equal(/header:\s*"Registration ID"/.test(src), false);
  });
});
