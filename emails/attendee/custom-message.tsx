import React from "react";
import { Section, Text } from "@react-email/components";
import { AttendeeBodyText, AttendeeEmailLayout } from "./AttendeeEmailLayout";
import type { CustomMessageProps } from "@/src/features/email/attendeeEmail.model";

export function CustomMessageEmail(props: CustomMessageProps) {
  const blocks = props.includeBlocks || {};
  return (
    <AttendeeEmailLayout
      preview={props.preview}
      organizerName={props.organizerName}
      bannerUrl={props.bannerUrl}
      title={props.title}
      statusLabel={props.statusLabel}
      details={props.details}
      primaryCta={props.primaryCta}
      googleCalendarUrl={props.googleCalendarUrl}
      icsUrl={props.icsUrl}
      replyTo={props.replyTo}
    >
      <AttendeeBodyText>Hi {props.attendeeName},</AttendeeBodyText>
      {props.bodyParagraphs.map((p, i) => (
        <AttendeeBodyText key={`${i}-${p.slice(0, 24)}`}>{p}</AttendeeBodyText>
      ))}
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
      {blocks.teamMembers && props.members?.length ? (
        <Section data-avl-block="team_members" style={{ margin: "8px 0" }}>
          {props.members.map((m) => (
            <Text key={`${m.name}-${m.email}`} style={{ margin: "0 0 4px", fontSize: "13px" }}>
              {m.name}
              {m.isLead ? " (lead)" : ""}
              {m.email ? ` · ${m.email}` : ""}
            </Text>
          ))}
        </Section>
      ) : null}
      {blocks.eventDetails ? (
        <Text data-avl-block="event_details" style={{ margin: "8px 0 0", fontSize: "12px" }}>
          Event details included above.
        </Text>
      ) : null}
    </AttendeeEmailLayout>
  );
}

export default CustomMessageEmail;
