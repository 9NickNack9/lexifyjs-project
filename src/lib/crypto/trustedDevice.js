import crypto from "crypto";

export function mintTrustedDeviceToken() {
  return crypto.randomBytes(32).toString("base64url"); // cookie value
}

export function hashTrustedDeviceToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
