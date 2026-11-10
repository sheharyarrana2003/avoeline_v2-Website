import React from "react";
import { AttendeeBodyText, AttendeeEmailLayout } from "./AttendeeEmailLayout";
import type { JudgeInviteProps } from "@/src/features/email/attendeeEmail.model";

export function JudgeInviteEmail(props: JudgeInviteProps) {
  return (
    <AttendeeEmailLayout
      preview={props.preview}
      organizerName={props.organizerName}
      bannerUrl={props.bannerUrl}
      title={props.title}
      statusLabel={props.statusLabel || "Judge invite"}
      details={props.details}
      primaryCta={{ label: "Open private invite", url: props.inviteUrl }}
      replyTo={props.replyTo}
    >
      <AttendeeBodyText>Hi {props.judgeName},</AttendeeBodyText>
      {props.bodyParagraphs.map((p, i) => (
        <AttendeeBodyText key={`${i}-${p.slice(0, 24)}`}>{p}</AttendeeBodyText>
      ))}
    </AttendeeEmailLayout>
  );
}

export default JudgeInviteEmail;
