import { CalendarClock, Coffee, Building2, Lightbulb, MapPin, Mic, MessageSquare, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Session, SessionType } from "@/src/services/models/agenda.model";
import { formatTime } from "@/src/lib/datetime";
import { EmptyState } from "@/src/shared_components/ui/EmptyState";

const TYPE_ICON: Record<SessionType, LucideIcon> = {
	TALK: Mic,
	BREAK: Coffee,
	WORKSHOP: Lightbulb,
	PANEL: MessageSquare,
	NETWORKING: Users,
};

/**
 * BREAK reads as an aside, everything else as programme. Fill weight carries that,
 * not hue — same two-channel rule as StatusBadge.
 */
function Badge({ type }: { type: SessionType }) {
	const isDark = type !== "BREAK";
	return (
		<span
			className={`inline-flex items-center rounded-full px-2 py-0.5 text-2xs font-bold uppercase ${
				isDark ? "bg-gray-800 text-white" : "border border-line-loud text-ink-soft"
			}`}
		>
			{type}
		</span>
	);
}

function getInitials(name: string) {
	return name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

function SessionCard({ session, isLast }: { session: Session; isLast: boolean }) {
	const Icon = TYPE_ICON[session.type];

	return (
		<div className="relative flex gap-5">
			{/* Timeline rail: the marker sits on paper so the connecting line reads as
			    passing behind it rather than stopping at it. */}
			<div className="flex w-11 shrink-0 flex-col items-center">
				<span
					aria-hidden="true"
					className="z-[1] flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line-loud bg-paper text-ink-soft"
				>
					<Icon className="h-5 w-5" />
				</span>
				{!isLast && <div className="w-px flex-1 bg-line" />}
			</div>

			<div
				className={`flex-1 rounded-2xl border border-line bg-paper p-5 ${isLast ? "" : "mb-6"}`}
			>
				<div className="flex flex-wrap items-center gap-2.5">
					<span className="text-sm font-medium text-ink-soft tabular-nums">
						{formatTime(session.startTime)} – {formatTime(session.endTime)}
					</span>
					<Badge type={session.type} />
				</div>

				<h3 className="mt-1.5 text-base font-semibold text-ink">{session.title}</h3>

				<div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-2">
					{session.speaker && (
						<div className="flex items-center gap-2">
							<span
								aria-hidden="true"
								className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-2xs font-bold text-ink-soft"
							>
								{getInitials(session.speaker.name)}
							</span>
							<span className="text-sm font-medium text-ink">{session.speaker.name}</span>
						</div>
					)}

					{session.location && (
						<div className="flex items-center gap-1.5 text-sm text-ink-soft">
							{session.speaker ? (
								<MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
							) : (
								<Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
							)}
							<span>{session.location}</span>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

export default function AgendaTimeline({ sessions }: { sessions: Session[] }) {
	if (sessions.length === 0) {
		return (
			<div className="pt-8">
				<EmptyState
					icon={<CalendarClock className="h-6 w-6" />}
					title="No sessions on this day"
					description="Use Add Agenda to schedule the first talk, break or panel for this date."
				/>
			</div>
		);
	}

	return (
		<div className="pt-8 pb-4 pl-2">
			{sessions.map((session, index) => (
				<SessionCard
					key={session.id}
					session={session}
					isLast={index === sessions.length - 1}
				/>
			))}
		</div>
	);
}
