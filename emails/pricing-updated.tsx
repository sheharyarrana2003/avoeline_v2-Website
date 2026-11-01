import { TransactionalEmail, BodyText } from "./layout";

export type PricingUpdatedEmailProps = {
  tenantName: string;
  summary: string;
  effectiveFrom?: string | null;
  effectiveUntil?: string | null;
  dashboardUrl: string;
};

/** Internal notes must never be passed into this template. */
export function PricingUpdatedEmail({
  tenantName,
  summary,
  effectiveFrom,
  effectiveUntil,
  dashboardUrl,
}: PricingUpdatedEmailProps) {
  return (
    <TransactionalEmail preview="Custom pricing updated" heading="Custom pricing updated">
      <BodyText>Hello {tenantName},</BodyText>
      <BodyText>{summary}</BodyText>
      {effectiveFrom ? <BodyText>Effective from: {effectiveFrom}</BodyText> : null}
      {effectiveUntil ? <BodyText>Effective until: {effectiveUntil}</BodyText> : null}
      <BodyText>Dashboard: {dashboardUrl}</BodyText>
      <BodyText>Reply to this email for help.</BodyText>
    </TransactionalEmail>
  );
}

export default PricingUpdatedEmail;
