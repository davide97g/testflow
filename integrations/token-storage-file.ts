/**
 * File-based Token Storage (Fallback)
 *
 * Stores tokens in an encrypted local file when OS keychain is not available.
 * Uses simple encryption for basic security.
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { StoredTokens, TokenStorage } from "./token-storage";

const TOKEN_FILE = join(process.cwd(), ".tokens");
const ENCRYPTION_ALGORITHM = "aes-256-gcm";

/**
 * Gets encryption key from environment or generates a default (not secure for production)
 */
const getEncryptionKey = (): Buffer => {
  const keyEnv = process.env.TOKEN_ENCRYPTION_KEY;
  if (keyEnv) {
    return Buffer.from(keyEnv, "hex");
  }

  // Generate a key based on machine/user (not secure, but better than plain text)
  // In production, users should set TOKEN_ENCRYPTION_KEY
  const machineId = process.env.HOME || process.env.USER || "default";
  const key = createHash("sha256").update(machineId).digest();
  return key;
};

/**
 * Encrypts data
 */
const encrypt = (text: string, key: Buffer): string => {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  // Return iv:authTag:encrypted
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
};

/**
 * Decrypts data
 */
const decrypt = (encryptedData: string, key: Buffer): string => {
  const [ivHex, authTagHex, encrypted] = encryptedData.split(":");

  if (!ivHex || !authTagHex || !encrypted) {
    throw new Error("Invalid encrypted data format");
  }

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
};

export class FileTokenStorage implements TokenStorage {
  private key: Buffer;
  private tokens: Map<string, StoredTokens>;

  constructor() {
    this.key = getEncryptionKey();
    this.tokens = new Map();
    this.loadTokens().catch(() => {
      // Ignore loading errors on initialization
    });
  }

  async storeTokens(service: string, tokens: StoredTokens): Promise<void> {
    this.tokens.set(service, tokens);
    await this.saveTokens();
  }

  async getTokens(service: string): Promise<StoredTokens | null> {
    await this.loadTokens();
    return this.tokens.get(service) || null;
  }

  async deleteTokens(service: string): Promise<void> {
    this.tokens.delete(service);
    await this.saveTokens();
  }

  async hasTokens(service: string): Promise<boolean> {
    await this.loadTokens();
    return this.tokens.has(service);
  }

  private async loadTokens(): Promise<void> {
    try {
      if (!existsSync(TOKEN_FILE)) {
        this.tokens = new Map();
        return;
      }

      const encryptedData = await readFile(TOKEN_FILE, "utf8");
      const decryptedData = decrypt(encryptedData, this.key);
      const data = JSON.parse(decryptedData) as Record<string, StoredTokens>;

      this.tokens = new Map(Object.entries(data));
    } catch (error) {
      // If decryption fails, reset tokens
      console.warn("Failed to load tokens, resetting:", error);
      this.tokens = new Map();
    }
  }

  private async saveTokens(): Promise<void> {
    try {
      const data = Object.fromEntries(this.tokens);
      const jsonData = JSON.stringify(data);
      const encryptedData = encrypt(jsonData, this.key);

      await writeFile(TOKEN_FILE, encryptedData, { mode: 0o600 });
    } catch (error) {
      throw new Error(`Failed to save tokens: ${error}`);
    }
  }
}
