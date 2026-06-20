import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);
const KEYLEN = 64;

/**
 * Hashes a plaintext password using scrypt with a random salt.
 * Returns a string in the format `<hex_hash>:<hex_salt>`.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const hash = (await scryptAsync(password, salt, KEYLEN)) as Buffer;
  return `${hash.toString("hex")}:${salt}`;
}

/**
 * Verifies a plaintext password against a stored scrypt hash string.
 * Uses timing-safe comparison to prevent timing attacks.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const colonIdx = stored.indexOf(":");
  if (colonIdx === -1) return false;
  const storedHex = stored.slice(0, colonIdx);
  const salt = stored.slice(colonIdx + 1);
  const storedBuffer = Buffer.from(storedHex, "hex");
  const verifyBuffer = (await scryptAsync(password, salt, KEYLEN)) as Buffer;
  if (storedBuffer.length !== verifyBuffer.length) return false;
  return timingSafeEqual(storedBuffer, verifyBuffer);
}
