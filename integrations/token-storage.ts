/**
 * Token Storage Abstraction
 *
 * Provides secure token storage with OS keychain support and file fallback.
 * Handles storing and retrieving OAuth tokens securely.
 */

import type { TokenResponse } from "./oauth-client";

export interface StoredTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number; // Unix timestamp
  service: "jira" | "bitbucket" | "zephyr";
}

export interface TokenStorage {
  /**
   * Stores tokens for a service
   */
  storeTokens(service: string, tokens: StoredTokens): Promise<void>;

  /**
   * Retrieves tokens for a service
   */
  getTokens(service: string): Promise<StoredTokens | null>;

  /**
   * Removes tokens for a service
   */
  deleteTokens(service: string): Promise<void>;

  /**
   * Checks if tokens exist for a service
   */
  hasTokens(service: string): Promise<boolean>;
}

/**
 * Creates a token storage instance based on the platform
 */
export const createTokenStorage = async (): Promise<TokenStorage> => {
  const platform = process.platform;

  // Use OS keychain on supported platforms
  if (platform === "darwin") {
    const { DarwinTokenStorage } = await import("./token-storage-darwin");
    return new DarwinTokenStorage();
  }

  if (platform === "win32") {
    const { Win32TokenStorage } = await import("./token-storage-win32");
    return new Win32TokenStorage();
  }

  if (platform === "linux") {
    const { LinuxTokenStorage } = await import("./token-storage-linux");
    return new LinuxTokenStorage();
  }

  // Fallback to file-based storage for other platforms
  const { FileTokenStorage } = await import("./token-storage-file");
  return new FileTokenStorage();
};

/**
 * Converts TokenResponse to StoredTokens
 */
export const toStoredTokens = (
  service: "jira" | "bitbucket" | "zephyr",
  tokenResponse: TokenResponse
): StoredTokens => {
  const expiresAt = tokenResponse.expiresIn
    ? Date.now() + tokenResponse.expiresIn * 1000
    : undefined;

  return {
    accessToken: tokenResponse.accessToken,
    refreshToken: tokenResponse.refreshToken,
    expiresAt,
    service,
  };
};

/**
 * Checks if tokens are expired or will expire soon
 */
export const isTokenExpired = (tokens: StoredTokens, bufferSeconds = 60): boolean => {
  if (!tokens.expiresAt) {
    return false; // No expiration info, assume valid
  }

  // Consider token expired if it expires within bufferSeconds
  return tokens.expiresAt <= Date.now() + bufferSeconds * 1000;
};
