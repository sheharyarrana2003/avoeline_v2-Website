import { TransactionalEmail, BodyText } from "./layout";

export type RegistrationConfirmedEmailProps = {
  body: string;
  eventTitle?: string;
  actionUrl?: string;
};

export function RegistrationConfirmedEmail({
  body,
  eventTitle,
  actionUrl,
}: RegistrationConfirmedEmailProps) {
  const heading = eventTitle ? `You're registered — ${eventTitle}` : "Registration confirmed";
  return (
    <TransactionalEmail
      preview={body}
      heading={heading}
      actionUrl={actionUrl}
      actionLabel={actionUrl ? "View event" : undefined}
    >
      <BodyText>{body}</BodyText>
    </TransactionalEmail>
  );
}

export default RegistrationConfirmedEmail;
