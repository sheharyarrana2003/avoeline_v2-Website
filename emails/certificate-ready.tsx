import { TransactionalEmail, BodyText } from "./layout";

export type CertificateReadyEmailProps = {
  body: string;
  eventTitle?: string;
  actionUrl?: string;
};

export function CertificateReadyEmail({ body, eventTitle, actionUrl }: CertificateReadyEmailProps) {
  return (
    <TransactionalEmail
      preview={body}
      heading={eventTitle ? `Your certificate — ${eventTitle}` : "Your certificate is ready"}
      actionUrl={actionUrl}
      actionLabel={actionUrl ? "Open certificate" : undefined}
    >
      <BodyText>{body}</BodyText>
    </TransactionalEmail>
  );
}

export default CertificateReadyEmail;
