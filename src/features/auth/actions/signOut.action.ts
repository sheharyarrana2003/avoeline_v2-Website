"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * End the session.
 *
 * The product had no sign-out at all. Nothing anywhere deleted `firebaseSession`,
 * so the only ways out were clearing cookies by hand or waiting five days for the
 * maxAge to lapse — on a shared machine, that means the next person is signed in
 * as you.
 *
 * Deleting the cookie is the whole job: `proxy.ts` and `AuthService.getCurrentUser`
 * both read the session from it, so once it is gone every guarded route redirects
 * to sign-in on its own.
 *
 * No ActionResult here, deliberately. This is a `<form action={}>` submit whose
 * success is a redirect, and redirect() works by throwing — a catch that swallowed
 * it would leave the user sitting on a page they believe they have left. Nothing
 * downstream needs a return value.
 */
export async function signOutAction(): Promise<void> {
    const cookieStore = await cookies();
    // Delete AND overwrite: some proxies keep a stale cookie alive through a bare
    // delete, and an expired empty value cannot be mistaken for a session.
    cookieStore.delete("firebaseSession");
    cookieStore.set("firebaseSession", "", {
        path: "/",
        maxAge: 0,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
    });

    redirect("/auth/signin");
}
