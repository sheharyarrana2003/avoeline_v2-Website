/** Client-safe Google Picker error copy (no secrets). */

const INVALID_KEY = /developer key|api[_ ]?key.*(invalid|not valid)|invalid.*api[_ ]?key/i;

export function formatPickerUserError(raw: string | null | undefined): string {
  const msg = String(raw || "").trim();
  if (!msg) return "Google Picker failed. Try again or reconnect Drive in Connections.";
  if (INVALID_KEY.test(msg)) {
    return (
      "Google Picker API key is invalid or blocked for this site. " +
      "In Google Cloud Console: enable Google Picker API, use a browser key restricted by HTTP referrer " +
      "(your production domain, *.vercel.app, and localhost), and set GOOGLE_PICKER_API_KEY / GOOGLE_PICKER_APP_ID " +
      "to that key and the project number. Then reopen Connections → Library / Files."
    );
  }
  if (/picker is not configured|GOOGLE_PICKER/i.test(msg)) {
    return msg;
  }
  return msg.length > 280 ? `${msg.slice(0, 277)}…` : msg;
}
