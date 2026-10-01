import { randomBytes, createHash } from "crypto";
import { adminDb } from "@/data/admin_db";
import { COLLECTIONS, TABLES } from "@/data/collections";
import { supabaseAdmin } from "@/data/supabase";
import { absoluteUrl } from "@/src/lib/appUrl";
import { EventService } from "@/src/services/event.service";
import { mapToRegistration, RegService } from "@/src/services/registeration.service";
import type { Registration, RegistrationStatus } from "@/src/services/models/reg.type";
import { sendAccessCodeEmail } from "@/src/features/registration/registrationEmail";
import { recordCommunication } from "@/src/features/registration/registration.service";
import { mapToTeam } from "./hackathon.service";
import type { HackathonTeam } from "./types";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const HIDDEN_STATUSES = new Set<RegistrationStatus>([
    "awaiting_payment",
    "pending",
    "rejected",
    "cancelled",
    "waitlisted",
]);

function mintPlaintext(): string {
    const bytes = randomBytes(8);
    let code = "AV-";
    for (let i = 0; i < 8; i += 1) code += ALPHABET[bytes[i] % ALPHABET.length];
    return code;
}

export function hashAccessCode(code: string): string {
    return createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
}

function paidEnough(reg: Registration): boolean {
    if (Number(reg.finalPrice ?? 0) <= 0) return true;
    return reg.payment?.paymentStatus === "completed";
}

function admitted(status: RegistrationStatus): boolean {
    return status === "confirmed" || status === "checked_in" || status === "attended";
}

async function loadTeamMates(reg: Registration): Promise<{ team: HackathonTeam | null; cohort: Registration[] }> {
    const teamId = String(reg.hackathonTeamId || "");
    if (!teamId) return { team: null, cohort: [reg] };
    const snap = await adminDb.collection(COLLECTIONS.HACKATHON_TEAMS).doc(teamId).get();
    if (!snap.exists) return { team: null, cohort: [reg] };
    const team = mapToTeam(snap.data(), snap.id);
    const ids = team.memberRegistrationIds.filter(Boolean);
    if (!ids.length) return { team, cohort: [reg] };
    const all = await RegService.getRegsOfEvent(reg.eventId);
    const byId = new Map(all.map((r) => [r.registrationId, r]));
    const cohort = ids.map((id) => byId.get(id)).filter((r): r is Registration => Boolean(r));
    return { team, cohort: cohort.length ? cohort : [reg] };
}

async function writeTeamCode(teamId: string, plaintext: string): Promise<void> {
    await adminDb.collection(COLLECTIONS.HACKATHON_TEAMS).doc(teamId).set(
        {
            accessCodeHash: hashAccessCode(plaintext),
            accessCode: plaintext,
            updatedAt: new Date(),
        },
        { merge: true },
    );
}

/**
 * After payment is confirmed and a registration is admitted, mint one code on the team.
 */
export async function maybeRevealHackathonAccessCodes(registrationId: string): Promise<void> {
    const snap = await adminDb.collection(COLLECTIONS.REGISTRATIONS).doc(registrationId).get();
    if (!snap.exists) return;
    const seed = mapToRegistration(snap.data(), snap.id);
    if (!seed.hackathonTrackId && !seed.hackathonTeamId) return;

    const { team, cohort } = await loadTeamMates(seed);
    const teamPaid = cohort.some(paidEnough);
    const teamAdmitted = cohort.some((r) => admitted(r.status));
    if (!teamPaid || !teamAdmitted) return;

    const event = await EventService.getEventByID(seed.eventId);
    const enterUrl = event ? await absoluteUrl(`/events/${event.id}/enter`) : "";

    for (const member of cohort) {
        if (member.status === "cancelled" || member.status === "rejected" || member.status === "waitlisted") continue;
        if (member.status === "awaiting_payment" || member.status === "pending") {
            await adminDb.collection(COLLECTIONS.REGISTRATIONS).doc(member.registrationId).set(
                {
                    status: "confirmed",
                    statusHistory: [
                        ...(member.statusHistory ?? []),
                        { status: "confirmed", timestamp: new Date() },
                    ],
                    updatedAt: new Date(),
                },
                { merge: true },
            );
            member.status = "confirmed";
        }
    }

    if (!team) return;
    if (team.accessCode) return;

    let plaintext = mintPlaintext();
    for (let attempt = 0; attempt < 8; attempt += 1) {
        const { data: clash } = await supabaseAdmin
            .from(TABLES.HACKATHON_TEAMS)
            .select("id")
            .eq("access_code_hash", hashAccessCode(plaintext))
            .maybeSingle();
        if (!clash) break;
        plaintext = mintPlaintext();
    }
    await writeTeamCode(team.id, plaintext);

    if (event && enterUrl) {
        for (const member of cohort) {
            if (!admitted(member.status)) continue;
            const sent = await sendAccessCodeEmail(member, event, plaintext, enterUrl);
            if (sent) await recordCommunication(member.registrationId, sent);
        }
    }
}

export async function findRegistrationByAccessCode(eventId: string, code: string): Promise<Registration | null> {
    const hash = hashAccessCode(code);
    if (!hash || !code.trim()) return null;
    const { data, error } = await supabaseAdmin
        .from(TABLES.HACKATHON_TEAMS)
        .select("id")
        .eq("event_id", eventId)
        .eq("access_code_hash", hash)
        .maybeSingle();
    if (error || !data?.id) return null;
    const snap = await adminDb.collection(COLLECTIONS.HACKATHON_TEAMS).doc(String(data.id)).get();
    if (!snap.exists) return null;
    const team = mapToTeam(snap.data(), snap.id);
    if (!team.accessCode) return null;

    const all = await RegService.getRegsOfEvent(eventId);
    const byId = new Map(all.map((r) => [r.registrationId, r]));
    const members = team.memberRegistrationIds.map((id) => byId.get(id)).filter((r): r is Registration => Boolean(r));
    const ownerId = team.members.find((m) => m.isOwner)?.registrationId;
    const lead = (ownerId ? byId.get(ownerId) : null) ?? members.find((r) => admitted(r.status) && !HIDDEN_STATUSES.has(r.status)) ?? members[0];
    if (!lead) return null;
    if (!admitted(lead.status)) return null;
    if (HIDDEN_STATUSES.has(lead.status)) return null;
    return lead;
}

export function teamAccessCodeVisible(team: HackathonTeam | null | undefined): string | null {
    return team?.accessCode || null;
}
