/**
 * macOS Keychain Token Storage
 *
 * Stores tokens securely in macOS Keychain.
 */

import keytar from "keytar";
import type { StoredTokens, TokenStorage } from "./token-storage";

const SERVICE_NAME = "testflow-oauth-tokens";

export class DarwinTokenStorage implements TokenStorage {
  async storeTokens(service: string, tokens: StoredTokens): Promise<void> {
    const key = `testflow:${service}`;
    const value = JSON.stringify(tokens);

    try {
      await keytar.setPassword(SERVICE_NAME, key, value);
    } catch (error) {
      throw new Error(`Failed to store tokens in keychain: ${error}`);
    }
  }

  async getTokens(service: string): Promise<StoredTokens | null> {
    const key = `testflow:${service}`;

    try {
      const value = await keytar.getPassword(SERVICE_NAME, key);
      if (!value) {
        return null;
      }

      return JSON.parse(value) as StoredTokens;
    } catch (error) {
      if ((error as Error).message.includes("not found")) {
        return null;
      }
      throw new Error(`Failed to get tokens from keychain: ${error}`);
    }
  }

  async deleteTokens(service: string): Promise<void> {
    const key = `testflow:${service}`;

    try {
      await keytar.deletePassword(SERVICE_NAME, key);
    } catch (error) {
      // Ignore errors if key doesn't exist
      if (!(error as Error).message.includes("not found")) {
        throw new Error(`Failed to delete tokens from keychain: ${error}`);
      }
    }
  }

  async hasTokens(service: string): Promise<boolean> {
    const tokens = await this.getTokens(service);
    return tokens !== null;
  }
}
