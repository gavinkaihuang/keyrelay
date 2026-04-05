import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

function getEncryptionSecret() {
  const secret = process.env.KEYRELAY_ENCRYPTION_SECRET;

  if (!secret) {
    throw new Error("Missing KEYRELAY_ENCRYPTION_SECRET.");
  }

  return createHash("sha256").update(secret).digest();
}

export function encrypt(value: string) {
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-cbc", getEncryptionSecret(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);

  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decrypt(value: string) {
  const [ivHex, encryptedHex] = value.split(":");

  if (!ivHex || !encryptedHex) {
    // Compatibility: old data may still be stored as plaintext.
    return value;
  }

  try {
    const iv = Buffer.from(ivHex, "hex");
    const encrypted = Buffer.from(encryptedHex, "hex");
    const decipher = createDecipheriv("aes-256-cbc", getEncryptionSecret(), iv);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

    return decrypted.toString("utf8");
  } catch {
    // Compatibility: fallback to original value when ciphertext format is invalid.
    return value;
  }
}