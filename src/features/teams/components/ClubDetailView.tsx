import Link from "next/link";
import { Building2, GraduationCap, Users, ArrowLeft } from "lucide-react";
import { TeamCreator } from "./TeamCreator";
import { TeamRosterView } from "./TeamRosterView";
import type { OrgDoc, TeamWithMembers } from "../teamEngine.types";

interface ClubDetailViewProps {
    club: OrgDoc;
    department: OrgDoc | null;
    committees: TeamWithMembers[];
    currentUserId?: string;
    isOwnerOrAdmin?: boolean;
    backHref?: string;
}

export function ClubDetailView({
    club,
    department,
    committees,
    currentUserId,
    isOwnerOrAdmin = false,
    backHref = "/admin/orgs",
}: ClubDetailViewProps) {
    return (
        <div className="space-y-8">
            <div>
                <Link
                    href={backHref}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-soft hover:text-ink"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to Organizations
                </Link>
            </div>

            {/* Club Banner Card */}
            <div className="rounded-2xl border border-line bg-paper p-6 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <Building2 className="h-7 w-7" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="font-display text-2xl font-bold text-ink">{club.name}</h1>
                                <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-2xs font-semibold text-emerald-600 dark:text-emerald-400">
                                    Student Club
                                </span>
                            </div>
                            {department && (
                                <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-soft">
                                    <GraduationCap className="h-3.5 w-3.5 text-indigo-500" />
                                    Faculty / Dept: <span className="font-medium text-ink">{department.name}</span>
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* TeamCreator for Club Committees */}
            <TeamCreator
                contextType="club_committee"
                parentRef={club.id}
                orgId={club.id}
                title="Create Club Committee"
                subtitle="Organize your club into working committees (e.g. Executive Board, Media & PR, Event Operations, Finance)."
            />

            {/* List of committees */}
            <div className="space-y-6">
                <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <h3 className="font-display text-lg font-semibold text-ink">
                        Club Committees ({committees.length})
                    </h3>
                </div>

                {committees.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-line bg-paper p-10 text-center">
                        <Users className="mx-auto h-8 w-8 text-ink-faint" />
                        <h4 className="mt-3 font-display text-sm font-semibold text-ink">
                            No committees created yet
                        </h4>
                        <p className="mt-1 text-xs text-ink-soft">
                            Use the form above to set up the first committee for this club.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {committees.map((committee) => (
                            <TeamRosterView
                                key={committee.id}
                                team={committee}
                                currentUserId={currentUserId}
                                isOrganizerOrAdmin={isOwnerOrAdmin}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
