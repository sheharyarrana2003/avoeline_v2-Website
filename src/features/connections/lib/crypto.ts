import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

/** Pure AES-256-GCM helpers (unit-testable; tokens.service adds env + cache). */
export function deriveKey(material: string): Buffer {
  return createHash("sha256").update(material).digest();
}

export function encryptWithKey(plain: string, material: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(material), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}:${tag.toString("base64")}:${enc.toString("base64")}`;
}

export function decryptWithKey(payload: string, material: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(":");
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("Invalid ciphertext payload");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    deriveKey(material),
    Buffer.from(ivB64, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const dec = Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]);
  return dec.toString("utf8");
}
