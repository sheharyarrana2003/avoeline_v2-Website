import { TeamEngineService } from "./teamEngine.service";
import type { TeamDoc } from "./teamEngine.types";

/**
 * Step 4: Role-scoped data access helper.
 * Returns all teams a user belongs to across hackathons, clubs, and event staff.
 */
export async function getUserTeams(userId: string): Promise<TeamDoc[]> {
    return TeamEngineService.getUserTeams(userId);
}

/**
 * Returns a set of team IDs that the user belongs to.
 */
export async function getUserTeamIds(userId: string): Promise<Set<string>> {
    const teams = await getUserTeams(userId);
    return new Set(teams.map((t) => t.id));
}

/**
 * Asserts whether a user has access to a given teamId.
 * Throws an error or returns false if unauthorized.
 */
export async function canUserAccessTeamData(userId: string, teamId: string): Promise<boolean> {
    if (!userId || !teamId) return false;
    const teamIds = await getUserTeamIds(userId);
    return teamIds.has(teamId);
}

/**
 * Enforces role-scoped data access on any list of team-associated items
 * (e.g. tasks, submissions, club committee events).
 * A member ONLY sees data where teamId is in their own team list — never another team's data.
 */
export function filterItemsByTeamScope<T extends { teamId?: string | null }>(
    items: T[],
    allowedTeamIds: Set<string> | string[],
): T[] {
    const idSet = allowedTeamIds instanceof Set ? allowedTeamIds : new Set(allowedTeamIds);
    return items.filter((item) => item.teamId && idSet.has(item.teamId));
}
