/**
 * What every export hands back.
 *
 * Its own file because four client components need the type and none of them
 * should import a `"use server"` module to get it -- the reason it moved out of
 * the action in the first place.
 */
export type ExportResult = { success: boolean; url?: string; filename?: string; error?: string };
