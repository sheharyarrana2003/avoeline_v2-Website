import { TransactionalEmail, BodyText } from "./layout";

export type EventInviteEmailProps = {
  body: string;
  eventTitle?: string;
  actionUrl?: string;
};

export function EventInviteEmail({ body, eventTitle, actionUrl }: EventInviteEmailProps) {
  return (
    <TransactionalEmail
      preview={body}
      heading={eventTitle ? `You're invited to ${eventTitle}` : "You're invited"}
      actionUrl={actionUrl}
      actionLabel={actionUrl ? "Claim your ticket" : undefined}
    >
      <BodyText>{body}</BodyText>
    </TransactionalEmail>
  );
}

export default EventInviteEmail;
