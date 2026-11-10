import QRCode from "qrcode";
import { signCheckInToken, checkInQrImagePath } from "@/src/features/registration/checkInToken";

/**
 * On-demand QR PNG encodes a signed opaque check-in token (no PII JSON).
 * Images are never stored in Drive/Storage.
 */
export async function generateQrPng(opaqueToken: string): Promise<Buffer> {
  return QRCode.toBuffer(String(opaqueToken), {
    type: "png",
    errorCorrectionLevel: "M",
    margin: 2,
    width: 512,
  });
}

/**
 * Build signed check-in QR for a registration. Returns token + synthetic image path.
 */
export async function generateAndHostQr(args: {
  registrationId: string;
  eventId: string;
}): Promise<{ data: string; imageUrl: string; png?: Buffer; token: string } | null> {
  try {
    const token = signCheckInToken({
      registrationId: args.registrationId,
      eventId: args.eventId,
    });
    const png = await generateQrPng(token);
    return {
      data: token,
      token,
      imageUrl: checkInQrImagePath(token),
      png,
    };
  } catch (err) {
    console.error("[generateAndHostQr]", err);
    return null;
  }
}

/** @deprecated PII JSON payload removed in N4 — kept for type import compatibility. */
export type QrPayload = {
  name: string;
  email: string;
  eventId: string;
  registrationId: string;
  timestamp: string;
};

/** @deprecated Use generateAndHostQr({ registrationId, eventId }). */
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
