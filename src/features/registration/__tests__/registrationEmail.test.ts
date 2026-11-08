import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildRegistrationEmail } from "../registrationEmail.logic";
import type { Registration } from "@/src/services/models/reg.type";
import type { EventModel } from "@/src/services/models/event.model";

function sampleReg(overrides: Partial<Registration> = {}): Registration {
  return {
    registrationId: "reg-1",
    eventId: "evt-1",
    userId: null,
    status: "confirmed",
    pricingTier: "General",
    finalPrice: 0,
    attendee: { name: "Ada", email: "ada@example.com", phone: "" },
    payment: { currency: "PKR", paymentStatus: "completed" },
    qrCode: {
      data: JSON.stringify({
        name: "Ada",
        email: "ada@example.com",
        eventId: "evt-1",
        registrationId: "reg-1",
        timestamp: "2026-01-01T00:00:00.000Z",
      }),
      imageUrl: "",
    },
    communications: [],
    ...overrides,
  } as Registration;
}

function sampleEvent(): EventModel {
  return {
    id: "evt-1",
    title: "Demo Night",
    organizerId: "org-1",
    schedule: { startDate: "2026-06-01", startTime: "18:00" },
    location: { venueName: "Hall", city: "Lahore" },
  } as EventModel;
}

describe("buildRegistrationEmail", () => {
  it("includes QR image when qrImageSrc provided", () => {
    const built = buildRegistrationEmail(sampleReg(), sampleEvent(), "https://example.com/t", {
      qrImageSrc: "data:image/png;base64,abc",
    });
    assert.match(built.html, /data:image\/png;base64,abc/);
    assert.match(built.html, /Entry QR code/);
    assert.match(built.subject, /registered/i);
  });

  it("includes team member ticket links for lead digest", () => {
    const built = buildRegistrationEmail(sampleReg(), sampleEvent(), "https://example.com/t/lead", {
      teamMembers: [
        {
          name: "Ada",
          email: "ada@example.com",
          registrationId: "reg-1",
          ticketUrl: "https://example.com/t/lead",
          isLead: true,
        },
        {
          name: "Bob",
          email: "bob@example.com",
          registrationId: "reg-2",
          ticketUrl: "https://example.com/t/2",
        },
      ],
    });
    assert.match(built.html, /Team/);
    assert.match(built.html, /bob@example\.com/);
    assert.match(built.text, /https:\/\/example\.com\/t\/2/);
  });
});
