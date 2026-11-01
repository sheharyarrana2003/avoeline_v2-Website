import { TransactionalEmail, BodyText } from "./layout";

export type PlatformSupportUpdateEmailProps = {
  subject: string;
  status: string;
  body?: string;
  actionUrl?: string;
};

export function PlatformSupportUpdateEmail({
  subject,
  status,
  body,
  actionUrl,
}: PlatformSupportUpdateEmailProps) {
  return (
    <TransactionalEmail
      preview={`Support: ${subject}`}
      heading="Support ticket update"
      actionUrl={actionUrl}
      actionLabel={actionUrl ? "View ticket" : undefined}
    >
      <BodyText>
        Ticket <strong>{subject}</strong> is now <strong>{status}</strong>.
      </BodyText>
      {body ? <BodyText>{body}</BodyText> : null}
    </TransactionalEmail>
  );
}

export default PlatformSupportUpdateEmail;
