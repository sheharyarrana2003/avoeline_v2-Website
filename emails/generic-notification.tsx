import { TransactionalEmail, BodyText } from "./layout";

export type GenericNotificationEmailProps = {
  heading: string;
  body: string;
  actionUrl?: string;
};

export function GenericNotificationEmail({
  heading,
  body,
  actionUrl,
}: GenericNotificationEmailProps) {
  const paragraphs = body.split(/\n+/).filter(Boolean);
  return (
    <TransactionalEmail
      preview={body}
      heading={heading}
      actionUrl={actionUrl}
      actionLabel={actionUrl ? "Open in Avoeline" : undefined}
    >
      {paragraphs.map((p) => (
        <BodyText key={p.slice(0, 48)}>{p}</BodyText>
      ))}
    </TransactionalEmail>
  );
}

export default GenericNotificationEmail;
