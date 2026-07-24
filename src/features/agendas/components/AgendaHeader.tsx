"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AgendaDay, Session } from "@/src/services/models/agenda.model";

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
		<div className="flex justify-between items-end border-b border-gray-200 w-full pt-4">

			{/* Left Side: Dynamic Day Tabs */}
			<div className="flex items-center gap-8 overflow-x-auto no-scrollbar">
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
							className={`flex items-center gap-2 pb-4 border-b-2 transition-all whitespace-nowrap ${isActive
								? 'border-black text-gray-900'
								: 'border-transparent text-gray-400 hover:text-gray-600'
								}`}
						>
							<span className={`text-sm ${isActive ? 'font-bold' : 'font-semibold'}`}>
								Day {index + 1} ({day.label})
							</span>

							{sessionCount > 0 && (
								<span
									className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full transition-colors ${isActive
										? 'bg-black text-white'
										: 'bg-slate-100 text-slate-400'
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
			<div className="flex items-center gap-3 pb-3 pl-4">


				<Link
					href={`/organizer/${organizer_id}/events/${id}/agenda/create-agenda`}
					className="flex items-center gap-2 px-5 py-2 bg-black text-white text-sm font-medium rounded-full shadow-sm hover:bg-gray-800 transition shrink-0"
				>
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
					</svg>
					Add Agenda
				</Link>
			</div>

		</div>
	);
}
