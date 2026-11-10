import React from "react";
import { Section, Text } from "@react-email/components";
import { AttendeeBodyText, AttendeeEmailLayout } from "./AttendeeEmailLayout";
import type { RegistrationReceivedProps } from "@/src/features/email/attendeeEmail.model";

export function RegistrationReceivedEmail(props: RegistrationReceivedProps) {
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
      <AttendeeBodyText>Hi {props.attendeeName}, we received your registration.</AttendeeBodyText>
      {props.formAnswers.length ? (
        <Section style={{ margin: "0 0 12px" }}>
          <Text style={{ margin: "0 0 8px", fontSize: "13px", fontWeight: 600 }}>
            What you submitted
          </Text>
          {props.formAnswers.map((a) => (
            <Text key={a.label} style={{ margin: "0 0 4px", fontSize: "13px", color: "#525252" }}>
              {a.label}: {a.value}
            </Text>
          ))}
        </Section>
      ) : null}
      {!props.isFree && props.paymentStatus ? (
        <Text data-avl-block="payment" style={{ margin: 0, fontSize: "13px", color: "#525252" }}>
          Payment: {props.paymentStatus}
        </Text>
      ) : null}
    </AttendeeEmailLayout>
  );
}

export default RegistrationReceivedEmail;
