import QRCode from "qrcode";
import { QrPayload } from "./types";

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

export async function generateQrPng(payload: QrPayload): Promise<Buffer> {
  return QRCode.toBuffer(JSON.stringify(payload), {
    type: "png",
    errorCorrectionLevel: "M",
    margin: 2,
    width: 512,
  });
}

/**
 * Generate QR payload + PNG for email inline. Does not store or host the image
 * (O1 A6) — ticket UI uses `/api/qr/{registrationId}.png`.
 */
export async function generateAndHostQr(
  payload: QrPayload,
  _opts?: { organizerId?: string; eventId?: string },
): Promise<{ data: string; imageUrl: string; png?: Buffer } | null> {
  void _opts;
  try {
    const png = await generateQrPng(payload);
    const data = JSON.stringify(payload);
    return {
      data,
      imageUrl: `/api/qr/${payload.registrationId}.png`,
      png,
    };
  } catch (err) {
    console.error("[generateAndHostQr]", err);
    return null;
  }
}
