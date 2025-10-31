/**
 * OAuth 2.0 Client with PKCE Support
 *
 * Implements OAuth 2.0 Authorization Code Flow with PKCE for Atlassian services
 * (Jira and Bitbucket). Handles authorization, token exchange, and refresh.
 */

import { createHash, randomBytes } from "node:crypto";

export interface OAuthConfig {
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  scopes: string[];
}

export interface TokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType?: string;
  scope?: string;
}

export interface PKCEParams {
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: string;
}

/**
 * Generates PKCE code verifier and challenge
 * @returns PKCE parameters for OAuth flow
 */
export const generatePKCE = (): PKCEParams => {
  // Generate random code verifier (43-128 characters)
  const codeVerifier = randomBytes(32).toString("base64url");

  // Generate code challenge (SHA256 hash of verifier, base64url encoded)
  const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");

  return {
    codeVerifier,
    codeChallenge,
    codeChallengeMethod: "S256",
  };
};

/**
 * Builds the authorization URL with PKCE parameters
 * @param config - OAuth configuration
 * @param pkce - PKCE parameters
 * @param state - Optional state parameter for CSRF protection
 * @returns Authorization URL
 */
export const buildAuthorizationUrl = (
  config: OAuthConfig,
  pkce: PKCEParams,
  state?: string
): string => {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: config.scopes.join(" "),
    code_challenge: pkce.codeChallenge,
    code_challenge_method: pkce.codeChallengeMethod,
  });

  if (state) {
    params.set("state", state);
  }

  return `${config.authorizationEndpoint}?${params.toString()}`;
};

/**
 * Exchanges authorization code for access token
 * @param config - OAuth configuration
 * @param authorizationCode - Authorization code from callback
 * @param pkce - PKCE parameters used during authorization
 * @returns Token response with access and refresh tokens
 */
export const exchangeCodeForTokens = async (
  config: OAuthConfig,
  authorizationCode: string,
  pkce: PKCEParams
): Promise<TokenResponse> => {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: authorizationCode,
    redirect_uri: config.redirectUri,
    code_verifier: pkce.codeVerifier,
  });

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json",
  };

  // Add client credentials to Authorization header if secret is provided
  if (config.clientSecret) {
    const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");
    headers.Authorization = `Basic ${credentials}`;
  } else {
    // Some OAuth providers require client_id in body when no secret
    body.set("client_id", config.clientId);
  }

  const response = await fetch(config.tokenEndpoint, {
    method: "POST",
    headers,
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(
      `Token exchange failed: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    token_type?: string;
    scope?: string;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    tokenType: data.token_type || "Bearer",
    scope: data.scope,
  };
};

/**
 * Refreshes an access token using a refresh token
 * @param config - OAuth configuration
 * @param refreshToken - Refresh token from previous authorization
 * @returns New token response
 */
export const refreshAccessToken = async (
  config: OAuthConfig,
  refreshToken: string
): Promise<TokenResponse> => {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json",
  };

  // Add client credentials to Authorization header if secret is provided
  if (config.clientSecret) {
    const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");
    headers.Authorization = `Basic ${credentials}`;
  } else {
    body.set("client_id", config.clientId);
  }

  const response = await fetch(config.tokenEndpoint, {
    method: "POST",
    headers,
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(
      `Token refresh failed: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    token_type?: string;
    scope?: string;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken, // Use new refresh token if provided, otherwise keep existing
    expiresIn: data.expires_in,
    tokenType: data.token_type || "Bearer",
    scope: data.scope,
  };
};

/**
 * OAuth configurations for Atlassian services
 */
export const ATLASSIAN_OAUTH_CONFIG = {
  authorizationEndpoint: "https://auth.atlassian.com/authorize",
  tokenEndpoint: "https://auth.atlassian.com/oauth/token",
  scopes: [
    "read:jira-work",
    "write:jira-work",
    "read:jira-user",
    "offline_access", // Required for refresh tokens
  ],
};

export const BITBUCKET_OAUTH_CONFIG = {
  authorizationEndpoint: "https://bitbucket.org/site/oauth2/authorize",
  tokenEndpoint: "https://bitbucket.org/site/oauth2/access_token",
  scopes: ["repository", "pullrequest", "issue", "webhook"],
};
