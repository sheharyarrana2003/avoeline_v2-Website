export const mockAttendee = [
{
    attendeeId: "ATT-001",
    userId: "U001",
    academic: {
      university: "MIT",
      studentId: "MIT-9921",
      department: "Computer Science",
      graduationYear: 2027,
      cgpa: 4.8,
      isStudentVerified: true,
      verificationMethod: "EduID_OAuth",
      verifiedAt: "2026-01-15T09:30:00Z"
    },
    interests: ["Quantum Computing", "Distributed Systems"],
    skills: [
      { name: "TypeScript", level: "advanced", endorsements: 24 },
      { name: "Rust", level: "intermediate", endorsements: 12 }
    ],
    socialLinks: {
      linkedin: "https://linkedin.com/in/user001",
      github: "https://github.com/user001",
      portfolio: "https://user001.dev",
      twitter: null
    },
    stats: {
      totalEventsAttended: 5,
      totalCertificatesEarned: 3,
      totalReviewsWritten: 2,
      averageRatingGiven: 4.5,
      networkingConnections: 14,
      eventsRegistered: 6,
      eventsAttended: 5,
      attendanceRate: 83.3,
      totalHoursSpent: 22.5
    },
    certificates: [
      {
        certificateId: "CERT-001-A",
        eventId: "EVT001",
        issuedAt: "2026-05-10T16:00:00Z",
        type: "blockchain",
        verificationUrl: "https://polygonscan.com/tx/0xabc123"
      }
    ],
    connections: [
      {
        connectionId: "CONN-101",
        connectedUserId: "U100", // Speaker at EVT001
        connectedAt: "2026-05-10T14:00:00Z",
        connectionType: "speaker",
        notes: "Discussed the EVT001 keynote presentation."
      }
    ],
    createdAt: "2026-01-15T09:00:00Z",
    updatedAt: "2026-05-11T10:00:00Z"
  },
  {
    attendeeId: "ATT-002",
    userId: "U002",
    academic: {
      university: "Stanford University",
      studentId: "STAN-4412",
      department: "Data Science",
      graduationYear: 2026,
      cgpa: 3.9,
      isStudentVerified: true,
      verificationMethod: "Manual_Review",
      verifiedAt: "2026-02-10T14:15:00Z"
    },
    interests: ["Machine Learning", "AI Ethics"],
    skills: [
      { name: "Python", level: "advanced", endorsements: 41 },
      { name: "PyTorch", level: "intermediate", endorsements: 15 }
    ],
    socialLinks: {
      linkedin: "https://linkedin.com/in/user002",
      github: "https://github.com/user002",
      portfolio: null,
      twitter: null
    },
    stats: {
      totalEventsAttended: 2,
      totalCertificatesEarned: 1,
      totalReviewsWritten: 1,
      averageRatingGiven: 5.0,
      networkingConnections: 4,
      eventsRegistered: 2,
      eventsAttended: 2,
      attendanceRate: 100.0,
      totalHoursSpent: 8.0
    },
    certificates: [
      {
        certificateId: "CERT-002-A",
        eventId: "EVT001",
        issuedAt: "2026-05-10T16:00:00Z",
        type: "digital",
        verificationUrl: "https://verify.event.com/cert-002"
      }
    ],
    connections: [],
    createdAt: "2026-02-10T14:00:00Z",
    updatedAt: "2026-05-10T17:00:00Z"
  },
  {
    attendeeId: "ATT-003",
    userId: "U003",
    academic: {
      university: "UC Berkeley",
      studentId: "BERK-8812",
      department: "Bioengineering",
      graduationYear: 2028,
      cgpa: 3.75,
      isStudentVerified: true,
      verificationMethod: "EduID_OAuth",
      verifiedAt: "2026-03-01T11:22:00Z"
    },
    interests: ["Bioinformatics", "Computational Biology"],
    skills: [
      { name: "R", level: "intermediate", endorsements: 9 },
      { name: "Python", level: "intermediate", endorsements: 14 }
    ],
    socialLinks: {
      linkedin: "https://linkedin.com/in/user003",
      github: null,
      portfolio: null,
      twitter: "https://x.com/user003"
    },
    stats: {
      totalEventsAttended: 1,
      totalCertificatesEarned: 1,
      totalReviewsWritten: 0,
      averageRatingGiven: 0,
      networkingConnections: 2,
      eventsRegistered: 1,
      eventsAttended: 1,
      attendanceRate: 100.0,
      totalHoursSpent: 6.0
    },
    certificates: [
      {
        certificateId: "CERT-003-A",
        eventId: "EVT001",
        issuedAt: "2026-05-10T16:00:00Z",
        type: "digital",
        verificationUrl: "https://verify.event.com/cert-003"
      }
    ],
    connections: [
      {
        connectionId: "CONN-102",
        connectedUserId: "U001",
        connectedAt: "2026-05-10T11:15:00Z",
        connectionType: "attendee",
        notes: "Met during the EVT001 networking lunch."
      }
    ],
    createdAt: "2026-03-01T11:00:00Z",
    updatedAt: "2026-05-10T16:30:00Z"
  },
  {
    attendeeId: "ATT-004",
    userId: "U004",
    academic: {
      university: "Carnegie Mellon",
      studentId: "CMU-0091",
      department: "Robotics",
      graduationYear: 2026,
      cgpa: 3.95,
      isStudentVerified: true,
      verificationMethod: "Manual_Review",
      verifiedAt: "2026-04-12T16:45:00Z"
    },
    interests: ["Computer Vision", "ROS", "Autonomous Vehicles"],
    skills: [
      { name: "C++", level: "advanced", endorsements: 33 },
      { name: "Python", level: "advanced", endorsements: 28 }
    ],
    socialLinks: {
      linkedin: "https://linkedin.com/in/user004",
      github: "https://github.com/user004",
      portfolio: "https://user004.ai",
      twitter: null
    },
    stats: {
      totalEventsAttended: 4,
      totalCertificatesEarned: 4,
      totalReviewsWritten: 3,
      averageRatingGiven: 4.8,
      networkingConnections: 21,
      eventsRegistered: 4,
      eventsAttended: 4,
      attendanceRate: 100.0,
      totalHoursSpent: 32.0
    },
    certificates: [
      {
        certificateId: "CERT-004-A",
        eventId: "EVT001",
        issuedAt: "2026-05-10T16:00:00Z",
        type: "blockchain",
        verificationUrl: "https://polygonscan.com/tx/0xdef456"
      }
    ],
    connections: [],
    createdAt: "2026-04-12T16:00:00Z",
    updatedAt: "2026-05-10T16:00:00Z"
  },
  {
    attendeeId: "ATT-005",
    userId: "U005",
    academic: {
      university: "Georgia Tech",
      studentId: "GT-7721",
      department: "Information Security",
      graduationYear: 2027,
      cgpa: 3.62,
      isStudentVerified: true,
      verificationMethod: "EduID_OAuth",
      verifiedAt: "2026-05-01T08:10:00Z"
    },
    interests: ["Cybersecurity", "Penetration Testing", "Cryptography"],
    skills: [
      { name: "Linux", level: "advanced", endorsements: 18 },
      { name: "Go", level: "beginner", endorsements: 2 }
    ],
    socialLinks: {
      linkedin: "https://linkedin.com/in/user005",
      github: "https://github.com/user005",
      portfolio: null,
      twitter: "https://x.com/user005"
    },
    stats: {
      totalEventsAttended: 3,
      totalCertificatesEarned: 2,
      totalReviewsWritten: 1,
      averageRatingGiven: 4.0,
      networkingConnections: 6,
      eventsRegistered: 4,
      eventsAttended: 3,
      attendanceRate: 75.0,
      totalHoursSpent: 15.5
    },
    certificates: [
      {
        certificateId: "CERT-005-A",
        eventId: "EVT001",
        issuedAt: "2026-05-10T16:00:00Z",
        type: "digital",
        verificationUrl: "https://verify.event.com/cert-005"
      }
    ],
    connections: [
      {
        connectionId: "CONN-103",
        connectedUserId: "U200", // Organizer of EVT001
        connectedAt: "2026-05-10T17:30:00Z",
        connectionType: "organizer",
        notes: "Left feedback on the CTF track setup."
      }
    ],
    createdAt: "2026-05-01T08:00:00Z",
    updatedAt: "2026-05-10T17:30:00Z"
  },
  {
    attendeeId: "ATT-006",
    userId: "U006",
    academic: {
      university: "University of Toronto",
      studentId: "UOT-5512",
      department: "Software Engineering",
      graduationYear: 2026,
      cgpa: 3.88,
      isStudentVerified: true,
      verificationMethod: "EduID_OAuth",
      verifiedAt: "2026-02-20T10:40:00Z"
    },
    interests: ["Cloud Native", "DevOps", "Kubernetes"],
    skills: [
      { name: "Docker", level: "advanced", endorsements: 22 },
      { name: "Kubernetes", level: "intermediate", endorsements: 11 }
    ],
    socialLinks: {
      linkedin: "https://linkedin.com/in/user006",
      github: "https://github.com/user006",
      portfolio: "https://user006.cloud",
      twitter: null
    },
    stats: {
      totalEventsAttended: 8,
      totalCertificatesEarned: 7,
      totalReviewsWritten: 6,
      averageRatingGiven: 4.6,
      networkingConnections: 35,
      eventsRegistered: 8,
      eventsAttended: 8,
      attendanceRate: 100.0,
      totalHoursSpent: 54.0
    },
    certificates: [
      {
        certificateId: "CERT-006-A",
        eventId: "EVT001",
        issuedAt: "2026-05-10T16:00:00Z",
        type: "blockchain",
        verificationUrl: "https://polygonscan.com/tx/0xghi789"
      }
    ],
    connections: [],
    createdAt: "2026-02-20T10:00:00Z",
    updatedAt: "2026-05-10T16:00:00Z"
  },
  {
    attendeeId: "ATT-007",
    userId: "U007",
    academic: {
      university: "ETH Zurich",
      studentId: "ETH-1102",
      department: "Mathematics",
      graduationYear: 2027,
      cgpa: undefined, // Testing optional property
      isStudentVerified: false,
      verificationMethod: "None",
      verifiedAt: null
    },
    interests: ["Cryptography", "Pure Math", "Web3"],
    skills: [
      { name: "Solidity", level: "intermediate", endorsements: 14 },
      { name: "Python", level: "intermediate", endorsements: 8 }
    ],
    socialLinks: {
      linkedin: null,
      github: "https://github.com/user007",
      portfolio: null,
      twitter: "https://x.com/user007"
    },
    stats: {
      totalEventsAttended: 1,
      totalCertificatesEarned: 1,
      totalReviewsWritten: 0,
      averageRatingGiven: 0,
      networkingConnections: 1,
      eventsRegistered: 2,
      eventsAttended: 1,
      attendanceRate: 50.0,
      totalHoursSpent: 4.0
    },
    certificates: [
      {
        certificateId: "CERT-007-A",
        eventId: "EVT001",
        issuedAt: "2026-05-10T16:00:00Z",
        type: "blockchain",
        verificationUrl: "https://polygonscan.com/tx/0xjkl012"
      }
    ],
    connections: [],
    createdAt: "2026-05-09T13:20:00Z",
    updatedAt: "2026-05-10T16:00:00Z"
  },
  {
    attendeeId: "ATT-008",
    userId: "U008",
    academic: {
      university: "National University of Singapore",
      studentId: "NUS-3341",
      department: "Computer Engineering",
      graduationYear: 2026,
      cgpa: 4.2,
      isStudentVerified: true,
      verificationMethod: "Manual_Review",
      verifiedAt: "2026-03-15T04:12:00Z"
    },
    interests: ["IoT", "Embedded Systems", "Edge AI"],
    skills: [
      { name: "C", level: "advanced", endorsements: 19 },
      { name: "Python", level: "intermediate", endorsements: 11 }
    ],
    socialLinks: {
      linkedin: "https://linkedin.com/in/user008",
      github: "https://github.com/user008",
      portfolio: null,
      twitter: null
    },
    stats: {
      totalEventsAttended: 3,
      totalCertificatesEarned: 2,
      totalReviewsWritten: 1,
      averageRatingGiven: 4.0,
      networkingConnections: 8,
      eventsRegistered: 3,
      eventsAttended: 3,
      attendanceRate: 100.0,
      totalHoursSpent: 16.0
    },
    certificates: [
      {
        certificateId: "CERT-008-A",
        eventId: "EVT001",
        issuedAt: "2026-05-10T16:00:00Z",
        type: "digital",
        verificationUrl: "https://verify.event.com/cert-008"
      }
    ],
    connections: [],
    createdAt: "2026-03-15T04:00:00Z",
    updatedAt: "2026-05-10T16:00:00Z"
  },
  {
    attendeeId: "ATT-009",
    userId: "U009",
    academic: {
      university: "Imperial College London",
      studentId: "ICL-0042",
      department: "Human-Computer Interaction",
      graduationYear: 2027,
      cgpa: 3.65,
      isStudentVerified: true,
      verificationMethod: "EduID_OAuth",
      verifiedAt: "2026-04-20T09:00:00Z"
    },
    interests: ["UI/UX Design", "Frontend Architecture", "Accessibility"],
    skills: [
      { name: "Figma", level: "advanced", endorsements: 30 },
      { name: "TypeScript", level: "intermediate", endorsements: 15 }
    ],
    socialLinks: {
      linkedin: "https://linkedin.com/in/user009",
      github: "https://github.com/user009",
      portfolio: "https://user009.design",
      twitter: "https://x.com/user009"
    },
    stats: {
      totalEventsAttended: 4,
      totalCertificatesEarned: 3,
      totalReviewsWritten: 4,
      averageRatingGiven: 4.9,
      networkingConnections: 19,
      eventsRegistered: 4,
      eventsAttended: 4,
      attendanceRate: 100.0,
      totalHoursSpent: 20.0
    },
    certificates: [
      {
        certificateId: "CERT-009-A",
        eventId: "EVT001",
        issuedAt: "2026-05-10T16:00:00Z",
        type: "digital",
        verificationUrl: "https://verify.event.com/cert-009"
      }
    ],
    connections: [
      {
        connectionId: "CONN-104",
        connectedUserId: "U004", // Connected to attendee 4 at EVT001
        connectedAt: "2026-05-10T15:20:00Z",
        connectionType: "attendee",
        notes: "Discussed HRI (Human-Robot Interaction) interface trends."
      }
    ],
    createdAt: "2026-04-20T08:30:00Z",
    updatedAt: "2026-05-10T18:00:00Z"
  },
  {
    attendeeId: "ATT-010",
    userId: "U010",
    academic: {
      university: "Tsinghua University",
      studentId: "TSH-8839",
      department: "Automation",
      graduationYear: 2026,
      cgpa: 3.92,
      isStudentVerified: true,
      verificationMethod: "Manual_Review",
      verifiedAt: "2026-01-10T02:30:00Z"
    },
    interests: ["Reinforcement Learning", "Control Systems"],
    skills: [
      { name: "Python", level: "advanced", endorsements: 25 },
      { name: "MATLAB", level: "advanced", endorsements: 18 }
    ],
    socialLinks: {
      linkedin: "https://linkedin.com/in/user010",
      github: "https://github.com/user010",
      portfolio: null,
      twitter: null
    },
    stats: {
      totalEventsAttended: 2,
      totalCertificatesEarned: 2,
      totalReviewsWritten: 1,
      averageRatingGiven: 4.0,
      networkingConnections: 5,
      eventsRegistered: 2,
      eventsAttended: 2,
      attendanceRate: 100.0,
      totalHoursSpent: 14.0
    },
    certificates: [
      {
        certificateId: "CERT-010-A",
        eventId: "EVT001",
        issuedAt: "2026-05-10T16:00:00Z",
        type: "blockchain",
        verificationUrl: "https://polygonscan.com/tx/0xmno345"
      }
    ],
    connections: [],
    createdAt: "2026-01-10T02:00:00Z",
    updatedAt: "2026-05-10T16:00:00Z"
  }
]