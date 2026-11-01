import { TransactionalEmail, BodyText } from "./layout";

export type AccessChangeLine = {
  feature: string;
  before: string;
  after: string;
  expiresAt?: string | null;
};

export type AccessUpdatedEmailProps = {
  tenantName: string;
  changes: AccessChangeLine[];
  dashboardUrl: string;
  reason?: string | null;
};

export function AccessUpdatedEmail({
  tenantName,
  changes,
  dashboardUrl,
  reason,
}: AccessUpdatedEmailProps) {
  return (
    <TransactionalEmail preview="Your access was updated" heading="Your access was updated">
      <BodyText>Hello {tenantName},</BodyText>
      <BodyText>An administrator updated your module access:</BodyText>
      {changes.map((c) => (
        <BodyText key={`${c.feature}-${c.after}`}>
          <strong>{c.feature}</strong>: {c.before} → {c.after}
          {c.expiresAt ? ` (until ${c.expiresAt})` : ""}
        </BodyText>
      ))}
      {reason ? <BodyText>Note: {reason}</BodyText> : null}
      <BodyText>Open your dashboard: {dashboardUrl}</BodyText>
      <BodyText>Reply to this email for help.</BodyText>
    </TransactionalEmail>
  );
}

export default AccessUpdatedEmail;
