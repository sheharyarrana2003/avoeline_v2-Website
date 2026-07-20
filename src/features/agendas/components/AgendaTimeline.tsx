"use client";

import { Session, SessionType } from "@/src/services/models/agenda.model";
import { formatTime } from "@/src/lib/datetime";

/* ------------------------------------------------------------------ */
/*  Icon SVGs — outlined style matching the reference                  */
/* ------------------------------------------------------------------ */
function MicrophoneIcon() {
	return (
		<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
			<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
			<path d="M19 10v2a7 7 0 0 1-14 0v-2" />
			<line x1="12" x2="12" y1="19" y2="22" />
		</svg>
	);
}

function CoffeeIcon() {
	return (
		<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
			<path d="M17 8h1a4 4 0 1 1 0 8h-1" />
			<path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
			<line x1="6" x2="6" y1="2" y2="4" />
			<line x1="10" x2="10" y1="2" y2="4" />
			<line x1="14" x2="14" y1="2" y2="4" />
		</svg>
	);
}

function LightbulbIcon() {
	return (
		<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
			<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
			<path d="M9 18h6" />
			<path d="M10 22h4" />
		</svg>
	);
}

function UsersIcon() {
	return (
		<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
			<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
			<circle cx="9" cy="7" r="4" />
			<path d="M22 21v-2a4 4 0 0 0-3-3.87" />
			<path d="M16 3.13a4 4 0 0 1 0 7.75" />
		</svg>
	);
}

function PanelIcon() {
	return (
		<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
			<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
			<line x1="9" x2="15" y1="10" y2="10" />
		</svg>
	);
}

function LocationPin() {
	return (
		<svg width="14" height="14" viewBox="0 0 24 24" fill="#6b7280" stroke="#6b7280" strokeWidth="0.5">
			<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z" />
		</svg>
	);
}

function VenueIcon() {
	return (
		<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
			<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
			<polyline points="9 22 9 12 15 12 15 22" />
		</svg>
	);
}

function DragHandle() {
	return (
		<svg width="14" height="14" viewBox="0 0 24 24" fill="#c4c8d0" stroke="none">
			<circle cx="9" cy="5" r="1.5" />
			<circle cx="15" cy="5" r="1.5" />
			<circle cx="9" cy="11" r="1.5" />
			<circle cx="15" cy="11" r="1.5" />
			<circle cx="9" cy="17" r="1.5" />
			<circle cx="15" cy="17" r="1.5" />
		</svg>
	);
}

/* ------------------------------------------------------------------ */
/*  Icon per session type                                              */
/* ------------------------------------------------------------------ */
const typeIcons: Record<SessionType, React.ReactNode> = {
	TALK: <MicrophoneIcon />,
	BREAK: <CoffeeIcon />,
	WORKSHOP: <LightbulbIcon />,
	PANEL: <PanelIcon />,
	NETWORKING: <UsersIcon />,
};

/* ------------------------------------------------------------------ */
/*  Badge style — dark for most, lighter outline for BREAK             */
/* ------------------------------------------------------------------ */
function Badge({ type }: { type: SessionType }) {
	const isDark = type !== "BREAK";

	return (
		<span
			style={{
				fontSize: "10px",
				fontWeight: 700,
				letterSpacing: "0.06em",
				padding: "2px 8px",
				borderRadius: "999px",
				background: isDark ? "#1f2937" : "transparent",
				color: isDark ? "#ffffff" : "#6b7280",
				border: isDark ? "none" : "1px solid #d1d5db",
				textTransform: "uppercase",
				lineHeight: "16px",
			}}
		>
			{type}
		</span>
	);
}

/* ------------------------------------------------------------------ */
/*  Initials avatar fallback                                           */
/* ------------------------------------------------------------------ */
function getInitials(name: string) {
	return name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

// Muted pastel avatar backgrounds
const avatarColors = [
	"#e8d5f5",
	"#d5e8f5",
	"#f5d5d5",
	"#d5f5e8",
	"#f5e8d5",
	"#d5d5f5",
];

function hashCode(str: string) {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		hash = str.charCodeAt(i) + ((hash << 5) - hash);
	}
	return Math.abs(hash);
}

