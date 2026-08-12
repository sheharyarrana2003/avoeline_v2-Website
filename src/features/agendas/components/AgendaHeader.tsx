"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { AgendaDay, Session } from "@/src/services/models/agenda.model";
import { buttonClass } from "@/src/lib/ui";

interface AgendaHeaderProps {
	id: string;
	organizer_id: string;
	days: AgendaDay[];
	sessionsByDay: Record<string, Session[]>;
	activeDate: string;
}


export default function AgendaHeader({ id, organizer_id, days, sessionsByDay, activeDate }: AgendaHeaderProps) {
	const searchParams = useSearchParams();

	return (
		<div className="flex w-full items-end justify-between gap-4 border-b border-line pt-4">

			{/* Left Side: Dynamic Day Tabs */}
			<div className="no-scrollbar flex items-center gap-8 overflow-x-auto">
				{days.map((day, index) => {
					const isActive = activeDate === day.date;
					const sessionCount = sessionsByDay[day.date]?.length || 0;

					// Preserve any other query parameters while updating 'day'
					const params = new URLSearchParams(searchParams.toString());
					params.set('day', day.date);

					return (
						<Link
							key={day.id}
							href={`?${params.toString()}`}
							scroll={false}
							aria-current={isActive ? "page" : undefined}
							className={`flex items-center gap-2 whitespace-nowrap border-b-2 pb-4 transition-colors ${isActive
								? 'border-gray-900 text-ink'
								: 'border-transparent text-ink-soft hover:text-ink'
								}`}
						>
							<span className={`text-sm ${isActive ? 'font-bold' : 'font-medium'}`}>
								Day {index + 1} ({day.label})
							</span>

							{sessionCount > 0 && (
								<span
									className={`rounded-full px-2.5 py-0.5 text-2xs font-bold tabular-nums transition-colors ${isActive
										? 'bg-gray-900 text-white'
										: 'bg-gray-100 text-ink-soft'
										}`}
								>
									{sessionCount} sessions
								</span>
							)}
						</Link>
					);
				})}
			</div>

			{/* Right Side: Action Buttons */}
			<div className="shrink-0 pb-3">
				<Link
					href={`/organizer/${organizer_id}/events/${id}/agenda/create-agenda`}
					className={buttonClass("primary", "sm")}
				>
					<Plus className="h-4 w-4" aria-hidden="true" />
					Add Agenda
				</Link>
			</div>

		</div>
	);
}
