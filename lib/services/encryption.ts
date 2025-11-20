import bcrypt from "bcryptjs";
import crypto from "crypto-js";

const ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY || "default-encryption-key-change-in-production";

/**
 * Encrypt sensitive data using AES encryption
 */
export function encrypt(text: string): string {
  return crypto.AES.encrypt(text, ENCRYPTION_KEY).toString();
}

/**
 * Decrypt encrypted data
 */
export function decrypt(encryptedText: string): string {
  try {
    const bytes = crypto.AES.decrypt(encryptedText, ENCRYPTION_KEY);
    return bytes.toString(crypto.enc.Utf8);
  } catch {
    throw new Error("Failed to decrypt data");
  }
}

/**
 * Hash passwords using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a secure random string
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.lib.WordArray.random(length).toString();
}

/**
 * Encrypt user API keys before storing in database
 */
export function encryptApiKey(apiKey: string): string {
  return encrypt(apiKey);
}

/**
 * Decrypt user API keys when retrieving from database
 */
export function decryptApiKey(encryptedKey: string): string {
  return decrypt(encryptedKey);
}
