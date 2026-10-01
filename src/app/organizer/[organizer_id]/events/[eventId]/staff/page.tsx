import { notFound } from "next/navigation";
import { Shield, Users } from "lucide-react";
import { assertOwnedEvent } from "@/src/features/events/ownership";
import { AuthService } from "@/src/features/auth/authService";
import { TeamEngineService } from "@/src/features/teams/teamEngine.service";
import { TeamCreator } from "@/src/features/teams/components/TeamCreator";
import { TeamRosterView } from "@/src/features/teams/components/TeamRosterView";
import type { TeamWithMembers } from "@/src/features/teams/teamEngine.types";
import { EVENT_STAFF_POSITIONS } from "@/src/features/teams/teamEngine.types";
import { hasModuleAccess } from "@/src/features/permissions/permissions.service";
import { LockedModulePanel } from "@/src/features/permissions/components/LockedModulePanel";
import { addStaffApplicant, addStaffPosition, setStaffApplicantStatus } from "@/src/features/teams/actions/staffAdvanced.action";
import { FormFeedback } from "@/src/shared_components/ui/FormFeedback";
import { buttonClass } from "@/src/lib/ui";

export default async function EventStaffPage({
    params,
    searchParams,
}: {
    params: Promise<{ organizer_id: string; eventId: string }>;
    searchParams?: Promise<{ e?: string; ok?: string }>;
}) {
    const { organizer_id, eventId } = await params;
    const sp = searchParams ? await searchParams : {};

    const event = await assertOwnedEvent(eventId);
    if (!event) notFound();

    const current = await AuthService.getCurrentUser().catch(() => null);
    const advanced = await hasModuleAccess(event.organizerId, "teams_advanced_roles");

    // Fetch staff teams for this event
    const staffTeams = await TeamEngineService.getTeamsByContext({
        contextType: "event_staff",
        eventId,
    });

    const teamsWithMembers: TeamWithMembers[] = await Promise.all(
        staffTeams.map(async (team) => {
            const members = await TeamEngineService.getTeamMembers(team.id);
            return { ...team, members };
        })
    );
    const advancedDetails = advanced
        ? await Promise.all(
              teamsWithMembers.map(async (team) => ({
                  team,
                  positions: await TeamEngineService.listPositions(team.id),
                  applicants: await TeamEngineService.listApplicants(team.id),
              })),
          )
        : [];

    return (
        <div className="space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="font-display text-2xl font-bold text-ink">
                        Event Staff & Volunteers
                    </h2>
                    <p className="mt-1 text-sm text-ink-soft">
                        Create and manage staff teams for this event. Staff can join rosters using team join codes.
                    </p>
                </div>
            </div>

            {/* Generic TeamCreator for Event Staff */}
            <TeamCreator
                contextType="event_staff"
                parentRef={eventId}
                eventId={eventId}
                title="Add Operational Staff Roster"
                subtitle="e.g. Check-in & Registration, Stage Management, Technical Support, Security"
            />

            {/* Existing Rosters */}
            <div className="space-y-6">
                <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    <h3 className="font-display text-lg font-semibold text-ink">
                        Staff Rosters ({teamsWithMembers.length})
                    </h3>
                </div>

                {teamsWithMembers.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-line bg-paper p-10 text-center">
                        <Users className="mx-auto h-8 w-8 text-ink-faint" />
                        <h4 className="mt-3 font-display text-sm font-semibold text-ink">
                            No staff rosters yet
                        </h4>
                        <p className="mt-1 text-xs text-ink-soft">
                            Use the form above to create your first operational team for this event.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {teamsWithMembers.map((team) => (
                            <TeamRosterView
                                key={team.id}
                                team={team}
                                currentUserId={current?.userId}
                                isOrganizerOrAdmin={true}
                            />
                        ))}
                    </div>
                )}
            </div>
            {advanced ? (
                <div className="space-y-6 rounded-2xl border border-line bg-paper p-6">
                    <FormFeedback error={sp.e} success={sp.ok} />
                    <h3 className="font-display text-lg font-semibold text-ink">Named positions & recruitment</h3>
                    {advancedDetails.map(({ team, positions, applicants }) => (
                            <div key={`adv-${team.id}`} className="space-y-3 border-t border-line pt-4">
                                <p className="text-sm font-medium text-ink">{team.name}</p>
                                <ul className="text-sm text-ink-soft">
                                    {positions.map((p) => (
                                        <li key={p.id}>{p.title}</li>
                                    ))}
                                    {positions.length === 0 ? <li>No named positions yet.</li> : null}
                                </ul>
                                <form action={addStaffPosition} className="flex flex-wrap gap-2">
                                    <input type="hidden" name="eventId" value={eventId} />
                                    <input type="hidden" name="organizerId" value={organizer_id} />
                                    <input type="hidden" name="teamId" value={team.id} />
                                    <select name="title" className="rounded-md border border-line px-3 py-2 text-sm">
                                        {EVENT_STAFF_POSITIONS.map((title) => (
                                            <option key={title}>{title}</option>
                                        ))}
                                    </select>
                                    <button type="submit" className={buttonClass("secondary", "sm")}>
                                        Add position
                                    </button>
                                </form>
                                <form action={addStaffApplicant} className="flex flex-wrap gap-2">
                                    <input type="hidden" name="eventId" value={eventId} />
                                    <input type="hidden" name="organizerId" value={organizer_id} />
                                    <input type="hidden" name="teamId" value={team.id} />
                                    <input name="name" placeholder="Applicant name" className="rounded-md border border-line px-3 py-2 text-sm" required />
                                    <input name="note" placeholder="Note" className="rounded-md border border-line px-3 py-2 text-sm" />
                                    <button type="submit" className={buttonClass("secondary", "sm")}>
                                        Add applicant
                                    </button>
                                </form>
                                <ul className="space-y-2">
                                    {applicants.map((a) => (
                                        <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                                            <span>
                                                {String(a.responses.name || "Applicant")} · {a.status}
                                            </span>
                                            <form action={setStaffApplicantStatus} className="flex gap-2">
                                                <input type="hidden" name="eventId" value={eventId} />
                                                <input type="hidden" name="organizerId" value={organizer_id} />
                                                <input type="hidden" name="applicantId" value={a.id} />
                                                <select name="status" defaultValue={a.status} className="rounded-md border border-line px-2 py-1 text-xs">
                                                    <option value="applied">Applied</option>
                                                    <option value="interview">Interview</option>
                                                    <option value="accepted">Accepted</option>
                                                    <option value="rejected">Rejected</option>
                                                </select>
                                                <button type="submit" className={buttonClass("secondary", "sm")}>
                                                    Update
                                                </button>
                                            </form>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                    ))}
                </div>
            ) : (
                <LockedModulePanel moduleKey="teams_advanced_roles" />
            )}
        </div>
    );
}
