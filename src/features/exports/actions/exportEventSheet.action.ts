"use server";

import { deliverSheet, isSheetFormat, type SheetFormat } from "@/src/features/exports/writeSheet";
import {
    attendeeColumns,
    checkInColumns,
    checkInRows,
    financialColumns,
    financialRows,
    isSheetKind,
    sponsorColumns,
    SHEET_META,
    type AttendeeRow,
    type SheetKind,
} from "@/src/features/exports/eventSheets";
import { assertOwnedEvent } from "@/src/features/events/ownership";
import { getEventOrganizations } from "@/src/features/organizations/organizations.service";
import { RegService } from "@/src/services/registeration.service";
import { UserService } from "@/src/services/user.service";
import type { RegistrationStatus } from "@/src/services/models/reg.type";
import type { ExportResult } from "@/src/features/exports/types";


/** `"all"` rather than an empty string, so an unset filter cannot read as a status. */
export type StatusFilter = RegistrationStatus | "all";

export type SheetRequest = {
    eventId: string;
    kind: SheetKind;
    format: SheetFormat;
    /** Attendee export only; ignored by the other three. */
    status?: StatusFilter;
};

/**
 * Build one of the four event exports and hand back a download link.
 *
 * One action for all four rather than four actions, because everything except
 * the columns is shared: the ownership check, the registration read, the
 * name-and-email join, and the delivery path. Splitting it would copy the
 * authorization four times, and an export that skipped it hands out attendee
 * phone numbers.
 *
 * The arguments are validated rather than trusted even though they come from
 * this app's own UI -- a Server Action is a public endpoint, so `kind` and
 * `format` are checked against their unions before either is used to pick a
 * code path or build a filename.
 */
export async function exportEventSheetAction(request: SheetRequest): Promise<ExportResult> {
    try {
        const { eventId } = request;
        const kind: SheetKind = isSheetKind(request.kind) ? request.kind : "attendees";
        const format: SheetFormat = isSheetFormat(request.format) ? request.format : "csv";

        // Every one of these sheets is confidential -- attendee contact details,
        // takings, sponsor contract values -- so ownership is checked first and
        // nothing is read before it passes.
        const event = await assertOwnedEvent(eventId);
        if (!event) return { success: false, error: "You cannot export data for that event." };

        const title = event.title || eventId;
        const base = `${SHEET_META[kind].basename}-${title}`;

        if (kind === "sponsors") {
            const orgs = await getEventOrganizations(eventId);
            return deliver(await deliverSheet(base, format, orgs, sponsorColumns, SHEET_META[kind].label));
        }

        const regs = await RegService.getRegsOfEvent(eventId);
        const usersById = regs.length
            ? await UserService.getUsersByIds(regs.map((r) => r.userId).filter(Boolean))
            : new Map();

        const rows: AttendeeRow[] = regs.map((reg) => {
            const user = usersById.get(String(reg.userId));
            return {
                reg,
                // Same fallback chain as the certificates page: a public
                // registration has no account, so its contact details live on the
                // registration itself.
                name: user?.profile?.fullName || reg.attendee?.name || "",
                email: user?.email || reg.attendee?.email || "",
            };
        });

        if (kind === "checkin") {
            return deliver(
                await deliverSheet(base, format, checkInRows(rows), checkInColumns, SHEET_META[kind].label),
            );
        }

        if (kind === "financial") {
            const orgs = await getEventOrganizations(eventId);
            const currency = event.pricing?.currency || "PKR";
            return deliver(
                await deliverSheet(
                    base,
                    format,
                    financialRows(rows, orgs),
                    financialColumns(currency),
                    SHEET_META[kind].label,
                ),
            );
        }

        const status = request.status ?? "all";
        const filtered = status === "all" ? rows : rows.filter((r) => r.reg.status === status);
        // The filter is part of the filename, or three exports of the same event
        // are indistinguishable in a downloads folder.
        const name = status === "all" ? base : `${SHEET_META[kind].basename}-${status}-${title}`;
        const questions = event.registration?.customForm ?? [];

        return deliver(
            await deliverSheet(name, format, filtered, attendeeColumns(questions), SHEET_META[kind].label),
        );
    } catch (err) {
        console.error("[exportEventSheetAction]", err);
        return { success: false, error: "Could not build the export. Please try again." };
    }
}

function deliver(result: Awaited<ReturnType<typeof deliverSheet>>): ExportResult {
    if (!result.success) return { success: false, error: result.error };
    return { success: true, url: result.url, filename: result.filename };
}
