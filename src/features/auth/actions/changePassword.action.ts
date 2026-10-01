"use server";

import { AuthService } from "@/src/features/auth/authService";
import { createSupabaseServer, supabaseAdmin } from "@/data/supabase";
import { TABLES } from "@/data/collections";
import { fail } from "@/src/lib/action";
import { finishForm } from "@/src/lib/formRedirect";
import { redirect } from "next/navigation";
import { UserService, landingPathFor } from "@/src/services/user.service";

export async function completeForcedPasswordChange(formData: FormData): Promise<void> {
  const back = "/auth/change-password";
  const current = await AuthService.getCurrentUser();
  if (!current?.userId) redirect("/auth/signin");

  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) finishForm(formData, back, fail("Use at least 8 characters."));
  if (password !== confirm) finishForm(formData, back, fail("The two passwords do not match."));

  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) finishForm(formData, back, fail(error.message));

  await supabaseAdmin.from(TABLES.USERS).update({ must_reset_password: false }).eq("id", current.userId);
  redirect(landingPathFor(await UserService.getUserById(current.userId)));
}
