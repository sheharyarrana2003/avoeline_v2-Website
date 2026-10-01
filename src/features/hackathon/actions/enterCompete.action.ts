"use server";

import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { fail, type ActionResult } from "@/src/lib/action";
import { findRegistrationByAccessCode } from "../accessCodes.service";
import { teamsForRegistration } from "../hackathon.service";
import { clearCompeteCookie, setCompeteCookie } from "../competeSession";

export async function enterCompeteAction(eventId: string, _prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
    try {
        const code = String(formData.get("code") ?? "").trim();
        if (!code) return fail("Enter your access code.");
        const registration = await findRegistrationByAccessCode(eventId, code);
        if (!registration) return fail("That code is not valid, or it has not been released yet.");
        const teams = await teamsForRegistration(registration.registrationId);
        const team = teams[0];
        if (!team) return fail("You are not on a team yet. Ask the organizer to assign you.");
        await setCompeteCookie({
            registrationId: registration.registrationId,
            eventId,
            teamId: team.id,
        });
        redirect(`/events/${eventId}/compete`);
    } catch (err) {
        if (isRedirectError(err)) throw err;
        console.error("[enterCompeteAction]", err);
        return fail("Could not sign you in. Please try again.");
    }
}

export async function leaveCompeteAction(eventId: string): Promise<void> {
    await clearCompeteCookie(eventId);
    redirect(`/events/${eventId}/enter`);
}
