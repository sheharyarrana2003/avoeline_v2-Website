import "server-only";

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { getServerEnv } from "@/src/env";

function keyBytes(): Buffer {
  const secret = getServerEnv().EMAIL_CONNECTION_SECRET?.trim();
  if (!secret || secret.length < 16) {
    throw new Error(
      "EMAIL_CONNECTION_SECRET is required (min 16 characters) to store email connection secrets.",
    );
  }
  return createHash("sha256").update(secret).digest();
}

/** Encrypt a UTF-8 string; returns `iv:tag:ciphertext` (base64 parts). */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyBytes(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

export function decryptSecret(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(":");
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("Invalid ciphertext payload");
  const decipher = createDecipheriv("aes-256-gcm", keyBytes(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const dec = Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]);
  return dec.toString("utf8");
}

export function emailConnectionSecretConfigured(): boolean {
  const secret = getServerEnv().EMAIL_CONNECTION_SECRET?.trim();
  return Boolean(secret && secret.length >= 16);
}
