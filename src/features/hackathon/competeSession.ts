import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { getRegistrationById } from "@/src/features/registration/registration.service";
import { teamsForRegistration } from "@/src/features/hackathon/hackathon.service";
import type { Registration } from "@/src/services/models/reg.type";

const COOKIE = "avoeline_compete";
const MAX_AGE_SEC = 60 * 60 * 24 * 14;

function secret(): string {
    return process.env.HACKATHON_COMPETE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "avoeline-compete-dev";
}

export type CompeteSession = {
    registrationId: string;
    eventId: string;
    teamId: string;
};

function sign(payload: string): string {
    return createHmac("sha256", secret()).update(payload).digest("hex");
}

function encode(session: CompeteSession): string {
    const payload = Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
    return `${payload}.${sign(payload)}`;
}

function decode(raw: string | undefined): CompeteSession | null {
    if (!raw) return null;
    const dot = raw.lastIndexOf(".");
    if (dot < 1) return null;
    const payload = raw.slice(0, dot);
    const mac = raw.slice(dot + 1);
    const expected = sign(payload);
    try {
        const a = Buffer.from(mac, "hex");
        const b = Buffer.from(expected, "hex");
        if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
        const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as CompeteSession;
        if (!parsed?.registrationId || !parsed?.eventId || !parsed?.teamId) return null;
        return parsed;
    } catch {
        return null;
    }
}

export async function setCompeteCookie(session: CompeteSession): Promise<void> {
    const jar = await cookies();
    jar.set(COOKIE, encode(session), {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: `/events/${session.eventId}`,
        maxAge: MAX_AGE_SEC,
    });
}

export async function clearCompeteCookie(eventId: string): Promise<void> {
    const jar = await cookies();
    jar.set(COOKIE, "", { httpOnly: true, path: `/events/${eventId}`, maxAge: 0 });
}

export async function readCompeteCookie(eventId: string): Promise<CompeteSession | null> {
    const jar = await cookies();
    const session = decode(jar.get(COOKIE)?.value);
    if (!session || session.eventId !== eventId) return null;
    return session;
}

export async function requireCompeteRegistration(eventId: string): Promise<{
    registration: Registration;
    teamId: string;
} | null> {
    const session = await readCompeteCookie(eventId);
    if (!session) return null;
    const registration = await getRegistrationById(session.registrationId);
    if (!registration || registration.eventId !== eventId) return null;
    if (!["confirmed", "checked_in", "attended"].includes(registration.status)) return null;
    const teams = await teamsForRegistration(registration.registrationId);
    const team = teams.find((t) => t.id === session.teamId) ?? teams[0];
    if (!team) return null;
    return { registration, teamId: team.id };
}
