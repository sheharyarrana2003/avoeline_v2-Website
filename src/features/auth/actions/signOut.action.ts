"use server";

import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/data/supabase";

export async function signOutAction(): Promise<void> {
    const supabase = await createSupabaseServer();
    await supabase.auth.signOut();
    redirect("/auth/signin");
}
