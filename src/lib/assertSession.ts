import { AuthService } from "@/src/features/auth/authService";
import { isSupportViewer } from "@/src/features/admin/supportPreview";

/** Current user or null. */
export async function requireSession() {
  return AuthService.getCurrentUser();
}

/** Session must match `userId`, or be a platform admin outside support-preview write paths. */
export async function requireSelfOrAdmin(userId: string): Promise<
  | {
      ok: true;
      userId: string;
      isAdmin: boolean;
    }
  | { ok: false; error: string }
> {
  const user = await AuthService.getCurrentUser();
  if (!user?.userId) return { ok: false, error: "Sign in to continue." };
  const isAdmin = isSupportViewer(user);
  if (user.userId === userId || isAdmin) {
    return { ok: true, userId: user.userId, isAdmin };
  }
  return { ok: false, error: "You cannot change that account." };
}
