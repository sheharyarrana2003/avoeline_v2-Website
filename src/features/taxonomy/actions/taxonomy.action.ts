"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { adminDb } from "@/data/admin_db";
import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { AuthService } from "@/src/features/auth/authService";
import { NotificationServices } from "@/src/services/notification.services";
import { ActionResult, fail, ok } from "@/src/lib/action";
import type { CustomFieldOption } from "@/src/services/models/event.model";
import { collectionFor } from "../taxonomy.service";
import {
    kindLabel,
    parseFieldLines,
    slugifyId,
    type TaxonomyKind,
} from "../types";

/* ------------------------------------------------------------------ *
 * The spec's starting taxonomy (§1.1), plus the field sets and
 * checklist templates its §1.3 and §1.4 examples call for.
 *
 * These constants exist only to seed an empty database. Once seeded,
 * everything here is editable from /admin -- which is the entire point
 * of the module, so resist adding to this list instead of the UI.
 * ------------------------------------------------------------------ */

type SeedEntry = {
    name: string;
    description: string;
    checklist?: string[];
    /** Same textarea syntax the admin edit form uses. See parseFieldLines. */
    fields?: string;
};

const SEED_SUPER_CATEGORIES: SeedEntry[] = [
    {
        name: "Technology",
        description: "Software, hardware, data and engineering events.",
        checklist: ["Confirm wifi capacity for attendee devices", "Arrange power strips at every seating block"],
    },
    {
        name: "Food & Beverage",
        description: "Tastings, food festivals, culinary showcases.",
        fields: "Cuisine Type* | dropdown | Pakistani, Middle Eastern, South Asian, Continental, Fusion, Other\nDietary Options | text",
        checklist: ["Confirm food-handling permits", "Collect dietary requirements from registrations"],
    },
    { name: "Corporate", description: "Internal and client-facing business events." },
    {
        name: "Sports",
        description: "Tournaments, matches, fitness and athletics events.",
        fields: "Team Size* | number",
        checklist: ["Book medical cover for the venue", "Confirm referees and match officials"],
    },
    {
        name: "Health",
        description: "Medical, wellness and public-health events.",
        fields: "Medical disclaimer accepted* | checkbox\nOn-site medical cover | text",
        checklist: ["Confirm first-aid provision", "Publish the medical disclaimer on the event page"],
    },
    { name: "Entertainment", description: "Concerts, screenings, performances and shows." },
    { name: "Education", description: "Academic, training and student events." },
    { name: "Government", description: "Public-sector and civic events." },
    { name: "NGO", description: "Non-profit, charity and community events." },
];

const SEED_EVENT_FORMATS: SeedEntry[] = [
    {
        name: "Seminar",
        description: "A focused session led by one or more speakers.",
        checklist: ["Confirm speakers and their topics", "Prepare the slide deck running order", "Test the projector and microphones"],
    },
    {
        name: "Workshop",
        description: "Hands-on, participant-led learning.",
        checklist: ["Prepare participant materials", "Confirm the room can be laid out in groups", "Send the pre-workshop setup instructions"],
    },
    {
        name: "Conference",
        description: "A multi-session, multi-speaker gathering.",
        checklist: ["Lock the multi-track agenda", "Confirm every speaker's travel", "Brief the registration desk team", "Print badges and signage"],
    },
    {
        name: "Hackathon",
        description: "A time-boxed build competition.",
        checklist: [
            "Publish the problem statements",
            "Define the judging rubric and its weightings",
            "Confirm the judging panel",
            "Set team size limits and the submission deadline",
            "Arrange overnight access, power and catering",
            "Prepare the prize pool and announcement",
        ],
    },
    {
        name: "Webinar",
        description: "An online-only session.",
        checklist: ["Create the meeting link", "Run a dry run with the speakers", "Confirm the recording is enabled"],
    },
    { name: "Networking Mixer", description: "Informal professional networking.", checklist: ["Print name badges", "Brief the hosts on introductions"] },
    { name: "Exhibition", description: "Stalls, booths and exhibitor stands.", checklist: ["Publish the floor plan", "Confirm every exhibitor's booth and power needs"] },
    { name: "Concert", description: "A live music performance.", checklist: ["Confirm sound check timings", "Arrange stage security and crowd control"] },
    { name: "Sports Tournament", description: "A bracketed or league competition.", checklist: ["Publish the fixture list", "Confirm officials and medical cover"] },
    { name: "Award Ceremony", description: "Recognition and prize-giving.", checklist: ["Finalise the winners list", "Confirm the trophy and certificate order", "Brief the host on the run of show"] },
];

/* ------------------------------------------------------------------ */

/**
 * Bounce back to /admin carrying a message.
 *
 * The admin page is a Server Component, so its forms cannot use
 * useActionState -- there is no client state to put an error in. A query
 * param survives the redirect and the page renders it through
 * FormFeedback, which keeps the whole screen free of client components.
 */
