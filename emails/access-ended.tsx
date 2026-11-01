import { TransactionalEmail, BodyText } from "./layout";

export type AccessEndedEmailProps = {
  tenantName: string;
  features: string[];
  dashboardUrl: string;
};

export function AccessEndedEmail({ tenantName, features, dashboardUrl }: AccessEndedEmailProps) {
  return (
    <TransactionalEmail preview="Access override ended" heading="Access override ended">
      <BodyText>Hello {tenantName},</BodyText>
      <BodyText>
        The following temporary access changes have expired and your plan defaults apply again:
      </BodyText>
      {features.map((f) => (
        <BodyText key={f}>• {f}</BodyText>
      ))}
      <BodyText>Dashboard: {dashboardUrl}</BodyText>
      <BodyText>Reply to this email for help.</BodyText>
    </TransactionalEmail>
  );
}

export default AccessEndedEmail;
