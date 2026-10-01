import { supabaseAdmin, CERTIFICATES_BUCKET, getSignedUrl } from "@/data/supabase";

/**
 * Hand a generated file to the person who asked for it.
 *
 * This app has **no API routes** — `find app -name route.ts` returns nothing,
 * every mutation is a Server Action — so there is no endpoint that can stream a
 * response with a Content-Disposition header, and adding the first one would
 * mean a new pattern for the whole codebase to follow.
 *
 * It does not need one. Media already goes to Supabase Storage, and the private
 * `certificates` bucket already has `getSignedUrl`. So: write the bytes there
 * under an `exports/` prefix and return a short-lived signed URL the browser can
 * download from. No route, no new bucket (creating one needs `setup:buckets`),
 * no new dependency, and the link expires on its own rather than leaving an
 * attendee list permanently fetchable.
 *
 * Server-only: it imports the service-role client. Never import from a
 * Client Component.
 */

export type DeliveredFile =
    | { success: true; url: string; path: string; filename: string }
    | { success: false; error: string };

/** An hour is long enough to click a link and short enough not to be a leak. */
const LINK_TTL_SECONDS = 3600;

function safeSegment(text: string): string {
    return (
        String(text)
            .toLowerCase()
            .replace(/[^a-z0-9.-]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 80) || "export"
    );
}

/**
 * `filename` is what the browser saves it as; a date stamp is appended so
 * repeated exports do not overwrite each other in the bucket or collide in the
 * user's downloads folder.
 */
export async function deliverFile(
    filename: string,
    body: string | Uint8Array,
    contentType = "text/csv; charset=utf-8",
): Promise<DeliveredFile> {
    try {
        const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
        const base = safeSegment(filename.replace(/\.[a-z0-9]+$/i, ""));
        const ext = (filename.match(/\.([a-z0-9]+)$/i)?.[1] ?? "csv").toLowerCase();
        const saveAs = `${base}-${stamp}.${ext}`;
        const key = `exports/${crypto.randomUUID()}-${saveAs}`;

        const bytes = typeof body === "string" ? new TextEncoder().encode(body) : body;

        const { error } = await supabaseAdmin.storage
            .from(CERTIFICATES_BUCKET)
            .upload(key, bytes, { contentType, upsert: false });

        if (error) {
            console.error("[deliverFile] upload failed", { key, error });
            return { success: false, error: "Could not prepare the download." };
        }

        return {
            success: true,
            // downloadAs, or the browser saves it under the uuid-prefixed key.
            url: await getSignedUrl(CERTIFICATES_BUCKET, key, LINK_TTL_SECONDS, saveAs),
            path: key,
            filename: saveAs,
        };
    } catch (err) {
        console.error("[deliverFile]", err);
        return { success: false, error: "Could not prepare the download." };
    }
}
