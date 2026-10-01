"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { adminDb } from "@/data/admin_db";
import { COLLECTIONS } from "@/data/collections";
import { CERTIFICATES_BUCKET } from "@/data/supabase";
import { formatDate, toIsoDate } from "@/src/lib/datetime";
import { type ActionResult, fail, ok } from "@/src/lib/action";
import { assertOwnedEvent } from "@/src/features/events/ownership";
import { uploadMedia } from "@/src/features/media/uploadMedia.action";
import { getEventOrganizations } from "@/src/features/organizations/organizations.service";
import { getTrack, listTeams } from "../hackathon.service";
import { hackathonDashPath, organizerHackathonCachePaths, parseHackathonKind } from "../kinds";

/**
 * Track setup, spec 3.1. Organizer only.
 *
 * `assertOwnedEvent` runs before anything is read or written in every action
 * here: `proxy.ts` proves the caller is *an* organizer, not this event's, and a
 * Server Action is reachable without ever loading the page that renders it.
 *
 * Rules files go to the PRIVATE bucket and only their storage key is stored.
 * A signed URL expires within the hour, so storing one would leave a dead link
 * on the track page -- the same reasoning as payment proofs and certificates.
 */

/** Deliberately generous for a problem statement with diagrams. */
const MAX_RULES_BYTES = 15 * 1024 * 1024;

const RULES_FOLDER = "track-rules";

/** Bounds that keep the join rule sane; a track outside them is a typo. */
const MAX_TEAM_CEILING = 20;

function num(formData: FormData, key: string, fallback: number): number {
    const raw = String(formData.get(key) ?? "").trim();
    if (!raw) return fallback;
    const n = Number(raw);
    return Number.isFinite(n) ? n : fallback;
}

/**
 * Create or update one track. An empty `trackId` means create.
 *
 * Bound-arg-first so `bind(null, eventId)` leaves `(prevState, formData)` for
 * `useActionState`; getting that order wrong fails at runtime, not at compile
 * time.
 */
