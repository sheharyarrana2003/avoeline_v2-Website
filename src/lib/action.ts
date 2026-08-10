/**
 * What every Server Action in this app returns.
 *
 * Actions never throw to the client -- they catch, log, and hand back a result
 * the caller can render. This type was being redeclared per action file, which
 * is how call sites ended up disagreeing about whether there was an error
 * channel at all.
 */
export type ActionResult = { success: boolean; error?: string };

/** Convenience for the happy path. */
export const ok = (): ActionResult => ({ success: true });

/** Convenience for the failure path. The message is shown to the user. */
export const fail = (error: string): ActionResult => ({ success: false, error });