function bounce(tab: TaxonomyKind | "requests", error?: string, edit?: string): never {
    const params = new URLSearchParams({ tab });
    if (edit) params.set("edit", edit);
    if (error) params.set("e", error);
    redirect(`/admin?${params.toString()}`);
}

function readKind(formData: FormData): TaxonomyKind {
    return formData.get("kind") === "format" ? "format" : "super";
}

/** One item per line, blank lines dropped. */
function parseChecklist(text: unknown): string[] {
    return String(text ?? "")
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
}

/**
 * Create the spec's 9 super-categories and 10 event formats.
 *
 * Idempotent by construction rather than by a guard: the document id is the
 * slug of the name, so this reads the ids that already exist and writes only
 * the missing ones. Clicking it twice changes nothing, and an admin who has
 * since renamed or deactivated an entry does not get it silently restored.
 */
export async function seedTaxonomyAction(formData: FormData): Promise<void> {
    const kind = readKind(formData);
    try {
        if (!(await AuthService.requireAdmin())) bounce(kind, "Only a platform admin can do that.");

        for (const [k, seeds] of [["super", SEED_SUPER_CATEGORIES], ["format", SEED_EVENT_FORMATS]] as const) {
            const ref = adminDb.collection(collectionFor(k as TaxonomyKind));
            const existing = new Set((await ref.get()).docs.map((d: QueryDocumentSnapshot) => d.id));
            const batch = adminDb.batch();
            let queued = 0;

            for (const seed of seeds) {
                const id = slugifyId(seed.name);
                if (!id || existing.has(id)) continue;
                batch.set(ref.doc(id), {
                    id,
                    name: seed.name,
                    description: seed.description,
                    active: true,
                    status: "approved",
                    checklist: seed.checklist ?? [],
                    fields: seed.fields ? parseFieldLines(seed.fields) : [],
                    requestedBy: null,
                    requestedByName: "",
                    adminNote: "",
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    decidedAt: null,
                });
                queued += 1;
            }

            if (queued) await batch.commit();
        }

        revalidatePath("/admin");
    } catch (err) {
        if (isRedirectError(err)) throw err;
        console.error("[seedTaxonomyAction]", err);
        bounce(kind, "Could not seed the defaults. Please try again.");
    }

    bounce(kind);
}

/**
 * Add, rename, edit or deactivate one entry -- all four of the spec's §1.2
 * verbs through one action, because they are one write.
 *
 * Only keys actually present in the FormData are applied. That is what lets
 * the deactivate toggle post three inputs without blanking the name, and the
 * edit form post its fields without having to restate every other column.
 */
export async function upsertTaxonomyAction(formData: FormData): Promise<void> {
    const kind = readKind(formData);
    try {
        if (!(await AuthService.requireAdmin())) bounce(kind, "Only a platform admin can do that.");

        const existingId = String(formData.get("id") ?? "").trim();
        const ref = adminDb.collection(collectionFor(kind));

        if (!existingId) {
            const name = String(formData.get("name") ?? "").trim();
            if (!name) bounce(kind, `Give the ${kindLabel(kind).toLowerCase()} a name.`);

            const id = slugifyId(name);
            if (!id) bounce(kind, "That name has no letters or numbers in it.");
            if ((await ref.doc(id).get()).exists) bounce(kind, `"${name}" already exists.`);

            await ref.doc(id).set({
                id,
                name,
                description: String(formData.get("description") ?? "").trim(),
                active: true,
                status: "approved",
                checklist: parseChecklist(formData.get("checklist")),
                fields: kind === "super" ? parseFieldLines(String(formData.get("fields") ?? "")) : [],
                requestedBy: null,
                requestedByName: "",
                adminNote: "",
                createdAt: new Date(),
                updatedAt: new Date(),
                decidedAt: null,
            });

            revalidatePath("/admin");
            revalidatePath("/organizer", "layout");
            bounce(kind);
        }

        const snap = await ref.doc(existingId).get();
        if (!snap.exists) bounce(kind, "That entry no longer exists.");

        // Renaming keeps the original document id on purpose: events already
        // reference it, and a new id would orphan every one of them.
        const patch: Record<string, unknown> = { updatedAt: new Date() };

        if (formData.has("name")) {
            const name = String(formData.get("name") ?? "").trim();
            if (!name) bounce(kind, "A name cannot be empty.", existingId);
            patch.name = name;
        }
        if (formData.has("description")) patch.description = String(formData.get("description") ?? "").trim();
        if (formData.has("checklist")) patch.checklist = parseChecklist(formData.get("checklist"));
        if (formData.has("fields") && kind === "super") {
            patch.fields = parseFieldLines(String(formData.get("fields") ?? ""));
        }
        if (formData.has("active")) patch.active = String(formData.get("active")) === "true";

        await ref.doc(existingId).set(patch, { merge: true });

        revalidatePath("/admin");
        // A deactivated category must disappear from the wizard immediately.
        revalidatePath("/organizer", "layout");
    } catch (err) {
        if (isRedirectError(err)) throw err;
        console.error("[upsertTaxonomyAction]", err);
        bounce(kind, "Could not save that. Please try again.");
    }

    bounce(kind);
}

