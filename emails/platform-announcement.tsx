import { TransactionalEmail, BodyText } from "./layout";

export type PlatformAnnouncementEmailProps = {
  title: string;
  body: string;
  actionUrl?: string;
};

export function PlatformAnnouncementEmail({
  title,
  body,
  actionUrl,
}: PlatformAnnouncementEmailProps) {
  const paragraphs = body.split(/\n+/).filter(Boolean);
  return (
    <TransactionalEmail
      preview={title}
      heading={title}
      actionUrl={actionUrl}
      actionLabel={actionUrl ? "Open in Avoeline" : undefined}
    >
      {paragraphs.map((p) => (
        <BodyText key={p.slice(0, 48)}>{p}</BodyText>
      ))}
    </TransactionalEmail>
  );
}

export default PlatformAnnouncementEmail;
