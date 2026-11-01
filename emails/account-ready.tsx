import { TransactionalEmail, BodyText } from "./layout";

export type AccountReadyEmailProps = {
  tenantName: string;
  dashboardUrl: string;
  inviteUrl?: string | null;
  planName?: string | null;
};

/** Never include a password prop — invite link or dashboard only. */
export function AccountReadyEmail({
  tenantName,
  dashboardUrl,
  inviteUrl,
  planName,
}: AccountReadyEmailProps) {
  return (
    <TransactionalEmail preview="Your Avoeline account is ready" heading="Your account is ready">
      <BodyText>Hello {tenantName},</BodyText>
      <BodyText>
        An administrator created your Avoeline account
        {planName ? (
          <>
            {" "}
            on the <strong>{planName}</strong> plan
          </>
        ) : null}
        .
      </BodyText>
      {inviteUrl ? (
        <BodyText>Set your password using this single-use link: {inviteUrl}</BodyText>
      ) : (
        <BodyText>
          Sign in at {dashboardUrl}. If you were given a temporary password separately, change it on
          first login.
        </BodyText>
      )}
      <BodyText>Reply to this email for help.</BodyText>
    </TransactionalEmail>
  );
}

export default AccountReadyEmail;
