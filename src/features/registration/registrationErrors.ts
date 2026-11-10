/**
 * Attendee-facing registration / proof-upload copy.
 * Never forward raw Zod or internal server strings.
 */

const RAW_VALIDATOR =
  /expected object|received undefined|invalid input|invalid type|required at|too_small|too_big|unrecognized_keys/i;

export const UPLOAD_FILE_HELP = "We couldn't upload this file. Use an image or PDF under 5 MB.";

export const REGISTRATION_CHECK_ANSWERS = "Please check your answers and try again.";

/** Map a Zod (or unknown) validation message to plain language. */
export function mapRegistrationValidationMessage(
  raw: string | undefined | null,
  opts?: { fieldLabel?: string },
): string {
  const msg = String(raw || "").trim();
  if (!msg) return REGISTRATION_CHECK_ANSWERS;
  if (RAW_VALIDATOR.test(msg) || msg.toLowerCase().includes("expected")) {
    if (opts?.fieldLabel) {
      return `Please complete ${opts.fieldLabel}. ${UPLOAD_FILE_HELP}`;
    }
    return UPLOAD_FILE_HELP;
  }
  // Already plain (custom schema messages) — allow through if short and safe.
  if (msg.length <= 160 && !msg.includes("{") && !/z\./i.test(msg)) return msg;
  return REGISTRATION_CHECK_ANSWERS;
}

/** Map `/api/uploads/proof` (and similar) errors for field display. */
export function mapProofUploadClientError(raw: string | undefined | null, status?: number): string {
  const msg = String(raw || "").trim();
  if (status === 429 || /too many/i.test(msg)) {
    return "Too many uploads. Please wait a minute and try again.";
  }
  if (/not open for registration|no longer open|closed/i.test(msg)) {
    return "This event is not open for registration right now.";
  }
  if (/does not take registrations/i.test(msg)) {
    return "This event does not take registrations.";
  }
  if (/not found/i.test(msg) || status === 404) {
    return "We couldn't find this event. Refresh the page and try again.";
  }
  if (/image or pdf|mime|file type|too large|under \d|empty|dimension/i.test(msg)) {
    return UPLOAD_FILE_HELP;
  }
  if (!msg || RAW_VALIDATOR.test(msg) || msg.length > 160) return UPLOAD_FILE_HELP;
  return msg;
}

/** True if a string looks like a raw validator / stack leak. */
export function looksLikeRawValidatorText(msg: string): boolean {
  return RAW_VALIDATOR.test(msg) || msg.includes("Zod") || /at path/i.test(msg);
}
