/**
 * Fetch Tests CLI
 *
 * Pulls linked Zephyr tests for a given Jira ticket or PR.
 * Fetches test cases associated with the specified issue.
 */

import {
  type BitbucketConfig,
  initialize as initializeBitbucket,
} from "../integrations/bitbucket-client";
import { initialize as initializeJira, type JiraConfig } from "../integrations/jira-client";
import {
  initialize as initializeZephyr,
  type ZephyrConfig,
  type TestCase as ZephyrTestCase,
} from "../integrations/zephyr-client";

export interface TestCase {
  id: string;
  key?: string;
  name: string;
  [key: string]: unknown;
}

/**
 * Fetches Zephyr test cases linked to a Jira ticket
 * @param jiraTicketKey - Jira ticket key (e.g., "PROJ-123")
 * @returns Promise resolving to array of linked Zephyr test cases
 */
export const fetchTestsForJiraTicket = async (jiraTicketKey: string): Promise<TestCase[]> => {
  // Initialize Jira client
  const jiraConfig: JiraConfig = {
    apiToken: process.env.JIRA_API_TOKEN || "",
    baseUrl: process.env.JIRA_BASE_URL || "",
    email: process.env.JIRA_EMAIL,
  };

  if (!jiraConfig.baseUrl) {
    throw new Error("JIRA_BASE_URL environment variable is required");
  }

  const jiraClient = initializeJira(jiraConfig);

  // Get linked test cases from Jira
  const testCaseReferences = await jiraClient.getLinkedTestCases(jiraTicketKey);

  if (testCaseReferences.length === 0) {
    return [];
  }

  // Initialize Zephyr client
  const zephyrConfig: ZephyrConfig = {
    apiToken: process.env.ZEPHYR_API_TOKEN || "",
    baseUrl: process.env.ZEPHYR_BASE_URL,
  };

  const zephyrClient = initializeZephyr(zephyrConfig);

  // Filter test case references that look like Zephyr test cases
  // Zephyr test cases typically have keys like PROJECT-T123
  const zephyrTestKeys = testCaseReferences
    .filter((ref): ref is { id: string; key: string; [key: string]: unknown } => {
      // Check if key matches Zephyr test case pattern (PROJECT-T123)
      if (!ref.key) {
        return false;
      }
      return /^[A-Z][A-Z_0-9]+-T\d+$/.test(ref.key);
    })
    .map((ref) => ref.key);

  if (zephyrTestKeys.length === 0) {
    return [];
  }

  // Fetch test case details from Zephyr
  const zephyrTestCases = await zephyrClient.getTestCases(zephyrTestKeys);

  // Map Zephyr test cases to our TestCase interface
  const testCases: TestCase[] = zephyrTestCases.map((testCase: ZephyrTestCase) => ({
    ...testCase,
    id: String(testCase.id),
    key: testCase.key,
    name: testCase.name,
  }));

  return testCases;
};

/**
 * Fetches Zephyr test cases for a Bitbucket PR
 * @param workspace - Bitbucket workspace name
 * @param repoSlug - Repository slug
 * @param prId - Pull request ID
 * @returns Promise resolving to array of related Zephyr test cases
 */
export const fetchTestsForPR = async (
  workspace: string,
  repoSlug: string,
  prId: string
): Promise<TestCase[]> => {
  // Initialize Bitbucket client
  const bitbucketConfig: BitbucketConfig = {
    apiToken: process.env.BITBUCKET_API_TOKEN || "",
    baseUrl: process.env.BITBUCKET_BASE_URL,
    email: process.env.BITBUCKET_EMAIL,
  };

  if (!bitbucketConfig.apiToken) {
    throw new Error("BITBUCKET_API_TOKEN environment variable is required");
  }

  const bitbucketClient = initializeBitbucket(bitbucketConfig);

  // Get PR details
  const pullRequest = await bitbucketClient.getPullRequest(workspace, repoSlug, prId);

  // Extract linked Jira tickets from PR description/comments
  const jiraTicketKeys = bitbucketClient.extractJiraTickets(pullRequest);

  if (jiraTicketKeys.length === 0) {
    return [];
  }

  // Fetch Zephyr tests for each linked ticket
  const allTestCases: TestCase[] = [];
  const seenTestKeys = new Set<string>();

  for (const ticketKey of jiraTicketKeys) {
    try {
      const testCases = await fetchTestsForJiraTicket(ticketKey);
      for (const testCase of testCases) {
        // Avoid duplicates based on test case key
        const testKey = testCase.key || testCase.id;
        if (!seenTestKeys.has(testKey)) {
          seenTestKeys.add(testKey);
          allTestCases.push(testCase);
        }
      }
    } catch (error) {
      console.warn(`Failed to fetch tests for Jira ticket ${ticketKey}:`, error);
      // Continue with other tickets
    }
  }

  return allTestCases;
};

/**
 * Main CLI entry point for fetching tests
 */
const main = async (): Promise<void> => {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("Usage:");
    console.error("  bun cli/fetch-tests.ts <jira-ticket-key>");
    console.error("  bun cli/fetch-tests.ts --pr <workspace> <repo-slug> <pr-id>");
    console.error("");
    console.error("Examples:");
    console.error("  bun cli/fetch-tests.ts PROJ-123");
    console.error("  bun cli/fetch-tests.ts --pr myworkspace myrepo 42");
    process.exit(1);
  }

  let testCases: TestCase[];

  if (args[0] === "--pr" || args[0] === "-p") {
    // Fetch by PR
    if (args.length < 4) {
      console.error("Error: --pr requires workspace, repo-slug, and pr-id");
      console.error("Usage: bun cli/fetch-tests.ts --pr <workspace> <repo-slug> <pr-id>");
      process.exit(1);
    }

    const [, workspace, repoSlug, prId] = args;
    testCases = await fetchTestsForPR(workspace, repoSlug, prId);
  } else {
    // Fetch by Jira ticket
    const jiraTicketKey = args[0];
    testCases = await fetchTestsForJiraTicket(jiraTicketKey);
  }

  // Output results in JSON format
  const jsonOutput = JSON.stringify(testCases, null, 2);
  console.log(jsonOutput);
};

// Run CLI if executed directly
if (require.main === module) {
  main().catch(console.error);
}
