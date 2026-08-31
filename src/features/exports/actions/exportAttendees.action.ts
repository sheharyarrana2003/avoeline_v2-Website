"use server";

import { toCsv, type CsvColumn } from "@/src/lib/csv";
import { deliverFile } from "@/src/features/exports/deliverFile";
import { assertOwnedEvent } from "@/src/features/events/ownership";
import { RegService } from "@/src/services/registeration.service";
import { UserService } from "@/src/services/user.service";
import { formatDateTime } from "@/src/lib/datetime";
import type { Registration } from "@/src/services/models/reg.type";

export type ExportResult = { success: boolean; url?: string; filename?: string; error?: string };

type Row = { reg: Registration; name: string; email: string };

const COLUMNS: CsvColumn<Row>[] = [
    { header: "Name", value: (r) => r.name },
    { header: "Email", value: (r) => r.email },
    { header: "Phone", value: (r) => r.reg.attendee?.phone ?? "" },
    { header: "Status", value: (r) => r.reg.status },
    { header: "Ticket tier", value: (r) => r.reg.pricingTier },
    { header: "Amount paid", value: (r) => Number(r.reg.payment?.amountPaid ?? 0) },
    { header: "Payment status", value: (r) => r.reg.payment?.paymentStatus ?? "" },
    { header: "Checked in", value: (r) => (r.reg.checkIn?.checkedIn ? "Yes" : "No") },
    { header: "Check-in time", value: (r) => (r.reg.checkIn?.checkInTime ? formatDateTime(r.reg.checkIn.checkInTime) : "") },
    { header: "Registered", value: (r) => formatDateTime(r.reg.createdAt) },
];

/**
 * Export one event's attendees as CSV.
 *
 * The first consumer of `toCsv` + `deliverFile`, and deliberately thin: no
 * status filter and no custom-field columns yet, because registrations do not
 * store answers to a registration form at all. Module 6 widens it; this proves
 * the download path works without an API route.
 */
export async function exportAttendeesAction(eventId: string): Promise<ExportResult> {
    try {
        // This hands over attendee names, emails and phone numbers, so ownership
        // is the whole security boundary and is checked first.
        const event = await assertOwnedEvent(eventId);
        if (!event) return { success: false, error: "You cannot export attendees for that event." };

        const regs = await RegService.getRegsOfEvent(eventId);
        const usersById = regs.length
            ? await UserService.getUsersByIds(regs.map((r) => r.userId).filter(Boolean))
            : new Map();

        const rows: Row[] = regs.map((reg) => {
            const user = usersById.get(String(reg.userId));
            return {
                reg,
                name: user?.profile?.fullName || reg.attendee?.name || "",
                email: user?.email || reg.attendee?.email || "",
            };
        });

        const delivered = await deliverFile(`attendees-${event.title || eventId}.csv`, toCsv(rows, COLUMNS));
        if (!delivered.success) return { success: false, error: delivered.error };

        return { success: true, url: delivered.url, filename: delivered.filename };
    } catch (err) {
        console.error("[exportAttendeesAction]", err);
        return { success: false, error: "Could not build the export. Please try again." };
    }
}
