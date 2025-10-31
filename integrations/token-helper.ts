/**
 * Token Helper
 *
 * Helper functions for retrieving and refreshing OAuth tokens.
 */

import {
  ATLASSIAN_OAUTH_CONFIG,
  BITBUCKET_OAUTH_CONFIG,
  type OAuthConfig,
  refreshAccessToken,
} from "./oauth-client";
import {
  createTokenStorage,
  isTokenExpired,
  type StoredTokens,
} from "./token-storage";

/**
 * Gets a valid access token for a service, refreshing if necessary
 */
export const getValidAccessToken = async (
  service: "jira" | "bitbucket"
): Promise<string | null> => {
  const storage = await createTokenStorage();
  const tokens = await storage.getTokens(service);

  if (!tokens) {
    return null;
  }

  // Check if token needs refresh
  if (isTokenExpired(tokens) && tokens.refreshToken) {
    try {
      // Refresh token
      const clientId = process.env[`${service.toUpperCase()}_OAUTH_CLIENT_ID`];
      const clientSecret =
        process.env[`${service.toUpperCase()}_OAUTH_CLIENT_SECRET`];

      if (!clientId) {
        console.warn(
          `No OAuth client ID configured for ${service}, cannot refresh token`
        );
        return tokens.accessToken; // Return expired token, may fail on API call
      }

      const config: OAuthConfig = {
        clientId,
        clientSecret,
        redirectUri: `http://localhost:${
          service === "jira" ? "3000" : "3001"
        }/callback`,
        ...(service === "jira"
          ? ATLASSIAN_OAUTH_CONFIG
          : BITBUCKET_OAUTH_CONFIG),
      };

      const newTokens = await refreshAccessToken(config, tokens.refreshToken);

      // Update stored tokens
      const updatedTokens: StoredTokens = {
        ...tokens,
        accessToken: newTokens.accessToken,
        refreshToken: newTokens.refreshToken || tokens.refreshToken,
        expiresAt: newTokens.expiresIn
          ? Date.now() + newTokens.expiresIn * 1000
          : tokens.expiresAt,
      };

      await storage.storeTokens(service, updatedTokens);

      return updatedTokens.accessToken;
    } catch (error) {
      console.warn(`Failed to refresh ${service} token: ${error}`);
      // Return existing token, may fail on API call
      return tokens.accessToken;
    }
  }

  return tokens.accessToken;
};

/**
 * Gets stored Zephyr token
 */
export const getZephyrToken = async (): Promise<string | null> => {
  const storage = await createTokenStorage();
  const tokens = await storage.getTokens("zephyr");
  return tokens?.accessToken || null;
};