/**
 * Approve or reject an organizer's requested category (§1.2, §1.3).
 *
 * The request document is re-read here rather than trusted from the form, so
 * the organizer who gets notified is the one Firestore recorded -- not an id
 * a caller could substitute. Same reasoning as the quote-accept action.
 */
export async function decideRequestAction(formData: FormData): Promise<void> {
    const kind = readKind(formData);
    try {
        if (!(await AuthService.requireAdmin())) bounce("requests", "Only a platform admin can do that.");

        const id = String(formData.get("id") ?? "").trim();
        const adminNote = String(formData.get("adminNote") ?? "").trim();
        if (!id) bounce("requests", "That request no longer exists.");

        // Explicit rather than `decision === "approve"`: the two buttons share
        // one form, and a missing submitter must not quietly mean "reject".
        const decision = String(formData.get("decision") ?? "");
        if (decision !== "approve" && decision !== "reject") {
            bounce("requests", "Choose Approve or Reject.");
        }
        const approve = decision === "approve";

        const ref = adminDb.collection(collectionFor(kind)).doc(id);
        const snap = await ref.get();
        if (!snap.exists) bounce("requests", "That request no longer exists.");

        const raw = snap.data() ?? {};
        if (raw.status !== "pending") bounce("requests", "That request has already been decided.");

        await ref.set(
            {
                status: approve ? "approved" : "rejected",
                active: approve,
                adminNote,
                decidedAt: new Date(),
                updatedAt: new Date(),
            },
            { merge: true },
        );

        const organizerId = raw.requestedBy ? String(raw.requestedBy) : "";
        if (organizerId) {
            const label = kindLabel(kind).toLowerCase();
            await NotificationServices.createNotification({
                userId: organizerId,
                title: approve ? `${raw.name} was approved` : `${raw.name} was not approved`,
                message: approve
                    ? `Your requested ${label} "${raw.name}" is now available when you create an event.`
                    : `Your requested ${label} "${raw.name}" was declined.${adminNote ? ` Note: ${adminNote}` : ""}`,
                type: "category_request",
                deepLink: `/organizer/${organizerId}/events/create`,
            });
            // "layout" so the notification bell's unread badge refreshes too.
            revalidatePath(`/organizer/${organizerId}`, "layout");
        }

        revalidatePath("/admin");
    } catch (err) {
        if (isRedirectError(err)) throw err;
        console.error("[decideRequestAction]", err);
        bounce("requests", "Could not record that decision. Please try again.");
    }

    bounce("requests");
}

/**
 * An organizer asks for a category that does not exist yet (§1.3).
 *
 * Public-ish surface, so the organizer id comes from the session and never
 * from the form. It lands as a `pending` row in the real collection, which the
 * dropdowns already filter out -- no separate inbox to keep in sync.
 */
export async function requestCategoryAction(
    _prevState: ActionResult | null,
    formData: FormData,
): Promise<ActionResult> {
    try {
        const user = await AuthService.getCurrentUser();
        if (!user?.userId) return fail("Please sign in again before requesting a category.");
        if (String(user.userType).trim().toLowerCase() !== "organizer") {
            return fail("Only organizers can request a new category.");
        }

        const kind: TaxonomyKind = readKind(formData);
        const name = String(formData.get("name") ?? "").trim();
        if (!name) return fail("Type the name you would like added.");
        if (name.length > 60) return fail("That name is too long -- keep it under 60 characters.");

        const id = slugifyId(name);
        if (!id) return fail("That name has no letters or numbers in it.");

        const ref = adminDb.collection(collectionFor(kind)).doc(id);
        const snap = await ref.get();
        if (snap.exists) {
            const status = snap.data()?.status;
            if (status === "pending") return fail(`"${name}" has already been requested and is awaiting review.`);
            if (status === "rejected") return fail(`"${name}" was reviewed previously and declined.`);
            return fail(`"${name}" is already available -- check the dropdown again.`);
        }

        await ref.set({
            id,
            name,
            description: "",
            // Live from the moment it is approved; the status is what hides it.
            active: true,
            status: "pending",
            checklist: [],
            fields: [] as CustomFieldOption[],
            requestedBy: user.userId,
            requestedByName: String(user.name || user.email || ""),
            adminNote: "",
            createdAt: new Date(),
            updatedAt: new Date(),
            decidedAt: null,
        });

        revalidatePath("/admin");
        return ok();
    } catch (err) {
        if (isRedirectError(err)) throw err;
        console.error("[requestCategoryAction]", err);
        return fail("Could not send that request. Please try again.");
    }
}
