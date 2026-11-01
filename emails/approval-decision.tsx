import { TransactionalEmail, BodyText } from "./layout";

export type ApprovalDecisionEmailProps = {
  tenantName: string;
  decision: "approved" | "rejected";
  entityLabel: string;
  reason?: string | null;
  dashboardUrl: string;
};

export function ApprovalDecisionEmail({
  tenantName,
  decision,
  entityLabel,
  reason,
  dashboardUrl,
}: ApprovalDecisionEmailProps) {
  const heading = decision === "approved" ? "You were approved" : "Application update";
  return (
    <TransactionalEmail preview={heading} heading={heading}>
      <BodyText>Hello {tenantName},</BodyText>
      <BodyText>
        Your {entityLabel} was <strong>{decision}</strong>.
      </BodyText>
      {reason ? <BodyText>Reason: {reason}</BodyText> : null}
      <BodyText>Dashboard: {dashboardUrl}</BodyText>
      <BodyText>Reply to this email for help.</BodyText>
    </TransactionalEmail>
  );
}

export default ApprovalDecisionEmail;
