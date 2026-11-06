import "server-only";

import { getConnectionsEncryptionKey } from "@/src/env";
import { decryptWithKey, encryptWithKey } from "../lib/crypto";

const ACCESS_CACHE_TTL_MS = 4 * 60 * 1000;

type AccessCacheEntry = { token: string; expiry: number };
const accessCache = new Map<string, AccessCacheEntry>();

export const CURRENT_KEY_VERSION = 1;

function material(override?: string): string {
  const secret = override ?? getConnectionsEncryptionKey();
  if (!secret || secret.length < 16) {
    throw new Error(
      "CONNECTIONS_ENCRYPTION_KEY (or EMAIL_CONNECTION_SECRET) is required (min 16 characters).",
    );
  }
  return secret;
}

/** Encrypt UTF-8; returns `iv:tag:ciphertext` (base64 parts). Compatible with legacy email secretCrypto. */
export function encryptToken(plain: string, keyMaterial?: string): string {
  return encryptWithKey(plain, material(keyMaterial));
}

export function decryptToken(payload: string, keyMaterial?: string): string {
  return decryptWithKey(payload, material(keyMaterial));
}

export function connectionsEncryptionConfigured(): boolean {
  return Boolean(getConnectionsEncryptionKey());
}

export function cacheAccessToken(connectionId: string, token: string, expiryMs: number): void {
  accessCache.set(connectionId, { token, expiry: expiryMs });
}

export function getCachedAccessToken(connectionId: string): string | null {
  const hit = accessCache.get(connectionId);
  if (!hit) return null;
  if (hit.expiry <= Date.now() + 30_000) {
    accessCache.delete(connectionId);
    return null;
  }
  return hit.token;
}

export function clearAccessTokenCache(connectionId?: string): void {
  if (connectionId) accessCache.delete(connectionId);
  else accessCache.clear();
}

/** Health: key present and round-trip encrypt works. */
export function tokenHealthCheck(): { ok: boolean; error?: string } {
  try {
    if (!connectionsEncryptionConfigured()) {
      return { ok: false, error: "encryption key missing" };
    }
    const sample = `health:${Date.now()}`;
    const enc = encryptToken(sample);
    const dec = decryptToken(enc);
    if (dec !== sample) return { ok: false, error: "round-trip mismatch" };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "health failed" };
  }
}

export { ACCESS_CACHE_TTL_MS };
