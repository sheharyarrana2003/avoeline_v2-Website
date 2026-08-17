/**
 * What the public registration form collects, and what goes inside the QR code.
 *
 * Deliberately not the `Registration` document shape: that carries payment,
 * check-in, certificate and communication state the form knows nothing about.
 * This is only the part a stranger on the internet supplies.
 */
export interface PublicRegistrationInput {
    name: string;
    email: string;
    phone: string;
    /** Only collected for paid events. Uploaded in the same form submission. */
    paymentProof?: File | null;
}

/**
 * The payload encoded into the attendee's QR code.
 *
 * Stored verbatim in `registration.qrCode.data` so a scanner reads exactly what
 * was encoded rather than something reconstructed later from other fields, which
 * could drift. Keys are spelled out instead of abbreviated -- a QR code has room
 * to spare, and whoever writes the scanner should not have to guess what "r"
 * means.
 */
export interface QrPayload {
    name: string;
    eventId: string;
    registrationId: string;
    /** ISO 8601, the moment the registration was created. */
    timestamp: string;
}

/** Why a registration was refused, so the form can say something specific. */
export type RegistrationRefusal =
    | "event_not_found"
    | "event_closed"
    | "event_full"
    | "already_registered";
