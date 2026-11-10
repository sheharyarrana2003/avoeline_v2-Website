import React from "react";
import { Img, Section, Text } from "@react-email/components";
import { AttendeeBodyText, AttendeeEmailLayout } from "./AttendeeEmailLayout";
import type { RegistrationConfirmedProps } from "@/src/features/email/attendeeEmail.model";

export function RegistrationConfirmedEmail(props: RegistrationConfirmedProps) {
  const blocks = props.includeBlocks || {};
  return (
    <AttendeeEmailLayout
      preview={props.preview}
      organizerName={props.organizerName}
      bannerUrl={props.bannerUrl}
      title={props.title}
      statusLabel={props.statusLabel || "Confirmed"}
      details={props.details}
      primaryCta={
        props.primaryCta
          ? { ...props.primaryCta, label: props.primaryCta.label || "View ticket" }
          : null
      }
      googleCalendarUrl={props.googleCalendarUrl}
      icsUrl={props.icsUrl}
      replyTo={props.replyTo}
    >
      <AttendeeBodyText>
        Hi {props.attendeeName}, your place is confirmed. Show your QR at the door (or use your
        short code if images are blocked).
      </AttendeeBodyText>

      {blocks.competition && props.competitionName ? (
        <Text data-avl-block="competition" style={{ margin: "0 0 8px", fontSize: "14px" }}>
          Competition: {props.competitionName}
        </Text>
      ) : null}
      {blocks.teamName && props.teamName ? (
        <Text data-avl-block="team_name" style={{ margin: "0 0 8px", fontSize: "14px" }}>
          Team: {props.teamName}
        </Text>
      ) : null}

      {props.leadQrCid ? (
        <Section style={{ margin: "12px 0" }}>
          <Img
            src={`cid:${props.leadQrCid}`}
            alt={`Door QR${props.shortCode ? ` · ${props.shortCode}` : ""}`}
            width={160}
            height={160}
            style={{ display: "block", maxWidth: "160px" }}
          />
          {props.shortCode ? (
            <Text style={{ margin: "8px 0 0", fontFamily: "monospace", fontSize: "13px" }}>
              Short code: {props.shortCode}
            </Text>
          ) : null}
        </Section>
      ) : props.shortCode ? (
        <Text style={{ margin: "8px 0", fontFamily: "monospace", fontSize: "13px" }}>
          Short code: {props.shortCode}
        </Text>
      ) : null}

      {blocks.teamMembers && props.members?.length ? (
        <Section data-avl-block="team_members" style={{ margin: "16px 0 0" }}>
          <Text style={{ margin: "0 0 8px", fontSize: "13px", fontWeight: 600 }}>
            {props.membersOverflow ? "Team members" : "Team tickets"}
          </Text>
          {props.membersOverflow
            ? props.members.map((m) => (
                <Text key={`${m.name}-${m.email}`} style={{ margin: "0 0 4px", fontSize: "13px" }}>
                  {m.name}
                  {m.isLead ? " (lead)" : ""}
                  {m.shortCode ? ` · ${m.shortCode}` : ""}
                </Text>
              ))
            : props.members.map((m) => (
                <Section key={`${m.name}-${m.email}`} style={{ margin: "0 0 12px" }}>
                  <Text style={{ margin: "0 0 4px", fontSize: "13px", fontWeight: 600 }}>
                    {m.name}
                    {m.isLead ? " (lead)" : ""}
                  </Text>
                  {m.qrCid ? (
                    <Img
                      src={`cid:${m.qrCid}`}
                      alt={`QR for ${m.name}${m.shortCode ? ` · ${m.shortCode}` : ""}`}
                      width={120}
                      height={120}
                      style={{ display: "block", maxWidth: "120px" }}
                    />
                  ) : null}
                  {m.shortCode ? (
                    <Text style={{ margin: "4px 0 0", fontFamily: "monospace", fontSize: "12px" }}>
                      {m.shortCode}
                    </Text>
                  ) : null}
                </Section>
              ))}
        </Section>
      ) : null}

      {blocks.eventDetails ? (
        <Text
          data-avl-block="event_details"
          style={{ margin: "12px 0 0", fontSize: "12px", color: "#737373" }}
        >
          Event details included above.
        </Text>
      ) : null}
    </AttendeeEmailLayout>
  );
}

export default RegistrationConfirmedEmail;
