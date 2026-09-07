"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { adminDb } from "@/data/admin_db";
import { COLLECTIONS } from "@/data/collections";
import { assertOwnedEvent } from "@/src/features/events/ownership";
import { mapToTeam } from "../hackathon.service";
import type { FeeStatus, HackathonTeam } from "../types";

/**
 * The organizer's side of team management: approving a roster change past the
 * lock date, confirming a track fee, and removing a team or a member.
 *
 * All four return void and carry any message back in `?e=`. The track page is a
 * Server Component, so its forms have no client state to hold an error -- the
 * same pattern module 1's admin page uses.
 *
 * `assertOwnedEvent` runs first in every one, and the team is re-read and
 * checked against that event: a team id in a form proves nothing about who may
 * act on it.
 */

const FEE_STATUSES: FeeStatus[] = ["not_required", "fee_pending", "fee_paid"];

type Loaded =
    | { ok: false; backTo: string; error: string }
    | { ok: true; backTo: string; organizerId: string; eventId: string; team: HackathonTeam };

/**
 * Explicitly discriminated on `ok`: TypeScript normalizes a union of object
 * literals by adding `error?: undefined` to the other member, so narrowing with
 * `"error" in loaded` would leave `error` as `string | undefined`.
 */
async function loadOwnedTeam(eventId: string, teamId: string): Promise<Loaded> {
    const event = await assertOwnedEvent(eventId);
    if (!event) redirect("/");

    const backTo = `/organizer/${event.organizerId}/events/${event.id}/hackathon`;

    const id = String(teamId ?? "").trim();
    if (!id) return { ok: false, backTo, error: "Missing team." };

    const snap = await adminDb.collection(COLLECTIONS.HACKATHON_TEAMS).doc(id).get();
    if (!snap.exists) return { ok: false, backTo, error: "That team no longer exists." };

    const team = mapToTeam(snap.data(), snap.id);
    if (team.eventId !== event.id) return { ok: false, backTo, error: "That team is not on this event." };

    return { ok: true, backTo: `${backTo}/${team.trackId}`, organizerId: event.organizerId, eventId: event.id, team };
}

function done(backTo: string, eventId: string, error?: string): never {
    revalidatePath(backTo);
    revalidatePath(`/events/${eventId}/tracks`);
    redirect(error ? `${backTo}?e=${encodeURIComponent(error)}` : backTo);
}

/**
 * Spec 3.2's "without organizer approval": unlocking one team IS the approval.
 *
 * Nothing is queued and nothing is applied in advance. While a track's lock date
 * has passed, that team's roster simply cannot change until the organizer turns
 * this on, and it can be closed again afterwards.
 */
export async function setTeamUnlocked(eventId: string, formData: FormData): Promise<void> {
    let backTo = "/";
    try {
        const loaded = await loadOwnedTeam(eventId, String(formData.get("teamId") ?? ""));
        backTo = loaded.backTo;
        if (!loaded.ok) done(loaded.backTo, eventId, loaded.error);

        await adminDb
            .collection(COLLECTIONS.HACKATHON_TEAMS)
            .doc(loaded.team.id)
            .set(
                { unlockedByOrganizer: String(formData.get("unlocked") ?? "") === "true", updatedAt: new Date() },
                { merge: true },
            );

        // So the team's own members see it on their team page.
        revalidatePath(`/events/${loaded.eventId}/ticket/[registrationId]/team`, "page");
        done(loaded.backTo, eventId);
    } catch (err) {
        if (isRedirectError(err)) throw err;
        console.error("[setTeamUnlocked]", err);
        redirect(`${backTo}?e=${encodeURIComponent("Could not change that.")}`);
    }
}

/** Confirm, or un-confirm, a track's entry fee for one team. */
export async function setFeeStatus(eventId: string, formData: FormData): Promise<void> {
    let backTo = "/";
    try {
        const loaded = await loadOwnedTeam(eventId, String(formData.get("teamId") ?? ""));
        backTo = loaded.backTo;
        if (!loaded.ok) done(loaded.backTo, eventId, loaded.error);

        const raw = String(formData.get("feeStatus") ?? "");
        if (!FEE_STATUSES.includes(raw as FeeStatus)) done(loaded.backTo, eventId, "That is not a fee status.");

        await adminDb
            .collection(COLLECTIONS.HACKATHON_TEAMS)
            .doc(loaded.team.id)
            .set({ feeStatus: raw, updatedAt: new Date() }, { merge: true });

        revalidatePath(`/events/${loaded.eventId}/ticket/[registrationId]/team`, "page");
        done(loaded.backTo, eventId);
    } catch (err) {
        if (isRedirectError(err)) throw err;
        console.error("[setFeeStatus]", err);
        redirect(`${backTo}?e=${encodeURIComponent("Could not change that.")}`);
    }
}

/**
 * Remove one member -- the organizer's half of a roster change.
 *
 * Removing the last member removes the team, for the same reason a participant
 * leaving last does: an empty team holds a name and a join code nobody can
 * reach or reuse.
 */
export async function removeMember(eventId: string, formData: FormData): Promise<void> {
    let backTo = "/";
    try {
        const loaded = await loadOwnedTeam(eventId, String(formData.get("teamId") ?? ""));
        backTo = loaded.backTo;
        if (!loaded.ok) done(loaded.backTo, eventId, loaded.error);

        const registrationId = String(formData.get("registrationId") ?? "").trim();
        const { team } = loaded;
        if (!team.members.some((m) => m.registrationId === registrationId)) {
            done(loaded.backTo, eventId, "That person is not in this team.");
        }

        const members = team.members.filter((m) => m.registrationId !== registrationId);
        const ref = adminDb.collection(COLLECTIONS.HACKATHON_TEAMS).doc(team.id);

        if (members.length === 0) {
            await ref.delete();
        } else {
            // Somebody has to own it, or the team is left with no owner at all.
            if (!members.some((m) => m.isOwner)) members[0] = { ...members[0], isOwner: true };
            await ref.set(
                { members, memberRegistrationIds: members.map((m) => m.registrationId), updatedAt: new Date() },
                { merge: true },
            );
        }

        revalidatePath(`/events/${loaded.eventId}/ticket/[registrationId]/team`, "page");
        done(loaded.backTo, eventId);
    } catch (err) {
        if (isRedirectError(err)) throw err;
        console.error("[removeMember]", err);
        redirect(`${backTo}?e=${encodeURIComponent("Could not remove that member.")}`);
    }
}

/**
 * Remove a whole team.
 *
 * This exists because `removeTrack` refuses while a track still has teams --
 * without it that refusal would be a dead end.
 */
export async function removeTeam(eventId: string, formData: FormData): Promise<void> {
    let backTo = "/";
    try {
        const loaded = await loadOwnedTeam(eventId, String(formData.get("teamId") ?? ""));
        backTo = loaded.backTo;
        if (!loaded.ok) done(loaded.backTo, eventId, loaded.error);

        await adminDb.collection(COLLECTIONS.HACKATHON_TEAMS).doc(loaded.team.id).delete();
        done(loaded.backTo, eventId);
    } catch (err) {
        if (isRedirectError(err)) throw err;
        console.error("[removeTeam]", err);
        redirect(`${backTo}?e=${encodeURIComponent("Could not remove that team.")}`);
    }
}
