/**
 * Legacy Server Action result (`{ success, error? }`).
 * New actions should use `SafeActionResult` / `safeAction` from `@/src/lib/safeAction` (C2).
 */
export type ActionResult = { success: boolean; error?: string };

/** Convenience for the happy path. */
export const ok = (): ActionResult => ({ success: true });

/** Convenience for the failure path. The message is shown to the user. */
export const fail = (error: string): ActionResult => ({ success: false, error });

export type { SafeActionResult } from "./safeAction";
export { safeAction, safeOk, safeFail, toLegacyResult } from "./safeAction";