export async function saveTrack(
    eventId: string,
    prevState: ActionResult | null,
    formData: FormData,
): Promise<ActionResult> {
    try {
        const event = await assertOwnedEvent(eventId);
        if (!event) return fail("You cannot change tracks for that event.");

        const trackId = String(formData.get("trackId") ?? "").trim();
        const name = String(formData.get("name") ?? "").trim();
        if (!name) return fail("Give the track a name.");
        if (name.length > 120) return fail("That track name is too long.");

        const minTeamSize = Math.max(1, Math.round(num(formData, "minTeamSize", 1)));
        const maxTeamSize = Math.max(1, Math.round(num(formData, "maxTeamSize", 4)));
        if (maxTeamSize < minTeamSize) {
            return fail("The maximum team size cannot be smaller than the minimum.");
        }
        if (maxTeamSize > MAX_TEAM_CEILING) {
            return fail(`Keep the maximum team size at ${MAX_TEAM_CEILING} or below.`);
        }

        const fee = Math.max(0, num(formData, "fee", 0));

        // The form supplies ISO yyyy-mm-dd from <DateField>; Firestore holds
        // DD/MM/YYYY for a business date. `formatDate` is the converter and
        // parses a date-only ISO string as LOCAL midnight on purpose, so this
        // does not shift a day.
        const submissionDeadline = formatDate(String(formData.get("submissionDeadline") ?? "").trim());
        const rosterLockDate = formatDate(String(formData.get("rosterLockDate") ?? "").trim());

        const existing = trackId ? await getTrack(trackId) : null;
        if (trackId && (!existing || existing.eventId !== event.id)) {
            return fail("That track does not belong to this event.");
        }

        // Reducing the maximum below a team that has already formed would leave
        // that team permanently over its own limit, which the join rule reads as
        // "full" for ever. Refused with the number, so the organizer can see why.
        if (existing) {
            const teams = await listTeams(existing.id);
            const largest = teams.reduce((n, t) => Math.max(n, t.members.length), 0);
            if (largest > maxTeamSize) {
                return fail(`A team on this track already has ${largest} members, so the maximum cannot go below that.`);
            }
        }

        let rulesPath = existing?.rulesPath ?? "";
        let rulesName = existing?.rulesName ?? "";
        const rules = formData.get("rules");
        if (rules instanceof File && rules.size > 0) {
            if (rules.size > MAX_RULES_BYTES) return fail("That file is too large. Please keep it under 15MB.");
            const upload = new FormData();
            upload.append("file", rules);
            upload.append("folder", RULES_FOLDER);
            upload.append("bucket", CERTIFICATES_BUCKET);
            const uploaded = await uploadMedia(upload);
            if (!uploaded.success) {
                console.error("[saveTrack] rules upload failed", uploaded.error);
                return fail(uploaded.error || "That file could not be uploaded.");
            }
            // The storage key, not the signed URL also returned -- that expires.
            rulesPath = uploaded.path;
            rulesName = rules.name;
        }

        let imageUrl = existing?.imageUrl ?? "";
        const image = formData.get("image");
        if (image instanceof File && image.size > 0) {
            const upload = new FormData();
            upload.append("file", image);
            upload.append("folder", "track-images");
            const uploaded = await uploadMedia(upload);
            if (!uploaded.success) {
                return fail(uploaded.error || "That image could not be uploaded.");
            }
            imageUrl = uploaded.url;
        }

        const now = new Date();
        const ref = trackId
            ? adminDb.collection(COLLECTIONS.HACKATHON_TRACKS).doc(trackId)
            : adminDb.collection(COLLECTIONS.HACKATHON_TRACKS).doc();

        await ref.set(
            {
                id: ref.id,
                eventId: event.id,
                // Taken from the event, never the form: it decides who may edit
                // this track from now on.
                organizerId: event.organizerId,
                name,
                description: String(formData.get("description") ?? "").trim().slice(0, 4000),
                kind: parseHackathonKind(formData.get("kind")),
                rulesText: String(formData.get("rulesText") ?? "").trim().slice(0, 20000),
                rulesPath,
                rulesName,
                fee,
                currency: event.pricing?.currency || "PKR",
                minTeamSize,
                maxTeamSize,
                submissionDeadline: submissionDeadline === "—" ? "" : submissionDeadline,
                rosterLockDate: rosterLockDate === "—" ? "" : rosterLockDate,
                prizePool: String(formData.get("prizePool") ?? "").trim().slice(0, 2000),
                imageUrl,
                discountPercent: Math.max(0, num(formData, "discountPercent", existing?.discountPercent ?? 0)),
                discountNote: String(formData.get("discountNote") ?? "").trim().slice(0, 500),
                discountExpiresAt: toIsoDate(String(formData.get("discountExpiresAt") ?? "").trim()),
                // Reserved for judging; only ever written on create so an edit
                // cannot wipe a rubric that slice will add.
                ...(existing ? {} : { rubric: [], currentRound: 1 }),
                ...(existing ? {} : { createdAt: now }),
                updatedAt: now,
            },
            { merge: true },
        );

        // Spec 3.1's dedicated sponsor. The link lives on the sponsor
        // (`EventOrganization.sponsorTrackId`, which module 5 already writes),
        // so this points the chosen one here and unpoints anybody else -- one
        // sponsor per track, and one place the relationship is stored.
        const sponsorOrgId = String(formData.get("sponsorOrgId") ?? "").trim();
        if (formData.has("sponsorOrgId")) {
            const orgs = await getEventOrganizations(event.id);
            const batch = adminDb.batch();
            let touched = false;
            for (const org of orgs) {
                const pointsHere = org.sponsorTrackId === ref.id;
                const shouldPoint = org.id === sponsorOrgId && org.type === "sponsor";
                if (pointsHere === shouldPoint) continue;
                batch.set(
                    adminDb.collection(COLLECTIONS.EVENT_ORGANIZATIONS).doc(org.id),
                    { sponsorTrackId: shouldPoint ? ref.id : "", updatedAt: now },
                    { merge: true },
                );
                touched = true;
            }
            if (touched) await batch.commit();
        }

        for (const path of organizerHackathonCachePaths(event.organizerId, event.id, ref.id)) {
            revalidatePath(path);
        }
        revalidatePath(`/events/${event.id}/tracks`);
        return ok();
    } catch (err) {
        if (isRedirectError(err)) throw err;
        console.error("[saveTrack]", err);
        return fail("Could not save that track. Please try again.");
    }
}

