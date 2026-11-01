import { TransactionalEmail, BodyText } from "./layout";

export type WaitlistPromotedEmailProps = {
  body: string;
  eventTitle?: string;
  actionUrl?: string;
};

export function WaitlistPromotedEmail({ body, eventTitle, actionUrl }: WaitlistPromotedEmailProps) {
  return (
    <TransactionalEmail
      preview={body}
      heading={eventTitle ? `You're off the waitlist — ${eventTitle}` : "You're off the waitlist"}
      actionUrl={actionUrl}
      actionLabel={actionUrl ? "View your ticket" : undefined}
    >
      <BodyText>{body}</BodyText>
    </TransactionalEmail>
  );
}

export default WaitlistPromotedEmail;
