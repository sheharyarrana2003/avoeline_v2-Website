import Link from "next/link";
import { TeamCreator } from "./TeamCreator";
import { TeamRosterView } from "./TeamRosterView";
import type { TeamWithMembers } from "../teamEngine.types";
import { LockedModulePanel } from "@/src/features/permissions/components/LockedModulePanel";

export function OrganizerTeamsBoard({
  organizerId,
  currentUserId,
  teams,
  advanced,
}: {
  organizerId: string;
  currentUserId?: string;
  teams: TeamWithMembers[];
  advanced: boolean;
}) {
  return (
    <div className="space-y-8">
      <TeamCreator
        contextType="event_staff"
        parentRef={organizerId}
        organizerId={organizerId}
        title="Create a team"
        subtitle="Name the roster and add people. Assign this team to any event from that event’s Team tab."
        allowJoinCodes={false}
        extraMembers
      />

      {teams.length === 0 ? (
        <p className="text-sm text-ink-soft">
          No teams yet. Create one above — it will be available on every event’s Team tab.
        </p>
      ) : (
        <div className="space-y-6">
          {teams.map((team) => (
            <TeamRosterView
              key={team.id}
              team={team}
              currentUserId={currentUserId}
              isOrganizerOrAdmin
              allowJoinCodes={false}
              allowDirectAdd
              canEditMembers
              canEditTeam={advanced}
              canRemoveMembers={advanced}
              canChangeRoles={advanced}
            />
          ))}
        </div>
      )}

      {advanced ? null : (
        <LockedModulePanel
          moduleKey="teams_advanced_roles"
          title="Paid plan: edit, delete, and change roles"
          description="Basic includes create, read, and add members. Advanced team roles lets you rename or delete a team, remove people, and set leads. Assign those same teams to an event from the Team tab."
          ctaLabel="Plans"
          ctaHref={`/organizer/${organizerId}/dashboard`}
        />
      )}
    </div>
  );
}

export function EventStaffAssignForm({
  eventId,
  organizerId,
  library,
  assigned,
  action,
}: {
  eventId: string;
  organizerId: string;
  library: TeamWithMembers[];
  assigned: { teamId: string; memberIds: string[] }[];
  action: (formData: FormData) => void | Promise<void>;
}) {
  const assignedMap = new Map(assigned.map((a) => [a.teamId, a.memberIds]));
  if (!library.length) {
    return (
      <p className="text-sm text-ink-soft">
        No teams in your library yet.{" "}
        <Link href={`/organizer/${organizerId}/teams`} className="font-medium text-ink underline">
          Create them on Teams
        </Link>
        , then pick which roster and members this event team needs.
      </p>
    );
  }
  return (
    <form action={action} className="space-y-4 rounded-2xl border border-line bg-paper p-5">
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="organizerId" value={organizerId} />
      <p className="text-sm text-ink-soft">
        Tick a library team to assign to this event’s team. Leave every member ticked (or tick none)
        to include the whole roster.{" "}
        <Link href={`/organizer/${organizerId}/teams`} className="font-medium text-ink underline">
          Manage teams
        </Link>
      </p>
      <div className="space-y-4">
        {library.map((team) => {
          const current = assignedMap.get(team.id);
          const teamOn = current !== undefined;
          const subset = current && current.length ? new Set(current) : null;
          return (
            <fieldset key={team.id} className="rounded-xl border border-line p-4">
              <label className="flex items-center gap-2 text-sm font-medium text-ink">
                <input
                  type="checkbox"
                  name="teamIds"
                  value={team.id}
                  defaultChecked={teamOn}
                  className="h-4 w-4 accent-current"
                />
                {team.name}
                <span className="font-normal text-ink-soft">· {team.members.length} people</span>
              </label>
              {team.members.length ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {team.members.map((m) => (
                    <label key={m.id} className="flex items-center gap-2 pl-6 text-sm text-ink">
                      <input
                        type="checkbox"
                        name={`members_${team.id}`}
                        value={m.id}
                        defaultChecked={!subset || subset.has(m.id)}
                        className="h-4 w-4 accent-current"
                      />
                      <span>{m.user?.name || m.displayName || "Member"}</span>
                      {m.user?.email || m.email ? (
                        <span className="text-xs text-ink-soft">{m.user?.email || m.email}</span>
                      ) : null}
                    </label>
                  ))}
                </div>
              ) : (
                <p className="mt-2 pl-6 text-xs text-ink-soft">This team has no members yet.</p>
              )}
            </fieldset>
          );
        })}
      </div>
      <button
        type="submit"
        className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
      >
        Save assignment
      </button>
    </form>
  );
}
