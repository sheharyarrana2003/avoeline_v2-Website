import { TransactionalEmail, BodyText } from "./layout";

export type CategoryRequestDecidedEmailProps = {
  body: string;
  approved?: boolean;
  actionUrl?: string;
};

export function CategoryRequestDecidedEmail({
  body,
  approved,
  actionUrl,
}: CategoryRequestDecidedEmailProps) {
  return (
    <TransactionalEmail
      preview={body}
      heading={approved === false ? "Category request update" : "Category request decided"}
      actionUrl={actionUrl}
      actionLabel={actionUrl ? "View request" : undefined}
    >
      <BodyText>{body}</BodyText>
    </TransactionalEmail>
  );
}

export default CategoryRequestDecidedEmail;
