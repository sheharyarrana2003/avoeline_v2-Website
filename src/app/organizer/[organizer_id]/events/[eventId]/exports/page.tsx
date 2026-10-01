import { notFound } from "next/navigation";
import { Card, CardBody } from "@/src/shared_components/ui/Card";
import { assertOwnedEvent } from "@/src/features/events/ownership";
import { ExportPanel } from "@/src/features/exports/components/ExportPanel";
import { exportEventSheetAction, type StatusFilter } from "@/src/features/exports/actions/exportEventSheet.action";
import { isSheetFormat } from "@/src/features/exports/writeSheet";
import { isSheetKind, type SheetKind } from "@/src/features/exports/eventSheets";
import { eventIsHackathon } from "@/src/features/hackathon/hackathon.service";

/**
 * Spec 6.2 -- every export for one event, in one place.
 *
 * Its own tab rather than a button on each of the tabs the data lives on: the
 * financial summary spans registrations and sponsors, so it has no single home,
 * and an organizer who has come to download something wants the four side by
 * side rather than to go looking.
 */
export default async function EventExportsPage({
    params,
}: {
    params: Promise<{ eventId: string }>;
}) {
    const { eventId } = await params;

    const event = await assertOwnedEvent(eventId);
    if (!event) notFound();

    // Bound server-side so the event id never reaches the client, matching the
    // attendees tab. The action re-checks ownership regardless -- this only means
    // a tampered request cannot name a different event in the first place.
    const run = async (kind: SheetKind, format: "csv" | "xlsx", status?: string) => {
        "use server";
        return exportEventSheetAction({
            eventId,
            kind: isSheetKind(kind) ? kind : "attendees",
            format: isSheetFormat(format) ? format : "csv",
            status: (status ?? "all") as StatusFilter,
        });
    };

    return (
        <Card title="Exports">
            <CardBody>
                <p className="pb-2 text-xs text-ink-soft">
                    Each of these downloads as an Excel workbook or a CSV. The links are private and
                    expire an hour after you ask for them.
                </p>
                <ExportPanel
                    run={run}
                    questionCount={(event.registration?.customForm ?? []).length}
                    showHackathonTeams={await eventIsHackathon(event)}
                />
            </CardBody>
        </Card>
    );
}
