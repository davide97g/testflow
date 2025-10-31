#!/usr/bin/env bun

/**
 * CLI script to test API integrations
 * Usage:
 *   bun cli/test-integrations.ts [bitbucket|jira|zephyr|all]
 */

import {
  testAllIntegrations,
  testBitbucketIntegration,
  testJiraIntegration,
  testZephyrIntegration,
} from "../integrations/test-api-integrations";

const command = process.argv[2] || "all";

const formatResult = (result: Awaited<ReturnType<typeof testBitbucketIntegration>>): void => {
  if (result.success) {
    console.log(`✅ ${result.message}`);
    if (result.details) {
      console.log("   Details:", JSON.stringify(result.details, null, 2));
    }
  } else {
    console.error(`❌ ${result.message}`);
    if (result.details) {
      console.error("   Error details:", JSON.stringify(result.details, null, 2));
    }
  }
};

const main = async (): Promise<void> => {
  switch (command.toLowerCase()) {
    case "bitbucket": {
      console.log("Testing Bitbucket API integration...\n");
      const result = await testBitbucketIntegration();
      formatResult(result);
      process.exit(result.success ? 0 : 1);
      break;
    }
    case "jira": {
      console.log("Testing Jira API integration...\n");
      const result = await testJiraIntegration();
      formatResult(result);
      process.exit(result.success ? 0 : 1);
      break;
    }
    case "zephyr": {
      console.log("Testing Zephyr API integration...\n");
      const result = await testZephyrIntegration();
      formatResult(result);
      process.exit(result.success ? 0 : 1);
      break;
    }
    case "all": {
      console.log("Testing all API integrations...\n");
      const results = await testAllIntegrations();

      console.log("\n=== Bitbucket ===");
      formatResult(results.bitbucket);

      console.log("\n=== Jira ===");
      formatResult(results.jira);

      console.log("\n=== Zephyr ===");
      formatResult(results.zephyr);

      const allSuccess =
        results.bitbucket.success && results.jira.success && results.zephyr.success;

      process.exit(allSuccess ? 0 : 1);
      break;
    }
    default: {
      console.error(`Unknown command: ${command}`);
      console.log("\nUsage: bun cli/test-integrations.ts [bitbucket|jira|zephyr|all]");
      process.exit(1);
    }
  }
};

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
