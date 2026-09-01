"use server";

import { AgendaService } from "@/src/features/agendas/agenda.service";
import { AgendaItem } from "@/src/services/models/event.model";
import { revalidatePath } from "next/cache";

export async function createAgendaAction(
    eventId: string,
    organizerId: string,
    prevState: { success: boolean; error?: string } | null,
    formData: FormData
): Promise<{ success: boolean; error?: string }> {
    try {
        const title = formData.get("title") as string;
        const type = (formData.get("sessionType") as AgendaItem["type"]) ?? "talk";
        const date = formData.get("date") as string;
        const startTime = formData.get("startTime") as string;
        const endTime = formData.get("endTime") as string;
        const location = (formData.get("location") as string) ?? "";
        const speakerRaw = (formData.get("speakerNames") as string) ?? "";
        const description = (formData.get("description") as string) ?? "";
        const status = (formData.get("status") as AgendaItem["status"]) ?? "confirmed";

        if (!title || !date || !startTime || !endTime) {
            return { success: false, error: "Title, date, start time and end time are required." };
        }

        const speakerNames = speakerRaw
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);

        // One checkbox per tier, all sharing the name, so getAll collects them --
        // the same shape speakerNames uses. None ticked means "everyone".
        const tiers = formData.getAll("tiers").map(String).map((t) => t.trim()).filter(Boolean);

        await AgendaService.addAgendaItem(eventId, {
            title,
            type,
            date,
            startTime,
            endTime,
            location,
            speakerNames,
            description,
            status,
            tiers,
        });

        revalidatePath(`/organizer/${organizerId}/events/${eventId}/agenda`);
        return { success: true };
    } catch (err: any) {
        console.error("[createAgendaAction]", err);
        return { success: false, error: err?.message ?? "Something went wrong." };
    }
}
