import { redirect } from "next/navigation";
import { AuthService } from "@/src/features/auth/authService";
import { landingPathFor } from "@/src/services/user.service";

/** LockedModulePanel and other CTAs use `/organizer` — send people to their real home. */
export default async function OrganizerRootPage() {
  const user = await AuthService.getCurrentUser();
  redirect(landingPathFor(user));
}
