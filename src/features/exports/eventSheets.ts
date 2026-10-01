import type { CsvColumn } from "@/src/lib/csv";
import { formatDate, formatDateTime } from "@/src/lib/datetime";
import { answerText } from "@/src/lib/customFields";
import type { CustomFieldOption } from "@/src/services/models/event.model";
import type { EventOrganization } from "@/src/features/organizations/types";
import type { Registration, RegistrationStatus } from "@/src/services/models/reg.type";

/**
 * The four exports spec 6.2 asks for, as column definitions.
 *
 * Column sets rather than four functions that each build a file: the format
 * (.xlsx or CSV) is `deliverSheet`'s problem and the authorization is the
 * action's, so all that is left here is which columns each export has. That
 * also keeps this file pure and free of `adminDb`, so the shapes can be checked
 * without a database.
 */

export const SHEET_KINDS = ["attendees", "checkin", "financial", "sponsors", "hackathon_teams"] as const;
export type SheetKind = (typeof SHEET_KINDS)[number];

export const SHEET_META: Record<SheetKind, { label: string; basename: string }> = {
    attendees: { label: "Attendee list", basename: "attendees" },
    checkin: { label: "Check-in log", basename: "check-in-log" },
    financial: { label: "Financial summary", basename: "financial-summary" },
    sponsors: { label: "Sponsors and partners", basename: "sponsors-and-partners" },
    hackathon_teams: { label: "Hackathon teams", basename: "hackathon-teams" },
};

export function isSheetKind(value: unknown): value is SheetKind {
    return typeof value === "string" && (SHEET_KINDS as readonly string[]).includes(value);
}

/** A registration joined to whatever name and email we can find for it. */
export type AttendeeRow = { reg: Registration; name: string; email: string };

/**
 * Which registrations represent money.
 *
 * A cancelled or rejected registration owes nothing, and a waitlisted one holds
 * no seat -- it is given a price at creation only so it keeps the tier's terms
 * if a place frees up. Counting any of the three would overstate revenue, which
 * is the one number on this sheet nobody would double-check by hand.
 */
export function countsAsSale(status: RegistrationStatus): boolean {
    return status !== "cancelled" && status !== "rejected" && status !== "waitlisted";
}

/* ------------------------------------------------------------------ attendees */

/**
 * The attendee list, plus one column per question the event asked.
 *
 * The custom columns are appended rather than interleaved so the fixed columns
 * stay at stable positions -- an organizer who has built a filter or a pivot on
 * last month's export should not have it shift because a question was added.
 */
export function attendeeColumns(questions: CustomFieldOption[]): CsvColumn<AttendeeRow>[] {
    return [
        { header: "Name", value: (r) => r.name },
        { header: "Email", value: (r) => r.email },
        { header: "Phone", value: (r) => r.reg.attendee?.phone ?? "" },
        { header: "Status", value: (r) => r.reg.status },
        { header: "Ticket tier", value: (r) => r.reg.pricingTier },
        { header: "Attendee tier", value: (r) => r.reg.tier },
        { header: "Amount due", value: (r) => Number(r.reg.finalPrice ?? 0) },
        { header: "Payment status", value: (r) => r.reg.payment?.paymentStatus ?? "" },
        { header: "Checked in", value: (r) => (r.reg.checkIn?.checkedIn ? "Yes" : "No") },
        {
            header: "Check-in time",
            value: (r) => (r.reg.checkIn?.checkInTime ? formatDateTime(r.reg.checkIn.checkInTime) : ""),
        },
        { header: "Waitlist position", value: (r) => (r.reg.waitlistPosition > 0 ? r.reg.waitlistPosition : "") },
        { header: "Registered", value: (r) => formatDateTime(r.reg.createdAt) },
        { header: "Registration ID", value: (r) => r.reg.registrationId },
        ...questions.map((q) => ({
            header: q.label,
            value: (r: AttendeeRow) => answerText(q, r.reg.customResponses),
        })),
    ];
}

/* -------------------------------------------------------------------- check-in */

const CHECK_IN_METHOD: Record<string, string> = {
    qr_scan: "QR scan",
    manual: "Manual",
    nfc: "NFC",
};

