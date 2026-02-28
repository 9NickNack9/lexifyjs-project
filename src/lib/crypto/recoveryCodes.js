import crypto from "crypto";

// Format: XXXX-XXXX (8 chars), easy to type, case-insensitive
function randomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no O/0/I/1
  const pick = () => alphabet[Math.floor(Math.random() * alphabet.length)];
  return `${pick()}${pick()}${pick()}${pick()}-${pick()}${pick()}${pick()}${pick()}`;
}

function hashCode(code, salt) {
  return crypto.createHash("sha256").update(`${salt}:${code}`).digest("hex");
}

/** Generate N plaintext codes + a DB payload with salts+hashes */
export function generateRecoveryCodes(n = 10) {
  const plaintext = [];
  const stored = [];

  for (let i = 0; i < n; i++) {
    const code = randomCode();
    const salt = crypto.randomBytes(16).toString("hex");
    plaintext.push(code);
    stored.push({
      salt,
      hash: hashCode(code, salt),
      usedAt: null,
    });
  }

  return { plaintext, stored };
}

export function normalizeRecoveryCode(input) {
  return String(input || "")
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .replace(/--+/g, "-")
    .trim();
}

export function verifyRecoveryCode(input, storedCodes) {
  const code = normalizeRecoveryCode(input);
  if (!code || !Array.isArray(storedCodes)) return { ok: false };

  for (let idx = 0; idx < storedCodes.length; idx++) {
    const entry = storedCodes[idx];
    if (!entry || entry.usedAt) continue;
    const salt = entry.salt;
    const expected = entry.hash;
    if (!salt || !expected) continue;

    const actual = hashCode(code, salt);
    // timingSafeEqual requires same length buffers
    const a = Buffer.from(actual, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
      return { ok: true, idx, code };
    }
  }

  return { ok: false };
}
