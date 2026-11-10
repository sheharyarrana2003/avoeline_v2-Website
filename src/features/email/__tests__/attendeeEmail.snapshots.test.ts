import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { render } from "@react-email/render";
import { createElement } from "react";
import { RegistrationReceivedEmail } from "@/emails/attendee/registration-received";
import { RegistrationConfirmedEmail } from "@/emails/attendee/registration-confirmed";
import { RegistrationRejectedEmail } from "@/emails/attendee/registration-rejected";
import { CustomMessageEmail } from "@/emails/attendee/custom-message";
import { AccessInviteEmail } from "@/emails/attendee/access-invite";
import { CertificateReadyEmail } from "@/emails/attendee/certificate-ready";
import { JudgeInviteEmail } from "@/emails/attendee/judge-invite";
import { countTicketHrefs, qrContentId } from "@/src/features/email/attendeeEmail.model";
import { shouldInlineMemberQrs } from "@/src/features/event_attendee/emailCompose.logic";

const base = {
  preview: "Preview text",
  organizerName: "Demo Org",
  bannerUrl: null as string | null,
  title: "Fixture title",
  statusLabel: "Confirmed",
  details: [
    { label: "Date & time", value: "9 Nov 2026 · 10:00 AM · Asia/Karachi" },
    { label: "Venue", value: "Main Hall", href: "https://maps.example.com" },
    { label: "Ticket type", value: "General" },
    { label: "Short code", value: "AVO-TEST01" },
  ],
  primaryCta: {
    label: "View ticket",
    url: "https://example.com/events/e1/ticket/r1",
  },
  googleCalendarUrl: "https://calendar.google.com/calendar/render?action=TEMPLATE",
  icsUrl: "https://example.com/api/events/e1/calendar.ics",
  replyTo: "org@example.com",
  isFree: true,
};

describe("N6 attendee email templates", () => {
  it("registration received hides payment when free and keeps one ticket link", async () => {
    const html = await render(
      createElement(RegistrationReceivedEmail, {
        ...base,
        statusLabel: "Received",
        attendeeName: "Ada",
        formAnswers: [{ label: "Shirt", value: "M" }],
        paymentStatus: "pending",
        isFree: true,
      }),
    );
    assert.match(html, /What you submitted/);
    assert.doesNotMatch(html, /data-avl-block="payment"/);
    assert.equal(countTicketHrefs(html), 1);
    assert.match(html, /View ticket/);
    assert.match(html, /Sent via Avoeline/);
  });

  it("registration confirmed inlines CID QRs for ≤10 members and marks blocks", async () => {
    const members = Array.from({ length: 3 }, (_, i) => ({
      name: `M${i}`,
      email: `m${i}@x.com`,
      isLead: i === 0,
      shortCode: `AVO-M${i}`,
      qrCid: qrContentId(`reg-${i}`),
    }));
    assert.equal(shouldInlineMemberQrs(members.length), true);
    const html = await render(
      createElement(RegistrationConfirmedEmail, {
        ...base,
        attendeeName: "Lead",
        teamName: "Team Nova",
        competitionName: "Track A",
        members,
        membersOverflow: false,
        leadQrCid: qrContentId("lead"),
        shortCode: "AVO-LEAD",
        includeBlocks: {
          teamName: true,
          teamMembers: true,
          competition: true,
          eventDetails: true,
        },
      }),
    );
    assert.match(html, /data-avl-block="team_name"/);
    assert.match(html, /data-avl-block="team_members"/);
    assert.match(html, /data-avl-block="competition"/);
    assert.match(html, /cid:qr-lead@avoeline/);
    assert.equal(countTicketHrefs(html), 1);
  });

  it("registration confirmed >10 members lists names without extra ticket links", async () => {
    const members = Array.from({ length: 12 }, (_, i) => ({
      name: `M${i}`,
      email: `m${i}@x.com`,
      isLead: i === 0,
      shortCode: `AVO-M${i}`,
      qrCid: null,
    }));
    assert.equal(shouldInlineMemberQrs(members.length), false);
    const html = await render(
      createElement(RegistrationConfirmedEmail, {
        ...base,
        attendeeName: "Lead",
        members,
        membersOverflow: true,
        includeBlocks: { teamMembers: true },
      }),
    );
    assert.match(html, /Team members/);
    assert.doesNotMatch(html, /cid:qr-/);
    assert.equal(countTicketHrefs(html), 1);
  });

  it("rejected / custom / access / certificate / judge render stably", async () => {
    const rejected = await render(
      createElement(RegistrationRejectedEmail, {
        ...base,
        primaryCta: null,
        googleCalendarUrl: null,
        icsUrl: null,
        attendeeName: "Ada",
        reason: "Capacity full",
      }),
    );
    assert.match(rejected, /not approved/i);
    assert.equal(countTicketHrefs(rejected), 0);

    const custom = await render(
      createElement(CustomMessageEmail, {
        ...base,
        attendeeName: "Ada",
        bodyParagraphs: ["Hello from the organizer."],
        includeBlocks: { eventDetails: true },
      }),
    );
    assert.match(custom, /Hello from the organizer/);

    const access = await render(
      createElement(AccessInviteEmail, {
        ...base,
        primaryCta: { label: "Open your personal invitation", url: "https://example.com/invite" },
        eventTitle: "Demo",
        inviteUrl: "https://example.com/invite",
        mode: "invite",
      }),
    );
    assert.match(access, /Open your personal invitation/);

    const cert = await render(
      createElement(CertificateReadyEmail, {
        ...base,
        details: [],
        recipientName: "Ada",
        eventTitle: "Demo",
        role: "Attendee",
        issued: "9 Nov 2026",
        verificationCode: "ABC",
        viewerUrl: "https://example.com/certificate/ABC",
        verifyUrl: "https://example.com/verify/ABC",
      }),
    );
    assert.match(cert, /View certificate/);

    const judge = await render(
      createElement(JudgeInviteEmail, {
        ...base,
        primaryCta: { label: "Open private invite", url: "https://example.com/judge/t" },
        judgeName: "Pat",
        eventTitle: "Demo",
        inviteUrl: "https://example.com/judge/t",
        bodyParagraphs: ["Please judge Track A."],
      }),
    );
    assert.match(judge, /Open private invite/);
  });
});
