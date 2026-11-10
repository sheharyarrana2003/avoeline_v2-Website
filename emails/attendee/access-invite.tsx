import React from "react";
import { AttendeeBodyText, AttendeeEmailLayout } from "./AttendeeEmailLayout";
import type { AccessInviteProps } from "@/src/features/email/attendeeEmail.model";

export function AccessInviteEmail(props: AccessInviteProps) {
  const ctaLabel = props.mode === "invite" ? "Open your personal invitation" : "Register";
  return (
    <AttendeeEmailLayout
      preview={props.preview}
      organizerName={props.organizerName}
      bannerUrl={props.bannerUrl}
      title={props.title}
      statusLabel={props.statusLabel}
      details={props.details}
      primaryCta={{ label: ctaLabel, url: props.inviteUrl }}
      replyTo={props.replyTo}
    >
      {(props.bodyParagraphs || []).map((p, i) => (
        <AttendeeBodyText key={`${i}-${p.slice(0, 24)}`}>{p}</AttendeeBodyText>
      ))}
      {!props.bodyParagraphs?.length ? (
        <AttendeeBodyText>
          {props.mode === "invite"
            ? `You have been invited to ${props.eventTitle}.`
            : `Your email has been added to the guest list for ${props.eventTitle}.`}
        </AttendeeBodyText>
      ) : null}
    </AttendeeEmailLayout>
  );
}

export default AccessInviteEmail;
