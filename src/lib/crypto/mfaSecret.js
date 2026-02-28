// src/lib/crypto/mfaSecret.js
import crypto from "crypto";

// 32-byte key, base64 encoded
const KEY_B64 = process.env.MFA_SECRET_KEY;
if (!KEY_B64) throw new Error("Missing MFA_SECRET_KEY env var");

const KEY = Buffer.from(KEY_B64, "base64");
if (KEY.length !== 32)
  throw new Error("MFA_SECRET_KEY must decode to 32 bytes");

export function encryptMfaSecret(plaintext) {
  const iv = crypto.randomBytes(12); // GCM standard
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  // Store as: iv.tag.ciphertext (base64)
  return [
    iv.toString("base64"),
    tag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(".");
}

export function decryptMfaSecret(stored) {
  const [ivB64, tagB64, ctB64] = String(stored || "").split(".");
  if (!ivB64 || !tagB64 || !ctB64) throw new Error("Bad MFA secret format");

  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const ciphertext = Buffer.from(ctB64, "base64");

  const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
  decipher.setAuthTag(tag);

  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}
