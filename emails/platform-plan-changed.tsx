import { TransactionalEmail, BodyText } from "./layout";

export type PlatformPlanChangedEmailProps = {
  name?: string;
  fromPlan: string;
  toPlan: string;
  reason?: string | null;
};

export function PlatformPlanChangedEmail({
  name,
  fromPlan,
  toPlan,
  reason,
}: PlatformPlanChangedEmailProps) {
  return (
    <TransactionalEmail preview={`Plan updated to ${toPlan}`} heading="Your plan was updated">
      {name ? <BodyText>Hello {name},</BodyText> : null}
      <BodyText>
        Your Avoeline plan changed from <strong>{fromPlan}</strong> to <strong>{toPlan}</strong>.
      </BodyText>
      {reason ? <BodyText>Note from the platform team: {reason}</BodyText> : null}
      <BodyText>If you have questions about billing or modules, reply to this email.</BodyText>
    </TransactionalEmail>
  );
}

export default PlatformPlanChangedEmail;
