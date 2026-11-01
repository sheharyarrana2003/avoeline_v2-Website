/**
 * Supabase Auth Admin helpers (server-only).
 * Prefer this over raw supabaseAdmin.auth.admin when callers expect stable `code` aliases.
 */
import { supabaseAdmin } from "./supabase";

export const adminAuth = {
  async createUser(input: {
    email: string;
    password: string;
    displayName?: string;
    userType?: string;
  }) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: {
        full_name: input.displayName,
        ...(input.userType ? { user_type: input.userType } : {}),
      },
    });
    if (error || !data.user) {
      const err = new Error(error?.message || "createUser failed") as Error & { code?: string };
      err.code = /already|exists/i.test(error?.message || "")
        ? "auth/email-already-exists"
        : "auth/invalid-password";
      throw err;
    }
    return { uid: data.user.id };
  },
  async updateUser(id: string, patch: { password?: string; email?: string; disabled?: boolean }) {
    const body: {
      password?: string;
      email?: string;
      ban_duration?: string;
    } = {};
    if (patch.password) body.password = patch.password;
    if (patch.email) body.email = patch.email;
    if (patch.disabled === true) body.ban_duration = "876000h";
    if (patch.disabled === false) body.ban_duration = "none";
    const { error } = await supabaseAdmin.auth.admin.updateUserById(id, body);
    if (error) throw error;
  },
  async revokeRefreshTokens(id: string) {
    await supabaseAdmin.auth.admin.signOut(id, "global");
  },
  async deleteUser(id: string) {
    await supabaseAdmin.auth.admin.signOut(id, "global").catch(() => {});
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (error && !/not found|does not exist/i.test(error.message)) throw error;
  },
};
