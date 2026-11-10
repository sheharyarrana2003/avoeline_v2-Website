/** Toolbar Import is free events only (docs/23 A4). */
export const PAID_IMPORT_TOOLTIP = "Paid events need registration so payments can be verified";

export function importAttendeesAllowed(isFree: boolean): boolean {
  return Boolean(isFree);
}
