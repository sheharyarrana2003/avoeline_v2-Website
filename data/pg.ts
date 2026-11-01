/**
 * Minimal helpers over supabaseAdmin for dynamic table names.
 * Prefer feature services with TABLES.* literals when the table is known.
 */
import { supabaseAdmin } from "./supabase";

// Dynamic table names are not expressible in the generated Database union without
// exploding the type checker — cast at the boundary.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabaseAdmin as any;

export async function pgGet<T = Record<string, unknown>>(
  table: string,
  id: string,
): Promise<T | null> {
  const { data, error } = await db.from(table).select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as T) ?? null;
}

export async function pgGetEq<T = Record<string, unknown>>(
  table: string,
  column: string,
  value: string | number | boolean,
): Promise<T[]> {
  const { data, error } = await db.from(table).select("*").eq(column, value);
  if (error) throw error;
  return (data as T[]) ?? [];
}

export async function pgInsert<T = Record<string, unknown>>(
  table: string,
  row: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await db.from(table).insert(row).select("*").single();
  if (error) throw error;
  return data as T;
}

export async function pgUpsert<T = Record<string, unknown>>(
  table: string,
  row: Record<string, unknown>,
  onConflict = "id",
): Promise<T> {
  const { data, error } = await db.from(table).upsert(row, { onConflict }).select("*").single();
  if (error) throw error;
  return data as T;
}

export async function pgUpdate(
  table: string,
  id: string,
  patch: Record<string, unknown>,
  idColumn = "id",
): Promise<void> {
  const { error } = await db.from(table).update(patch).eq(idColumn, id);
  if (error) throw error;
}

export async function pgDelete(table: string, id: string, idColumn = "id"): Promise<void> {
  const { error } = await db.from(table).delete().eq(idColumn, id);
  if (error) throw error;
}

export async function pgAll<T = Record<string, unknown>>(table: string): Promise<T[]> {
  const { data, error } = await db.from(table).select("*");
  if (error) throw error;
  return (data as T[]) ?? [];
}
