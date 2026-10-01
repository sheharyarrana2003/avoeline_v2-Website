"use server";

import { assertOwnedEvent } from "@/src/features/events/ownership";
import { getTrack, listTeamsOfEvent } from "../hackathon.service";
import { insertHackathonTeam } from "./teams.action";
import { adminDb } from "@/data/admin_db";
import { COLLECTIONS } from "@/data/collections";
import { finishForm } from "@/src/lib/formRedirect";
import { fail, ok } from "@/src/lib/action";
import { RegService } from "@/src/services/registeration.service";
import { hackathonDashPath } from "../kinds";
import { revalidatePath } from "next/cache";

export async function assignLeftoverToTeam(formData: FormData): Promise<void> {
    const eventId = String(formData.get("eventId") ?? "").trim();
    const fallback = String(formData.get("returnTo") ?? `/organizer`);
    const event = await assertOwnedEvent(eventId);
    if (!event) finishForm(formData, fallback, fail("You cannot assign teams on that event."));

    const trackId = String(formData.get("trackId") ?? "").trim();
    const teamId = String(formData.get("teamId") ?? "").trim();
    const newName = String(formData.get("newTeamName") ?? "").trim();
    const ids = formData.getAll("registrationId").map((v) => String(v).trim()).filter(Boolean);
    if (!ids.length) finishForm(formData, fallback, fail("Pick at least one person with no team."));

    const track = await getTrack(trackId);
    if (!track || track.eventId !== event.id) finishForm(formData, fallback, fail("Choose a competition."));

    const regs = await RegService.getRegsOfEvent(event.id);
    const byId = new Map(regs.map((r) => [r.registrationId, r]));
    const people = ids.map((id) => byId.get(id)).filter((r): r is NonNullable<typeof r> => Boolean(r));
    if (people.length !== ids.length) finishForm(formData, fallback, fail("One of those registrations is gone."));

    const teams = await listTeamsOfEvent(event.id);
    const teamed = new Set(teams.flatMap((t) => t.members.map((m) => m.registrationId)));
    if (people.some((p) => teamed.has(p.registrationId))) {
        finishForm(formData, fallback, fail("Someone you picked is already on a team."));
    }

    const members = people.map((p, i) => ({
        registrationId: p.registrationId,
        name: p.attendee?.name || "Participant",
        email: p.attendee?.email || "",
        isOwner: i === 0,
    }));

    if (teamId) {
        const team = teams.find((t) => t.id === teamId);
        if (!team || team.trackId !== track.id) finishForm(formData, fallback, fail("That team is not in this competition."));
        if (team.members.length + members.length > team.maxTeamSize) {
            finishForm(formData, fallback, fail(`That team can only hold ${team.maxTeamSize} people.`));
        }
        const nextMembers = [
            ...team.members,
            ...members.map((m) => ({
                registrationId: m.registrationId,
                name: m.name,
                email: m.email,
                skills: [] as string[],
                isOwner: false,
                joinedAt: new Date().toISOString(),
            })),
        ];
        await adminDb.collection(COLLECTIONS.HACKATHON_TEAMS).doc(team.id).set(
            {
                members: nextMembers,
                memberRegistrationIds: nextMembers.map((m) => m.registrationId),
                lookingForMembers: nextMembers.length < team.maxTeamSize,
                updatedAt: new Date(),
            },
            { merge: true },
        );
        for (const m of members) {
            await adminDb.collection(COLLECTIONS.REGISTRATIONS).doc(m.registrationId).set(
                { hackathonTeamId: team.id, hackathonRole: "participant", hackathonTrackId: track.id },
                { merge: true },
            );
        }
    } else {
        if (!newName) finishForm(formData, fallback, fail("Name the new team."));
        if (members.length > track.maxTeamSize) {
            finishForm(formData, fallback, fail(`This competition caps teams at ${track.maxTeamSize}.`));
        }
        const created = await insertHackathonTeam({
            eventId: event.id,
            organizerId: event.organizerId,
            trackId: track.id,
            name: newName,
            members,
            maxTeamSize: track.maxTeamSize,
            fee: 0,
        });
        if (!created.ok) finishForm(formData, fallback, fail(created.error));
    }

    const attendeesPath = hackathonDashPath(event.organizerId, event.id, "attendees");
    revalidatePath(attendeesPath);
    revalidatePath(`/organizer/${event.organizerId}/events/${event.id}/attendees`);
    finishForm(formData, attendeesPath, ok(), "People assigned to a team.");
}