export const checkInColumns: CsvColumn<AttendeeRow>[] = [
    { header: "Checked in at", value: (r) => (r.reg.checkIn?.checkInTime ? formatDateTime(r.reg.checkIn.checkInTime) : "") },
    { header: "Name", value: (r) => r.name },
    { header: "Email", value: (r) => r.email },
    { header: "Ticket tier", value: (r) => r.reg.pricingTier },
    { header: "Attendee tier", value: (r) => r.reg.tier },
    { header: "Method", value: (r) => CHECK_IN_METHOD[String(r.reg.checkIn?.checkInMethod ?? "")] ?? "" },
    { header: "Checked in by", value: (r) => r.reg.checkIn?.checkedInBy ?? "" },
    { header: "Scans", value: (r) => Number(r.reg.qrCode?.scanCount ?? 0) },
    { header: "Registration ID", value: (r) => r.reg.registrationId },
];

/**
 * Only the people who actually arrived, earliest first.
 *
 * Chronological rather than alphabetical because the point of a check-in log is
 * the order of the door, and it is what makes an arrival-rate reading possible.
 * A row with `checkedIn` true but no timestamp sorts to the end rather than to
 * the front, which is what an empty string would otherwise do.
 */
export function checkInRows(rows: AttendeeRow[]): AttendeeRow[] {
    return rows
        .filter((r) => r.reg.checkIn?.checkedIn)
        .sort((a, b) => (a.reg.checkIn?.checkInTime || "￿").localeCompare(b.reg.checkIn?.checkInTime || "￿"));
}

/* ------------------------------------------------------------------ financial */

export type FinancialRow = {
    section: string;
    item: string;
    detail: string;
    quantity: number | "";
    amount: number | "";
    collected: number | "";
    outstanding: number | "";
};

export function financialColumns(currency: string): CsvColumn<FinancialRow>[] {
    return [
        { header: "Section", value: (r) => r.section },
        { header: "Item", value: (r) => r.item },
        { header: "Detail", value: (r) => r.detail },
        { header: "Quantity", value: (r) => r.quantity },
        { header: `Amount (${currency})`, value: (r) => r.amount },
        { header: `Collected (${currency})`, value: (r) => r.collected },
        { header: `Outstanding (${currency})`, value: (r) => r.outstanding },
    ];
}

/**
 * Revenue by ticket tier, then sponsor income, then the totals.
 *
 * One sheet with a Section column rather than three sheets, because the number
 * the spec is really asking for -- what this event brought in -- is the sum
 * across both sources, and a reader should not have to add up two tabs to see
 * it.
 *
 * "Collected" is deliberately narrower than "amount": it counts only payments
 * whose status says the money arrived. A free event therefore reads as fully
 * collected, and an event of unverified bank transfers reads as owed, which is
 * the distinction an organizer chasing payments needs.
 *
 * Sponsor rows carry no collected or outstanding figure at all. Nothing in this
 * app records whether a sponsor has paid their contract, and inventing a zero
 * there would read as "none of it has been paid".
 */
