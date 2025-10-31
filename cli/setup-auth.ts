/**
 * Setup Authentication CLI
 *
 * Interactive CLI for setting up OAuth authentication for Jira, Bitbucket, and Zephyr.
 * Opens browsers for OAuth flows and guides users through token setup.
 */

import { randomBytes } from "node:crypto";
import open from "open";
import { startCallbackServer } from "../integrations/oauth-callback-server";
import {
  ATLASSIAN_OAUTH_CONFIG,
  BITBUCKET_OAUTH_CONFIG,
  buildAuthorizationUrl,
  exchangeCodeForTokens,
  generatePKCE,
  type OAuthConfig,
} from "../integrations/oauth-client";
import {
  createTokenStorage,
  toStoredTokens,
} from "../integrations/token-storage";

/**
 * Reads input from stdin
 */
const readInput = (): Promise<string> => {
  return new Promise((resolve) => {
    process.stdin.once("data", (data) => {
      resolve(data.toString().trim());
    });
  });
};

/**
 * Prompts user for input
 */
const prompt = async (message: string): Promise<string> => {
  process.stdout.write(message);
  return readInput();
};

/**
 * Sets up Jira OAuth authentication
 */
const setupJiraAuth = async (): Promise<void> => {
  console.log("\n=== Setting up Jira OAuth ===");

  // Get OAuth client ID from environment or prompt
  let clientId = process.env.JIRA_OAUTH_CLIENT_ID;
  if (!clientId) {
    console.log("\nTo set up Jira OAuth, you need to create an OAuth app:");
    console.log("1. Go to https://developer.atlassian.com/console/myapps/");
    console.log("2. Create a new OAuth 2.0 app");
    console.log("3. Set redirect URI to: http://localhost:3000/callback");
    console.log("4. Copy the Client ID");
    console.log(
      "\nAlternatively, set JIRA_OAUTH_CLIENT_ID in your environment."
    );

    clientId = await prompt(
      "\nEnter Jira OAuth Client ID (or press Enter to skip): "
    );
    if (!clientId) {
      console.log("Skipping Jira OAuth setup.");
      return;
    }
  }

  const clientSecret = process.env.JIRA_OAUTH_CLIENT_SECRET;
  const redirectUri = "http://localhost:3000/callback";

  const config: OAuthConfig = {
    clientId,
    clientSecret,
    redirectUri,
    ...ATLASSIAN_OAUTH_CONFIG,
  };

  try {
    // Generate PKCE parameters
    const pkce = generatePKCE();
    const state = randomBytes(16).toString("hex");

    // Build authorization URL
    const authUrl = buildAuthorizationUrl(config, pkce, state);

    // Start callback server
    console.log("\nStarting callback server...");
    const callbackPromise = startCallbackServer(3000);

    // Open browser
    console.log("Opening browser for Jira authorization...");
    await open(authUrl);
    console.log("\nPlease complete the authorization in your browser.");
    console.log("Waiting for callback...");

    // Wait for callback
    const callback = await callbackPromise;

    if (callback.state && callback.state !== state) {
      throw new Error("State mismatch - possible CSRF attack");
    }

    // Exchange code for tokens
    console.log("Exchanging authorization code for tokens...");
    const tokens = await exchangeCodeForTokens(config, callback.code, pkce);

    // Store tokens
    const storage = await createTokenStorage();
    const storedTokens = toStoredTokens("jira", tokens);
    await storage.storeTokens("jira", storedTokens);

    console.log("✓ Jira OAuth tokens stored successfully!");
  } catch (error) {
    console.error(`✗ Failed to set up Jira OAuth: ${error}`);
    throw error;
  }
};

/**
 * Sets up Bitbucket OAuth authentication
 */
