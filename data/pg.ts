/**
 * Minimal typed helpers over supabaseAdmin. Services import this instead of Firestore.
 */
import { supabaseAdmin } from "./supabase";

export async function pgGet<T = Record<string, unknown>>(table: string, id: string): Promise<T | null> {
  const { data, error } = await supabaseAdmin.from(table).select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as T) ?? null;
}

export async function pgGetEq<T = Record<string, unknown>>(
  table: string,
  column: string,
  value: string | number | boolean,
): Promise<T[]> {
  const { data, error } = await supabaseAdmin.from(table).select("*").eq(column, value);
  if (error) throw error;
  return (data as T[]) ?? [];
}

export async function pgInsert<T = Record<string, unknown>>(table: string, row: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabaseAdmin.from(table).insert(row).select("*").single();
  if (error) throw error;
  return data as T;
}

export async function pgUpsert<T = Record<string, unknown>>(
  table: string,
  row: Record<string, unknown>,
  onConflict = "id",
): Promise<T> {
  const { data, error } = await supabaseAdmin.from(table).upsert(row, { onConflict }).select("*").single();
  if (error) throw error;
  return data as T;
}

export async function pgUpdate(table: string, id: string, patch: Record<string, unknown>, idColumn = "id"): Promise<void> {
  const { error } = await supabaseAdmin.from(table).update(patch).eq(idColumn, id);
  if (error) throw error;
}

export async function pgDelete(table: string, id: string, idColumn = "id"): Promise<void> {
  const { error } = await supabaseAdmin.from(table).delete().eq(idColumn, id);
  if (error) throw error;
}

export async function pgAll<T = Record<string, unknown>>(table: string): Promise<T[]> {
  const { data, error } = await supabaseAdmin.from(table).select("*");
  if (error) throw error;
  return (data as T[]) ?? [];
}
