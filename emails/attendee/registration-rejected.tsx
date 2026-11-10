import React from "react";
import { AttendeeBodyText, AttendeeEmailLayout } from "./AttendeeEmailLayout";
import type { RegistrationRejectedProps } from "@/src/features/email/attendeeEmail.model";

export function RegistrationRejectedEmail(props: RegistrationRejectedProps) {
  return (
    <AttendeeEmailLayout
      preview={props.preview}
      organizerName={props.organizerName}
      bannerUrl={props.bannerUrl}
      title={props.title}
      statusLabel={props.statusLabel || "Not approved"}
      details={props.details}
      primaryCta={null}
      googleCalendarUrl={null}
      icsUrl={null}
      replyTo={props.replyTo}
    >
      <AttendeeBodyText>
        Hi {props.attendeeName}, your registration for this event was not approved by the organizer.
      </AttendeeBodyText>
      {props.reason ? <AttendeeBodyText>Reason: {props.reason}</AttendeeBodyText> : null}
    </AttendeeEmailLayout>
  );
}

export default RegistrationRejectedEmail;