const setupBitbucketAuth = async (): Promise<void> => {
  console.log("\n=== Setting up Bitbucket OAuth ===");

  // Get OAuth client ID from environment or prompt
  let clientId = process.env.BITBUCKET_OAUTH_CLIENT_ID;
  if (!clientId) {
    console.log(
      "\nTo set up Bitbucket OAuth, you need to create an OAuth consumer:"
    );
    console.log("1. Go to your Bitbucket workspace settings");
    console.log("2. Navigate to Access Management → OAuth → Add consumer");
    console.log("3. Set callback URL to: http://localhost:3001/callback");
    console.log("4. Copy the Key (Client ID)");
    console.log(
      "\nAlternatively, set BITBUCKET_OAUTH_CLIENT_ID in your environment."
    );

    clientId = await prompt(
      "\nEnter Bitbucket OAuth Client ID (or press Enter to skip): "
    );
    if (!clientId) {
      console.log("Skipping Bitbucket OAuth setup.");
      return;
    }
  }

  const clientSecret = process.env.BITBUCKET_OAUTH_CLIENT_SECRET;
  const redirectUri = "http://localhost:3001/callback";

  const config: OAuthConfig = {
    clientId,
    clientSecret,
    redirectUri,
    ...BITBUCKET_OAUTH_CONFIG,
  };

  try {
    // Generate PKCE parameters
    const pkce = generatePKCE();
    const state = randomBytes(16).toString("hex");

    // Build authorization URL
    const authUrl = buildAuthorizationUrl(config, pkce, state);

    // Start callback server on different port
    console.log("\nStarting callback server...");
    const callbackPromise = startCallbackServer(3001);

    // Open browser
    console.log("Opening browser for Bitbucket authorization...");
    await open(authUrl);
    console.log("\nPlease complete the authorization in your browser.");
    console.log("Waiting for callback...");

    // Wait for callback
    const callback = await callbackPromise;

    if (callback.state && callback.state !== state) {
      throw new Error("State mismatch - possible CSRF attack");
    }

    // Exchange code for tokens
    console.log("Exchanging authorization code for tokens...");
    const tokens = await exchangeCodeForTokens(config, callback.code, pkce);

    // Store tokens
    const storage = await createTokenStorage();
    const storedTokens = toStoredTokens("bitbucket", tokens);
    await storage.storeTokens("bitbucket", storedTokens);

    console.log("✓ Bitbucket OAuth tokens stored successfully!");
  } catch (error) {
    console.error(`✗ Failed to set up Bitbucket OAuth: ${error}`);
    throw error;
  }
};

/**
 * Sets up Zephyr token (manual entry)
 */
const setupZephyrToken = async (): Promise<void> => {
  console.log("\n=== Setting up Zephyr API Token ===");
  console.log("\nZephyr tokens must be generated manually from the Jira UI:");
  console.log(
    "1. Log in to your Jira instance where Zephyr Scale is installed"
  );
  console.log("2. Click on your profile picture at the bottom left");
  console.log("3. Choose 'Zephyr API keys' from the menu");
  console.log("4. Click 'Generate a Key'");
  console.log("5. Copy the generated token");

  await open(
    "https://support.smartbear.com/zephyr/docs/en/rest-api/api-access-tokens-management.html"
  );

  const token = await prompt(
    "\nEnter your Zephyr API token (or press Enter to skip): "
  );
  if (!token) {
    console.log("Skipping Zephyr token setup.");
    return;
  }

  try {
    const storage = await createTokenStorage();
    const storedTokens = {
      accessToken: token,
      service: "zephyr" as const,
    };
    await storage.storeTokens("zephyr", storedTokens);

    console.log("✓ Zephyr API token stored successfully!");
  } catch (error) {
    console.error(`✗ Failed to store Zephyr token: ${error}`);
    throw error;
  }
};

/**
 * Main CLI entry point
 */
const main = async (): Promise<void> => {
  console.log("=== TestFlow Authentication Setup ===\n");
  console.log("This will guide you through setting up OAuth authentication");
  console.log("for Jira, Bitbucket, and Zephyr.\n");

  try {
    // Setup Jira
    const setupJira = await prompt("Set up Jira OAuth? (y/n): ");
    if (setupJira.toLowerCase() === "y" || setupJira.toLowerCase() === "yes") {
      await setupJiraAuth();
    }

    // Setup Bitbucket
    const setupBitbucket = await prompt("\nSet up Bitbucket OAuth? (y/n): ");
    if (
      setupBitbucket.toLowerCase() === "y" ||
      setupBitbucket.toLowerCase() === "yes"
    ) {
      await setupBitbucketAuth();
    }

    // Setup Zephyr
    const setupZephyr = await prompt("\nSet up Zephyr API token? (y/n): ");
    if (
      setupZephyr.toLowerCase() === "y" ||
      setupZephyr.toLowerCase() === "yes"
    ) {
      await setupZephyrToken();
    }

    console.log("\n✓ Authentication setup complete!");
    console.log("\nYou can check your token status with: bun run check-tokens");
  } catch (error) {
    console.error("\n✗ Setup failed:", error);
    process.exit(1);
  }
};

// Run CLI if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

export { main as setupAuth };
