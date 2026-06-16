import { Session, AgendaStats } from "@/src/services/models/agenda.model";

export const mockSessions: Session[] = [
	// ---------------------------------------------------------
	// DAY 1: March 12, 2026
	// ---------------------------------------------------------
	{
		id: "sess_001",
		eventId: "evt_001",
		title: "Opening Ceremony & Keynote",
		date: "2026-03-12",
		startTime: "10:00",
		endTime: "11:30",
		type: "TALK",
		location: "Main Auditorium",
		speaker: {
			id: "spk_001",
			name: "Dr. Sarah Khan",
			avatarUrl: "/images/speakers/sarah-khan.jpg",
			role: "Chief AI Scientist",
			company: "TechVerse"
		},
		description: "Kick off the event with an inspiring keynote on the future of artificial intelligence and human-computer interaction."
	},
	{
		id: "sess_002",
		eventId: "evt_001",
		title: "Networking Coffee Hour",
		date: "2026-03-12",
		startTime: "11:30",
		endTime: "12:00",
		type: "NETWORKING",
		location: "Exhibition Hall Lounge",
		description: "Grab a coffee and connect with fellow attendees and speakers in a relaxed setting."
	},
	{
		id: "sess_003",
		eventId: "evt_001",
		title: "Lunch Break",
		date: "2026-03-12",
		startTime: "12:00",
		endTime: "13:00",
		type: "BREAK",
		location: "Cafeteria Hall",
		description: "Enjoy a complimentary buffet lunch and network with fellow attendees."
	},
	{
		id: "sess_004",
		eventId: "evt_001",
		title: "AI Workshop: Practical Neural Networks",
		date: "2026-03-12",
		startTime: "13:30",
		endTime: "15:00",
		type: "WORKSHOP",
		location: "Workshop Room B",
		speaker: {
			id: "spk_002",
			name: "Alex Rivera",
			avatarUrl: "/images/speakers/alex-rivera.jpg",
			role: "Senior ML Engineer",
			company: "DataFlow"
		},
		description: "A hands-on session where we will build and train a deep neural network from scratch using PyTorch."
	},
	{
		id: "sess_005",
		eventId: "evt_001",
		title: "Panel: The Ethics of Web3",
		date: "2026-03-12",
		startTime: "15:30",
		endTime: "17:00",
		type: "PANEL",
		location: "Main Auditorium",
		description: "Industry leaders discuss the ethical implications of decentralized networks and data ownership."
	},
	{
		id: "sess_006",
		eventId: "evt_001",
		title: "Cloud Infrastructure at Scale",
		date: "2026-03-12",
		startTime: "17:15",
		endTime: "18:00",
		type: "TALK",
		location: "Conference Room C",
		speaker: {
			id: "spk_005",
			name: "Priya Patel",
			avatarUrl: "/images/speakers/priya-patel.jpg",
			role: "VP of Engineering",
			company: "CloudScale"
		},
		description: "Learn how top companies manage distributed cloud infrastructure serving billions of requests daily."
	},
	{
		id: "sess_007",
		eventId: "evt_001",
		title: "Evening Mixer & Welcome Reception",
		date: "2026-03-12",
		startTime: "18:30",
		endTime: "20:00",
		type: "NETWORKING",
		location: "Rooftop Terrace",
		description: "Wind down day one with cocktails and canapés on the rooftop with panoramic city views."
	},

	// ---------------------------------------------------------
	// DAY 2: March 13, 2026
	// ---------------------------------------------------------
	{
		id: "sess_008",
		eventId: "evt_001",
		title: "Morning Welcome & Day 2 Briefing",
		date: "2026-03-13",
		startTime: "09:00",
		endTime: "09:30",
		type: "TALK",
		location: "Main Auditorium",
		speaker: {
			id: "spk_003",
			name: "Jane Doe",
			avatarUrl: "/images/speakers/jane-doe.jpg",
			role: "Event Organizer"
		}
	},
	{
		id: "sess_009",
		eventId: "evt_001",
		title: "Advanced React Patterns",
		date: "2026-03-13",
		startTime: "10:00",
		endTime: "11:30",
		type: "WORKSHOP",
		location: "Workshop Room A",
		speaker: {
			id: "spk_004",
			name: "John Smith",
			avatarUrl: "/images/speakers/john-smith.jpg",
			role: "Frontend Architect",
			company: "MetaUI"
		},
		description: "Deep dive into compound components, render props, and hooks-based architecture for scalable React apps."
	},
	{
		id: "sess_010",
		eventId: "evt_001",
		title: "Designing for Accessibility",
		date: "2026-03-13",
		startTime: "10:00",
		endTime: "11:30",
		type: "TALK",
		location: "Conference Room D",
		speaker: {
			id: "spk_006",
			name: "Maya Johnson",
			avatarUrl: "/images/speakers/maya-johnson.jpg",
			role: "UX Lead",
			company: "InclusiveDesign Co."
		},
		description: "How to build inclusive digital products that work for everyone, with practical patterns and WCAG strategies."
	},
	{
		id: "sess_011",
		eventId: "evt_001",
		title: "Lunch Break",
		date: "2026-03-13",
		startTime: "12:00",
		endTime: "13:00",
		type: "BREAK",
		location: "Cafeteria Hall",
		description: "Complimentary lunch with themed food stations."
	},
	{
		id: "sess_012",
		eventId: "evt_001",
		title: "Building Real-time Collaboration Tools",
		date: "2026-03-13",
		startTime: "13:30",
		endTime: "14:30",
		type: "TALK",
		location: "Main Auditorium",
		speaker: {
			id: "spk_007",
			name: "Omar Farooq",
			avatarUrl: "/images/speakers/omar-farooq.jpg",
			role: "CTO",
			company: "SyncSpace"
		},
		description: "Explore CRDTs, WebSocket architecture, and operational transforms for building collaborative editing experiences."
	},
	{
		id: "sess_013",
		eventId: "evt_001",
		title: "DevOps Workshop: CI/CD Pipelines",
		date: "2026-03-13",
		startTime: "14:45",
		endTime: "16:15",
		type: "WORKSHOP",
		location: "Workshop Room B",
		speaker: {
			id: "spk_008",
			name: "Lisa Chen",
			avatarUrl: "/images/speakers/lisa-chen.jpg",
			role: "Platform Engineer",
			company: "DeployFast"
		},
		description: "Set up production-grade CI/CD pipelines with GitHub Actions, Docker, and Kubernetes from scratch."
	},
	{
		id: "sess_014",
		eventId: "evt_001",
		title: "Panel: Future of Remote Work",
		date: "2026-03-13",
		startTime: "16:30",
		endTime: "17:30",
		type: "PANEL",
		location: "Main Auditorium",
		description: "Tech leaders share insights on managing distributed teams, async communication, and work-life balance."
	},
	{
		id: "sess_015",
		eventId: "evt_001",
		title: "Networking Happy Hour",
		date: "2026-03-13",
		startTime: "17:45",
		endTime: "19:00",
		type: "NETWORKING",
		location: "Garden Courtyard",
		description: "Casual networking with drinks and live music in the garden."
	},

	// ---------------------------------------------------------
	// DAY 3: March 14, 2026
	// ---------------------------------------------------------
	{
		id: "sess_016",
		eventId: "evt_001",
		title: "Keynote: The Next Decade of Software",
		date: "2026-03-14",
		startTime: "09:00",
		endTime: "10:00",
		type: "TALK",
		location: "Main Auditorium",
		speaker: {
			id: "spk_009",
			name: "Dr. Michael Torres",
			avatarUrl: "/images/speakers/michael-torres.jpg",
			role: "Distinguished Engineer",
			company: "Google DeepMind"
		},
		description: "A visionary talk on how AI, quantum computing, and edge technology will shape the next era of software development."
	},
	{
		id: "sess_017",
		eventId: "evt_001",
		title: "TypeScript Masterclass",
		date: "2026-03-14",
		startTime: "10:30",
		endTime: "12:00",
		type: "WORKSHOP",
		location: "Workshop Room A",
		speaker: {
			id: "spk_010",
			name: "Sophia Nguyen",
			avatarUrl: "/images/speakers/sophia-nguyen.jpg",
			role: "Staff Engineer",
			company: "Vercel"
		},
		description: "Advanced TypeScript patterns including template literal types, conditional types, and type-level programming."
	},
	{
		id: "sess_018",
		eventId: "evt_001",
		title: "Coffee Break",
		date: "2026-03-14",
		startTime: "12:00",
		endTime: "12:30",
		type: "BREAK",
		location: "Exhibition Hall Lounge",
		description: "Quick coffee and pastries before the afternoon sessions."
	},
	{
		id: "sess_019",
		eventId: "evt_001",
		title: "Securing Modern Web Applications",
		date: "2026-03-14",
		startTime: "12:30",
		endTime: "13:30",
		type: "TALK",
		location: "Conference Room C",
		speaker: {
			id: "spk_011",
			name: "David Kim",
			avatarUrl: "/images/speakers/david-kim.jpg",
			role: "Security Architect",
			company: "CyberShield"
		},
		description: "Deep dive into OWASP Top 10, CSP headers, JWT best practices, and zero-trust architecture for web apps."
	},
	{
		id: "sess_020",
		eventId: "evt_001",
		title: "Lunch Break",
		date: "2026-03-14",
		startTime: "13:30",
		endTime: "14:30",
		type: "BREAK",
		location: "Cafeteria Hall",
		description: "Final day lunch with networking corners organized by topic."
	},
	{
		id: "sess_021",
		eventId: "evt_001",
		title: "Panel: Open Source Sustainability",
		date: "2026-03-14",
		startTime: "14:30",
		endTime: "15:30",
		type: "PANEL",
		location: "Main Auditorium",
		description: "How can we build sustainable open-source ecosystems? Maintainers and sponsors discuss funding, burnout, and governance."
	},
	{
		id: "sess_022",
		eventId: "evt_001",
		title: "Workshop: Building Design Systems",
		date: "2026-03-14",
		startTime: "15:45",
		endTime: "17:00",
		type: "WORKSHOP",
		location: "Workshop Room B",
		speaker: {
			id: "spk_012",
			name: "Emma Watson",
			avatarUrl: "/images/speakers/emma-watson.jpg",
			role: "Design Systems Lead",
			company: "Figma"
		},
		description: "Learn to build and maintain a design system with tokens, component libraries, and cross-team governance."
	},
	{
		id: "sess_023",
		eventId: "evt_001",
		title: "Closing Ceremony & Awards",
		date: "2026-03-14",
		startTime: "17:30",
		endTime: "18:30",
		type: "TALK",
		location: "Main Auditorium",
		speaker: {
			id: "spk_003",
			name: "Jane Doe",
			avatarUrl: "/images/speakers/jane-doe.jpg",
			role: "Event Organizer"
		},
		description: "Celebrate the highlights of the conference, announce hackathon winners, and share closing remarks."
	},
	{
		id: "sess_024",
		eventId: "evt_001",
		title: "Farewell Gala Dinner",
		date: "2026-03-14",
		startTime: "19:00",
		endTime: "22:00",
		type: "NETWORKING",
		location: "Grand Ballroom",
		description: "An elegant farewell dinner with live entertainment, awards ceremony, and fond goodbyes."
	},
];
