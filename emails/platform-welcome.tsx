import { TransactionalEmail, BodyText } from "./layout";

export type PlatformWelcomeEmailProps = {
  name: string;
  inviteUrl?: string;
  tenantLabel?: string;
  changeByLabel?: string;
};

/**
 * Account welcome / invite. Temporary passwords are NEVER included in email
 * (shown once in the admin UI result dialog only).
 */
export function PlatformWelcomeEmail({ name, inviteUrl, tenantLabel }: PlatformWelcomeEmailProps) {
  return (
    <TransactionalEmail
      preview="Welcome to Avoeline"
      heading="Welcome to Avoeline"
      actionUrl={inviteUrl}
      actionLabel={inviteUrl ? "Open your account" : undefined}
    >
      <BodyText>Hello {name},</BodyText>
      <BodyText>
        {tenantLabel
          ? `An administrator created your Avoeline account as ${tenantLabel}.`
          : "An administrator created your Avoeline account."}
      </BodyText>
      {inviteUrl ? (
        <BodyText>
          Use the button below to set your own password with a single-use link. Reply to this email
          for help.
        </BodyText>
      ) : (
        <BodyText>
          Sign in from your dashboard. If an administrator shared a temporary password with you out
          of band, change it on first login. Reply to this email for help.
        </BodyText>
      )}
    </TransactionalEmail>
  );
}

export default PlatformWelcomeEmail;