/**
 * Delete a track.
 *
 * Refused while it still has teams: removing it would orphan every team, its
 * roster and its submission, with nothing in the UI that could reach them
 * again. The organizer removes the teams first, deliberately.
 *
 * Returns void and carries any message back in `?e=`, because the tracks page
 * is a Server Component and its forms have no client state to hold an error.
 * Same approach as module 1's admin page.
 */
export async function removeTrack(eventId: string, formData: FormData): Promise<void> {
    // Set as soon as the event is known, so the catch below can bounce to the
    // right page instead of guessing a URL out of the ids it has.
    let backTo = "/";

    try {
        const event = await assertOwnedEvent(eventId);
        if (!event) redirect("/");
        backTo = hackathonDashPath(event.organizerId, event.id, "competitions");

        const trackId = String(formData.get("trackId") ?? "").trim();
        const track = trackId ? await getTrack(trackId) : null;
        if (!track || track.eventId !== event.id) {
            redirect(`${backTo}?e=${encodeURIComponent("That track does not belong to this event.")}`);
        }

        const teams = await listTeams(track.id);
        if (teams.length) {
            const message = `This track has ${teams.length} team${teams.length === 1 ? "" : "s"}. Remove them first.`;
            redirect(`${backTo}?e=${encodeURIComponent(message)}`);
        }

        await adminDb.collection(COLLECTIONS.HACKATHON_TRACKS).doc(track.id).delete();

        // Leave no sponsor pointing at a track that no longer exists.
        const orgs = await getEventOrganizations(event.id);
        const stale = orgs.filter((o) => o.sponsorTrackId === track.id);
        if (stale.length) {
            const batch = adminDb.batch();
            for (const org of stale) {
                batch.set(
                    adminDb.collection(COLLECTIONS.EVENT_ORGANIZATIONS).doc(org.id),
                    { sponsorTrackId: "", updatedAt: new Date() },
                    { merge: true },
                );
            }
            await batch.commit();
        }

        revalidatePath(backTo);
        revalidatePath(`/events/${event.id}/tracks`);
        redirect(backTo);
    } catch (err) {
        // Every branch above reports itself by redirecting, which throws.
        // Swallowing that would leave the organizer looking at a page that
        // appears to have done nothing.
        if (isRedirectError(err)) throw err;
        console.error("[removeTrack]", err);
        redirect(`${backTo}?e=${encodeURIComponent("Could not remove that track.")}`);
    }
}

/** Stop a competition from the Hackathon tab. Teams stay; new joins should treat it as closed. */
export async function endTrack(eventId: string, formData: FormData): Promise<void> {
    let backTo = "/";
    try {
        const event = await assertOwnedEvent(eventId);
        if (!event) redirect("/");
        backTo = hackathonDashPath(event.organizerId, event.id, "competitions");
        const trackId = String(formData.get("trackId") ?? "").trim();
        const track = trackId ? await getTrack(trackId) : null;
        if (!track || track.eventId !== event.id) {
            redirect(`${backTo}?e=${encodeURIComponent("That competition does not belong to this event.")}`);
        }
        await adminDb.collection(COLLECTIONS.HACKATHON_TRACKS).doc(track.id).set(
            { status: "ended", endedAt: new Date(), updatedAt: new Date() },
            { merge: true },
        );
        revalidatePath(backTo);
        revalidatePath(`${backTo}/${track.id}`);
        redirect(`${backTo}?ok=${encodeURIComponent(`${track.name} has ended.`)}`);
    } catch (err) {
        if (isRedirectError(err)) throw err;
        console.error("[endTrack]", err);
        redirect(`${backTo}?e=${encodeURIComponent("Could not end that competition.")}`);
    }
}