/* ------------------------------------------------------------------ */
/*  Single Session Card                                                */
/* ------------------------------------------------------------------ */
function SessionCard({ session, isLast }: { session: Session; isLast: boolean }) {
	return (
		<div style={{ display: "flex", gap: "20px", position: "relative" }}>

			{/* Timeline column: icon + vertical line */}
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					flexShrink: 0,
					width: "44px",
				}}
			>
				{/* Outlined circle with icon */}
				<div
					style={{
						width: "40px",
						height: "40px",
						borderRadius: "50%",
						background: "#ffffff",
						border: "1.5px solid #d1d5db",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						flexShrink: 0,
						zIndex: 2,
					}}
				>
					{typeIcons[session.type]}
				</div>

				{/* Vertical line */}
				{!isLast && (
					<div
						style={{
							width: "1.5px",
							flex: 1,
							background: "#e5e7eb",
							marginTop: "0px",
						}}
					/>
				)}
			</div>

			{/* Card */}
			<div
				style={{
					flex: 1,
					background: "#f9fafb",
					border: "1px solid #f0f1f3",
					borderRadius: "14px",
					padding: "18px 22px",
					marginBottom: isLast ? "0" : "24px",
					transition: "box-shadow 0.2s ease",
					cursor: "default",
				}}
				onMouseEnter={(e) => {
					(e.currentTarget as HTMLElement).style.boxShadow =
						"0 2px 12px rgba(0,0,0,0.04)";
				}}
				onMouseLeave={(e) => {
					(e.currentTarget as HTMLElement).style.boxShadow = "none";
				}}
			>
				{/* Top row: drag handle + time + badge */}
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: "10px",
						marginBottom: "6px",
					}}
				>
					<span
						style={{
							cursor: "grab",
							display: "flex",
							alignItems: "center",
						}}
					>
						<DragHandle />
					</span>
					<span
						style={{
							fontSize: "13px",
							fontWeight: 500,
							color: "#8b97a8",
							letterSpacing: "0.01em",
						}}
					>
						{formatTime(session.startTime)} - {formatTime(session.endTime)}
					</span>
					<Badge type={session.type} />
				</div>

				{/* Title */}
				<h3
					style={{
						fontSize: "15px",
						fontWeight: 700,
						color: "#111827",
						margin: "0 0 10px 0",
						lineHeight: 1.35,
					}}
				>
					{session.title}
				</h3>

				{/* Bottom row: speaker + location */}
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: "14px",
						flexWrap: "wrap",
					}}
				>
					{/* Speaker */}
					{session.speaker && (
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: "7px",
							}}
						>
							<div
								style={{
									width: "26px",
									height: "26px",
									borderRadius: "50%",
									background:
										avatarColors[
											hashCode(session.speaker.id) % avatarColors.length
										],
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									fontSize: "10px",
									fontWeight: 700,
									color: "#4b5563",
									flexShrink: 0,
								}}
							>
								{getInitials(session.speaker.name)}
							</div>
							<span
								style={{
									fontSize: "13px",
									fontWeight: 600,
									color: "#1f2937",
								}}
							>
								{session.speaker.name}
							</span>
						</div>
					)}

					{/* Location */}
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: "4px",
						}}
					>
						{session.speaker ? <LocationPin /> : <VenueIcon />}
						<span
							style={{
								fontSize: "13px",
								fontWeight: 500,
								color: "#6b7280",
							}}
						>
							{session.location}
						</span>
					</div>
				</div>
			</div>
		</div>
	);
}

/* ------------------------------------------------------------------ */
/*  Main Timeline Component                                            */
/* ------------------------------------------------------------------ */
export default function AgendaTimeline({ sessions }: { sessions: Session[] }) {
	if (sessions.length === 0) {
		return (
			<div
				style={{
					textAlign: "center",
					padding: "60px 20px",
					color: "#9ca3af",
				}}
			>
				<p style={{ marginTop: "12px", fontSize: "15px", fontWeight: 500 }}>
					No sessions scheduled for this day yet.
				</p>
			</div>
		);
	}

	return (
		<div style={{ padding: "32px 0 16px 8px" }}>
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
