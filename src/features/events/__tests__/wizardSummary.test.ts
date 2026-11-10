import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatRegistrationSummary } from "../components/wizard/wizardUtils";
import type { EventFormData } from "@/src/services/models/event.model";

function base(
  patch: Partial<EventFormData> = {},
): Pick<
  EventFormData,
  | "requiresRegistration"
  | "ticketType"
  | "ticketTiers"
  | "totalSeats"
  | "requiresApproval"
  | "customFields"
  | "PriceOfTicket"
  | "isHackathon"
  | "multiTrack"
  | "wizardTracks"
> {
  return {
    requiresRegistration: true,
    ticketType: "paid",
    ticketTiers: [
      {
        id: "t1",
        name: "General",
        price: 100,
        seatsAvailable: null,
        availableFrom: "",
        availableUntil: "",
        description: "",
        active: true,
        isEarlyBird: false,
      },
    ],
    totalSeats: 0,
    requiresApproval: true,
    customFields: [{ id: "q1", label: "Org", type: "text", required: false }],
    PriceOfTicket: 100,
    isHackathon: false,
    multiTrack: false,
    wizardTracks: [],
    ...patch,
  };
}

describe("formatRegistrationSummary", () => {
  it("formats paid unlimited with approval and one question", () => {
    assert.equal(
      formatRegistrationSummary(base()),
      "Registration: 1 paid tier (Rs 100) · Unlimited seats · Approval required · 1 extra question",
    );
  });

  it("never shows 0 seats for unlimited", () => {
    const text = formatRegistrationSummary(base({ totalSeats: 0 }));
    assert.equal(text.includes("0 seats"), false);
    assert.ok(text.includes("Unlimited seats"));
  });

  it("shows free and limited seats", () => {
    assert.equal(
      formatRegistrationSummary(
        base({
          ticketType: "free",
          ticketTiers: [],
          totalSeats: 50,
          requiresApproval: false,
          customFields: [],
        }),
      ),
      "Registration: Free · 50 seats · 0 extra questions",
    );
  });

  it("reports no registration", () => {
    assert.equal(
      formatRegistrationSummary(base({ requiresRegistration: false })),
      "Registration: No registration",
    );
  });

  it("uses entry fee when paid with no tiers", () => {
    assert.equal(
      formatRegistrationSummary(
        base({
          ticketTiers: [],
          PriceOfTicket: 250,
          requiresApproval: false,
          customFields: [],
        }),
      ),
      "Registration: Entry fee (Rs 250) · Unlimited seats · 0 extra questions",
    );
  });

  it("summarizes single-competition hackathon entry fee", () => {
    assert.equal(
      formatRegistrationSummary(
        base({
          isHackathon: true,
          multiTrack: false,
          ticketTiers: [],
          PriceOfTicket: 0,
          wizardTracks: [
            {
              id: "main",
              name: "Main",
              description: "",
              imageUrl: "",
              fee: 500,
              discountPercent: 0,
              discountNote: "",
              discountExpiresAt: "",
              policies: "",
              instructions: "",
              minTeamSize: 1,
              maxTeamSize: 4,
              kind: "other",
              rulesText: "",
            },
          ],
          requiresApproval: false,
          customFields: [],
        }),
      ),
      "Registration: Entry fee (Rs 500) · Unlimited seats · 0 extra questions",
    );
  });
});
