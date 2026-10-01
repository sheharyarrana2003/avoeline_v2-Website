import { AuthService } from "@/src/features/auth/authService";
import { UserService, landingPathFor } from "@/src/services/user.service";
import { redirect } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { completeForcedPasswordChange } from "@/src/features/auth/actions/changePassword.action";
import { SubmitButton } from "@/src/shared_components/SubmitButton";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { buttonClass } from "@/src/lib/ui";

export default async function ChangePasswordPage({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const current = await AuthService.getCurrentUser();
  if (!current) redirect("/auth/signin");
  const user = await UserService.getUserById(current.userId);
  if (!user.mustResetPassword) redirect(landingPathFor(user));
  const { e } = await searchParams;

  return (
    <div className="mx-auto flex min-h-screen max-w-md items-center px-4">
      <Card className="w-full">
        <CardBody className="space-y-4">
          <h1 className="font-display text-2xl">Set a new password</h1>
          <p className="text-sm text-ink-soft">Your administrator created this account. Choose a password only you know before using the dashboard.</p>
          <FormFeedback error={e} />
          <form action={completeForcedPasswordChange} className="space-y-3">
            <Input id="new-password" name="password" type="password" label="New password" required minLength={8} autoComplete="new-password" />
            <Input id="confirm-password" name="confirm" type="password" label="Confirm password" required minLength={8} autoComplete="new-password" />
            <SubmitButton className={buttonClass("primary")}>Save password</SubmitButton>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