export function financialRows(
    rows: AttendeeRow[],
    sponsors: EventOrganization[],
): FinancialRow[] {
    const sales = rows.filter((r) => countsAsSale(r.reg.status));

    const byTier = new Map<string, { count: number; amount: number; collected: number }>();
    for (const { reg } of sales) {
        const key = reg.pricingTier || "Unspecified";
        const bucket = byTier.get(key) ?? { count: 0, amount: 0, collected: 0 };
        const due = Number(reg.finalPrice ?? 0) || 0;
        bucket.count += 1;
        bucket.amount += due;
        if (reg.payment?.paymentStatus === "completed") bucket.collected += due;
        byTier.set(key, bucket);
    }

    const out: FinancialRow[] = [];
    let ticketAmount = 0;
    let ticketCollected = 0;

    for (const [tier, b] of [...byTier.entries()].sort((a, b) => b[1].amount - a[1].amount)) {
        ticketAmount += b.amount;
        ticketCollected += b.collected;
        out.push({
            section: "Tickets",
            item: tier,
            detail: b.amount === 0 ? "Free" : "Paid",
            quantity: b.count,
            amount: b.amount,
            collected: b.collected,
            outstanding: b.amount - b.collected,
        });
    }

    const paying = sponsors.filter((s) => s.type === "sponsor");
    let sponsorAmount = 0;
    for (const s of [...paying].sort((a, b) => Number(b.contractValue ?? 0) - Number(a.contractValue ?? 0))) {
        const value = Number(s.contractValue ?? 0) || 0;
        sponsorAmount += value;
        out.push({
            section: "Sponsorship",
            item: s.name,
            detail: s.tier || "Untiered",
            quantity: 1,
            amount: value,
            collected: "",
            outstanding: "",
        });
    }

    out.push({
        section: "Total",
        item: "Ticket revenue",
        detail: `${sales.length} registrations counted`,
        quantity: sales.length,
        amount: ticketAmount,
        collected: ticketCollected,
        outstanding: ticketAmount - ticketCollected,
    });
    out.push({
        section: "Total",
        item: "Sponsor income",
        detail: `${paying.length} sponsors`,
        quantity: paying.length,
        amount: sponsorAmount,
        collected: "",
        outstanding: "",
    });
    out.push({
        section: "Total",
        item: "Combined",
        detail: "Tickets and sponsorship",
        quantity: "",
        amount: ticketAmount + sponsorAmount,
        collected: "",
        outstanding: "",
    });

    return out;
}

/* -------------------------------------------------------------------- sponsors */

export const sponsorColumns: CsvColumn<EventOrganization>[] = [
    { header: "Name", value: (o) => o.name },
    { header: "Type", value: (o) => o.type },
    { header: "Tier", value: (o) => (o.type === "sponsor" ? o.tier : "") },
    { header: "Partnership", value: (o) => (o.type === "partner" ? o.partnershipKind : "") },
    { header: "Contract value", value: (o) => (o.type === "sponsor" ? Number(o.contractValue ?? 0) : "") },
    {
        header: "Benefits delivered",
        value: (o) => (o.benefits.length ? `${o.benefits.filter((b) => b.delivered).length} of ${o.benefits.length}` : ""),
    },
    { header: "Outstanding benefits", value: (o) => o.benefits.filter((b) => !b.delivered).map((b) => b.label).join("; ") },
    { header: "Contact name", value: (o) => o.contactName },
    { header: "Contact email", value: (o) => o.contactEmail || o.invitedEmail },
    { header: "Contact phone", value: (o) => o.contactPhone },
    { header: "Website", value: (o) => o.websiteUrl },
    {
        header: "Collaborator access",
        value: (o) => (o.type !== "collaborator" ? "" : o.acceptedAt ? "Accepted" : o.invitedAt ? "Invited" : ""),
    },
    { header: "Accepted", value: (o) => (o.acceptedAt ? formatDate(o.acceptedAt) : "") },
];

export type HackathonTeamSummaryRow = {
    teamName: string;
    trackName: string;
    leadName: string;
    memberCount: number;
    paymentStatus: string;
    accessCode: string;
};

export type HackathonTeamMemberRow = {
    teamName: string;
    memberName: string;
    email: string;
    role: string;
    registrationId: string;
};

export const hackathonTeamSummaryColumns: CsvColumn<HackathonTeamSummaryRow>[] = [
    { header: "Team", value: (r) => r.teamName },
    { header: "Competition", value: (r) => r.trackName },
    { header: "Lead", value: (r) => r.leadName },
    { header: "Members", value: (r) => r.memberCount },
    { header: "Payment", value: (r) => r.paymentStatus },
    { header: "Access code", value: (r) => r.accessCode },
];

export const hackathonTeamMemberColumns: CsvColumn<HackathonTeamMemberRow>[] = [
    { header: "Team", value: (r) => r.teamName },
    { header: "Name", value: (r) => r.memberName },
    { header: "Email", value: (r) => r.email },
    { header: "Role", value: (r) => r.role },
    { header: "Registration ID", value: (r) => r.registrationId },
];
