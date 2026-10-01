import QRCode from "qrcode";
import { uploadMedia } from "@/src/features/media/uploadMedia.action";
import { QrPayload } from "./types";

/** Where QR images live inside the public media bucket. */
const QR_FOLDER = "qr-codes";

/**
 * What the attendee's QR code encodes.
 *
 * Exactly the four values the feature asks for. Stored verbatim in
 * `registration.qrCode.data`, so whoever writes the scanner reads back the same
 * string that was encoded rather than reconstructing it from other fields and
 * hoping the two agree.
 */
export function buildQrPayload(args: {
    name: string;
    email: string;
    eventId: string;
    registrationId: string;
    timestamp: string;
}): QrPayload {
    return {
        name: args.name,
        email: args.email,
        eventId: args.eventId,
        registrationId: args.registrationId,
        timestamp: args.timestamp,
    };
}

/**
 * Render a payload to a PNG.
 *
 * Error correction level M, which tolerates ~15% damage -- these get screenshotted,
 * re-photographed off another screen and printed, so the default L is optimistic.
 * `margin: 2` keeps the quiet zone scanners need; without it a code butted against
 * a dark background often will not read at all.
 */
export async function generateQrPng(payload: QrPayload): Promise<Buffer> {
    return QRCode.toBuffer(JSON.stringify(payload), {
        type: "png",
        errorCorrectionLevel: "M",
        margin: 2,
        width: 512,
    });
}

/**
 * Generate the QR and put it somewhere an email can reach.
 *
 * Hosted rather than inlined as a data URI because mail clients block those, and
 * the QR is the one part of the confirmation email that has to render. Reuses
 * `uploadMedia` rather than talking to Supabase directly, so bucket names, key
 * generation and public-URL construction stay in one place.
 *
 * Returns null rather than throwing: a registration that exists without a QR is
 * recoverable -- the attendee still has their ticket page and the organizer still
 * has the record -- whereas losing the registration because an image upload failed
 * is not.
 */
export async function generateAndHostQr(payload: QrPayload): Promise<{ data: string; imageUrl: string } | null> {
    try {
        const png = await generateQrPng(payload);

        const form = new FormData();
        // File is global from Node 18; uploadMedia takes a File and checks its MIME.
        form.append("file", new File([new Uint8Array(png)], `${payload.registrationId}.png`, { type: "image/png" }));
        form.append("folder", QR_FOLDER);

        const result = await uploadMedia(form);
        if (!result.success) {
            console.error("[generateAndHostQr] upload failed", result.error);
            return null;
        }

        return { data: JSON.stringify(payload), imageUrl: result.url };
    } catch (err) {
        console.error("[generateAndHostQr]", err);
        return null;
    }
}
