/**
 * Check Tokens CLI
 *
 * Checks the status of stored OAuth tokens and API tokens.
 */

import {
  createTokenStorage,
  isTokenExpired,
} from "../integrations/token-storage";

/**
 * Formats a timestamp as a human-readable date
 */
const formatDate = (timestamp?: number): string => {
  if (!timestamp) {
    return "Never";
  }

  const date = new Date(timestamp);
  return date.toLocaleString();
};

/**
 * Checks token status for a service
 */
const checkServiceTokens = async (service: string): Promise<void> => {
  const storage = await createTokenStorage();
  const hasTokens = await storage.hasTokens(service);

  if (!hasTokens) {
    console.log(`  ${service}: ❌ No tokens stored`);
    return;
  }

  const tokens = await storage.getTokens(service);
  if (!tokens) {
    console.log(`  ${service}: ❌ Failed to retrieve tokens`);
    return;
  }

  const expired = isTokenExpired(tokens);
  const status = expired ? "⚠️  Expired" : "✓ Valid";
  const expiresAt = tokens.expiresAt ? formatDate(tokens.expiresAt) : "Unknown";

  console.log(`  ${service}: ${status}`);
  console.log(`    Expires: ${expiresAt}`);
  console.log(`    Has refresh token: ${tokens.refreshToken ? "Yes" : "No"}`);
};

/**
 * Main CLI entry point
 */
const main = async (): Promise<void> => {
  console.log("=== Token Status ===\n");

  try {
    await checkServiceTokens("jira");
    await checkServiceTokens("bitbucket");
    await checkServiceTokens("zephyr");

    console.log(
      "\nTo refresh expired tokens or set up new ones, run: bun run setup-auth"
    );
  } catch (error) {
    console.error("Error checking tokens:", error);
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

export { main as checkTokens };
